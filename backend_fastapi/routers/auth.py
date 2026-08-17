from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, status
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
import datetime
import json
import secrets
import urllib.parse
import os

from services.database import get_db_connection
from services.auth_service import hash_password, verify_password, create_access_token, get_current_user
from services.email_service import send_email_via_smtp, get_email_template

router = APIRouter(prefix="/api/auth", tags=["auth"])

OTP_EXPIRY_MINUTES = 10

class SendOTPRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = "User"

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[str] = "user"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UpdatePreferencesRequest(BaseModel):
    prefs: dict

@router.post("/signup")
def signup(payload: SignupRequest):
    """
    Register a new user in SQLite and return JWT token.
    """
    conn = get_db_connection()
    existing_user = conn.execute("SELECT * FROM users WHERE email = ?", (payload.email.lower(),)).fetchone()
    if existing_user:
        conn.close()
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(payload.password)
    now_iso = datetime.datetime.utcnow().isoformat()
    default_prefs = json.dumps({"notifications": True, "theme": "system"})
    user_role = payload.role if payload.role in ["user", "admin"] else "user"

    conn.execute("""
        INSERT INTO users (id, email, password_hash, name, role, prefs, created_at, last_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, payload.email.lower(), hashed_pwd, payload.name, user_role, default_prefs, now_iso, now_iso))
    conn.commit()

    user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()

    token = create_access_token({"sub": user_id, "email": payload.email.lower(), "role": user_role})
    
    user_dict = dict(user_row)
    user_dict.pop("password_hash", None)
    user_dict["prefs"] = json.loads(user_dict.get("prefs", "{}"))

    return {
        "success": True,
        "token": token,
        "user": user_dict
    }

@router.post("/login")
def login(payload: LoginRequest):
    """
    Authenticate user via email and password, returning JWT token.
    """
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (payload.email.lower(),)).fetchone()
    
    if not user or not verify_password(payload.password, user["password_hash"]):
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Update last_active timestamp
    now_iso = datetime.datetime.utcnow().isoformat()
    conn.execute("UPDATE users SET last_active = ? WHERE id = ?", (now_iso, user["id"]))
    conn.commit()
    conn.close()

    token = create_access_token({"sub": user["id"], "email": user["email"], "role": user["role"]})
    
    user_dict = dict(user)
    user_dict.pop("password_hash", None)
    user_dict["prefs"] = json.loads(user_dict.get("prefs", "{}"))

    return {
        "success": True,
        "token": token,
        "user": user_dict
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current logged-in user profile from DB.
    """
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (current_user["id"],)).fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_dict = dict(user)
    user_dict.pop("password_hash", None)
    if isinstance(user_dict.get("prefs"), str):
        user_dict["prefs"] = json.loads(user_dict["prefs"])
        
    return {"success": True, "user": user_dict}

@router.put("/preferences")
def update_preferences(payload: UpdatePreferencesRequest, current_user: dict = Depends(get_current_user)):
    """
    Update user preferences.
    """
    conn = get_db_connection()
    prefs_str = json.dumps(payload.prefs)
    conn.execute("UPDATE users SET prefs = ? WHERE id = ?", (prefs_str, current_user["id"]))
    conn.commit()
    conn.close()

    return {"success": True, "message": "Preferences updated successfully"}

class UpdateProfileRequest(BaseModel):
    name: str

@router.put("/profile")
def update_profile(payload: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    """
    Update user profile info (e.g. name).
    """
    conn = get_db_connection()
    conn.execute("UPDATE users SET name = ? WHERE id = ?", (payload.name, current_user["id"]))
    conn.commit()
    conn.close()

    return {"success": True, "message": "Profile updated successfully"}

@router.post("/send-otp")
def send_otp(payload: SendOTPRequest, background_tasks: BackgroundTasks):
    """
    Generate an OTP, store it in SQLite, and email it to the user.
    """
    email = payload.email.lower()
    name = payload.name
    otp = str(secrets.SystemRandom().randint(100000, 999999))
    expires_at = (datetime.datetime.utcnow() + datetime.timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat()
    doc_id = str(uuid.uuid4())
    now_iso = datetime.datetime.utcnow().isoformat()

    conn = get_db_connection()
    conn.execute("""
        INSERT INTO otp_verifications (id, email, otp, expires_at, is_used, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
    """, (doc_id, email, otp, expires_at, now_iso))
    conn.commit()
    conn.close()

    # Email notification
    subject = f"Your Login Code: {otp}"
    content = f"Hello {name},\n\nYour verification code is: {otp}\n\nThis code will expire in {OTP_EXPIRY_MINUTES} minutes."
    params = {"email": email, "otp": otp, "name": name}
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    link = f"{frontend_url}/signup?{urllib.parse.urlencode(params)}"
    html_content = get_email_template(name, otp, link)

    background_tasks.add_task(send_email_via_smtp, email, subject, content, html_content)

    return {"success": True, "message": "OTP sent successfully"}

@router.post("/verify-otp")
def verify_otp(payload: VerifyOTPRequest):
    """
    Verify the provided OTP from SQLite.
    """
    email = payload.email.lower()
    otp = payload.otp

    conn = get_db_connection()
    otp_record = conn.execute("""
        SELECT * FROM otp_verifications 
        WHERE email = ? AND otp = ? AND is_used = 0 
        ORDER BY created_at DESC LIMIT 1
    """, (email, otp)).fetchone()

    if not otp_record:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Expiry Check
    expires_at = datetime.datetime.fromisoformat(otp_record["expires_at"])
    if datetime.datetime.utcnow() > expires_at:
        conn.close()
        raise HTTPException(status_code=400, detail="Verification code has expired")

    # Mark as used
    conn.execute("UPDATE otp_verifications SET is_used = 1 WHERE id = ?", (otp_record["id"],))
    
    # Check if user exists
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": "OTP verified successfully",
        "userExists": user is not None,
        "userId": user["id"] if user else None
    }

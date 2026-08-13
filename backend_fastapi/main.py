from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import ingest, chat, speech, translate_v2 as translate, reports, admin, notifications, hospitals, auth, outbreaks, alerts
import os
import uuid
import datetime
import json
from services.database import get_db_connection
from services.auth_service import hash_password

app = FastAPI(title="Data-Aware RAG System API")

# CORS Configuration
origins = [
    "http://localhost:3000",  # Next.js frontend
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(ingest.router, prefix="/api/ingest", tags=["Ingestion"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(speech.router, prefix="/api/speech", tags=["Speech"])
app.include_router(translate.router, prefix="/api/translate", tags=["Translation"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(hospitals.router, prefix="/api/hospitals", tags=["Hospitals"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(outbreaks.router, prefix="/api/outbreaks", tags=["Outbreaks"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(auth.router) # Prefix is handled in auth.py
app.include_router(admin.router) # Prefix is handled in admin.py


@app.get("/")
async def root():
    return {"message": "Data-Aware RAG System API is running"}

def get_ngrok_url():
    """
    Check local ngrok API to find public URL.
    """
    try:
        import requests
        # ngrok's local API
        response = requests.get("http://127.0.0.1:4040/api/tunnels", timeout=1)
        if response.status_code == 200:
            data = response.json()
            tunnels = data.get("tunnels", [])
            for tunnel in tunnels:
                # Find tunnel pointing to our port
                if tunnel.get("config", {}).get("addr", "").endswith("8001"):
                    return tunnel.get("public_url")
    except:
        pass
    return None

@app.on_event("startup")
async def startup_event():
    print("\n" + "="*50)
    print(f"🚀 API Running on: http://127.0.0.1:8001")
    
    # Try to find ngrok URL
    public_url = get_ngrok_url()
    if public_url:
        print(f"🌍 Public Access:  {public_url}")
        print(f"🔗 Swagger UI:     {public_url}/docs")
    else:
        print("🌍 Public Access:  Not detected (Ngrok not running?)")
    
    # Check and create Super Admin
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL")
    super_admin_password = os.getenv("SUPER_ADMIN_PASSWORD")
    if super_admin_email and super_admin_password:
        conn = get_db_connection()
        existing_admin = conn.execute("SELECT * FROM users WHERE email = ?", (super_admin_email.lower(),)).fetchone()
        if not existing_admin:
            print(f"🛡️  Creating default Super Admin: {super_admin_email}")
            user_id = str(uuid.uuid4())
            hashed_pwd = hash_password(super_admin_password)
            now_iso = datetime.datetime.utcnow().isoformat()
            default_prefs = json.dumps({"notifications": True, "theme": "system"})
            
            conn.execute("""
                INSERT INTO users (id, email, password_hash, name, role, prefs, created_at, last_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, super_admin_email.lower(), hashed_pwd, "Super Admin", "admin", default_prefs, now_iso, now_iso))
            conn.commit()
        conn.close()

    print("="*50 + "\n")

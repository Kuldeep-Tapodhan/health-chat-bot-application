from fastapi import APIRouter, Query, HTTPException, Body
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from services.database import get_db_connection
import sqlite3
from datetime import datetime

router = APIRouter()

class AlertSubscription(BaseModel):
    userId: str
    states: List[str] = []
    threshold: int = 10
    email: Optional[str] = None
    enabled: bool = True

@router.get("/")
def get_alerts(userId: str = Query(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM alert_subscriptions WHERE user_id = ? ORDER BY created_at DESC", (userId,))
        rows = cursor.fetchall()
        
        subscriptions = []
        for row in rows:
            sub = dict(row)
            # Parse states from string to list
            if sub["states"]:
                # Simple parsing assuming format like ["State 1", "State 2"]
                # For safety, let's just evaluate it or replace
                states_str = sub["states"].replace('[', '').replace(']', '').replace("'", "").replace('"', "")
                sub["states"] = [s.strip() for s in states_str.split(',')] if states_str else []
            else:
                sub["states"] = []
                
            # SQLite stores boolean as 1/0
            sub["enabled"] = bool(sub["enabled"])
            subscriptions.append(sub)
            
        return {"subscriptions": subscriptions}
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return {"subscriptions": [], "needsSetup": True}
    finally:
        conn.close()

@router.post("/")
def save_alert(subscription: AlertSubscription = Body(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        now = datetime.now().isoformat()
        states_str = str(subscription.states)
        
        # Upsert
        cursor.execute("SELECT id FROM alert_subscriptions WHERE user_id = ?", (subscription.userId,))
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute("""
                UPDATE alert_subscriptions
                SET states = ?, threshold = ?, email = ?, enabled = ?, updated_at = ?
                WHERE user_id = ?
            """, (states_str, subscription.threshold, subscription.email, 1 if subscription.enabled else 0, now, subscription.userId))
        else:
            cursor.execute("""
                INSERT INTO alert_subscriptions (user_id, states, threshold, email, enabled, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (subscription.userId, states_str, subscription.threshold, subscription.email, 1 if subscription.enabled else 0, now, now))
            
        conn.commit()
        
        cursor.execute("SELECT * FROM alert_subscriptions WHERE user_id = ?", (subscription.userId,))
        result = dict(cursor.fetchone())
        result["enabled"] = bool(result["enabled"])
        
        return {"success": True, "subscription": result}
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save subscription")
    finally:
        conn.close()

@router.delete("/")
def delete_alert(userId: str = Query(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM alert_subscriptions WHERE user_id = ?", (userId,))
        conn.commit()
        return {"success": True}
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete subscription")
    finally:
        conn.close()

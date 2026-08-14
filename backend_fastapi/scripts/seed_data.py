import os
import sys
import uuid
import json
import random
from datetime import datetime, timedelta

# Add parent directory to path to import services
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from services.database import get_db_connection

def seed_searches(conn):
    print("Seeding search logs into database...")
    cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata']
    queries = ['Cardiologist', 'Dermatologist', 'Pediatrician', 'Flu', 'Fever', 'Emergency']
    
    lat_min, lat_max = 19.0, 19.2
    lng_min, lng_max = 72.8, 73.0

    for _ in range(20):
        log_id = str(uuid.uuid4())
        query = random.choice(queries)
        city = random.choice(cities)
        lat = random.uniform(lat_min, lat_max)
        lng = random.uniform(lng_min, lng_max)
        user_id = 'seed_user'
        timestamp = (datetime.now() - timedelta(hours=random.randint(0, 48))).isoformat()
        
        conn.execute("""
            INSERT INTO search_logs (id, query, city, lat, lng, user_id, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (log_id, query, city, lat, lng, user_id, timestamp))
    
    conn.commit()
    print("✅ Search logs seeded.")

def seed_chats(conn):
    print("Seeding AI chats into database...")
    users = ['user_1', 'user_2', 'user_3']
    sample_conversations = [
        [
            {"role": "user", "content": "I have a headache and fever."},
            {"role": "assistant", "content": "I recommend resting, staying hydrated, and monitoring your temperature."}
        ],
        [
            {"role": "user", "content": "Where is the nearest hospital?"},
            {"role": "assistant", "content": "You can find nearby medical facilities on the Hospital Finder page."}
        ],
        [
            {"role": "user", "content": "What are common flu symptoms?"},
            {"role": "assistant", "content": "Common symptoms include fever, chills, muscle aches, cough, and fatigue."}
        ]
    ]

    for i in range(10):
        chat_id = str(uuid.uuid4())
        user_id = random.choice(users)
        title = f"Health Consultation {i+1}"
        msgs = json.dumps(random.choice(sample_conversations))
        created_at = (datetime.now() - timedelta(days=random.randint(0, 7))).isoformat()

        conn.execute("""
            INSERT INTO ai_chats (id, user_id, title, messages, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (chat_id, user_id, title, msgs, created_at))
    
    conn.commit()
    print("✅ AI chats seeded.")

def seed_reports(conn):
    print("Seeding reports into database...")
    users = ['user_1', 'user_2', 'seed_user']

    for i in range(5):
        report_id = str(uuid.uuid4())
        user_id = random.choice(users)
        title = f"Medical Report Summary #{i+1}"
        analysis = "Sample AI analysis: Patient parameters are within normal ranges. Follow up in 6 months."
        timestamp = (datetime.now() - timedelta(days=random.randint(0, 3))).isoformat()

        conn.execute("""
            INSERT INTO reports (id, user_id, title, analysis, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (report_id, user_id, title, analysis, timestamp))
    
    conn.commit()
    print("✅ Reports seeded.")

if __name__ == "__main__":
    conn = get_db_connection()
    try:
        seed_searches(conn)
        seed_chats(conn)
        seed_reports(conn)
        print("\n🎉 PostgreSQL / Database Seeding complete.")
    finally:
        conn.close()

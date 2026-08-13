import os
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID
import random
from datetime import datetime, timedelta

# Config (Updated from admin.py and .env)
PROJECT_ID = '69370a87002fd794bb2c'
API_KEY = os.getenv('APPWRITE_API_KEY')
DATABASE_ID = '693718fa0035792b67ac'
ENDPOINT = 'https://nyc.cloud.appwrite.io/v1'

SEARCH_LOGS_COLLECTION = 'search_logs'
CHATS_COLLECTION = 'ai_chats'
REPORTS_COLLECTION = 'reports'

if not API_KEY:
    print("Error: APPWRITE_API_KEY environment variable not set.")
    exit(1)

client = Client()
client.set_endpoint(ENDPOINT)
client.set_project(PROJECT_ID)
client.set_key(API_KEY)

databases = Databases(client)

def seed_searches():
    print("Seeding searches...")
    cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata']
    queries = ['Cardiologist', 'Dermatologist', 'Pediatrician', 'Flu', 'Fever', 'Emergency']
    
    # Mumbai Lat/Lng bounds
    lat_min, lat_max = 19.0, 19.2
    lng_min, lng_max = 72.8, 73.0

    for _ in range(20):
        try:
            # Note: create_document is deprecated in newer SDKs but let's try strict keyword args or fallback
            # If create_document fails, check SDK version. But usually it works.
            databases.create_document(
                database_id=DATABASE_ID,
                collection_id=SEARCH_LOGS_COLLECTION,
                document_id=ID.unique(),
                data={
                    'query': random.choice(queries),
                    'city': random.choice(cities),
                    'user_id': 'seed_user',
                    'timestamp': (datetime.now() - timedelta(hours=random.randint(0, 48))).isoformat(),
                    'lat': random.uniform(lat_min, lat_max),
                    'lng': random.uniform(lng_min, lng_max)
                }
            )
        except Exception as e:
            print(f"Failed to search log: {e}")

def seed_chats():
    print("Seeding chats...")
    users = ['user_1', 'user_2', 'user_3']
    messages = [
        "I have a headache and fever.",
        "Where is the nearest hospital?",
        "Thank you for your help!",
        "What are symptoms of covid?",
        "I need a cardiologist."
    ]
    
    for i in range(15):
        try:
            databases.create_document(
                database_id=DATABASE_ID,
                collection_id=CHATS_COLLECTION,
                document_id=ID.unique(),
                data={
                    'user_id': random.choice(users),
                    'message': random.choice(messages),
                    'sender': 'user',
                    'timestamp': (datetime.now() - timedelta(days=random.randint(0, 7))).isoformat(),
                    'session_id': f'session_{random.randint(1, 5)}'
                }
            )
        except Exception as e:
            print(f"Failed to create chat: {e}")

def seed_reports():
    print("Seeding reports...")
    for i in range(5):
        try:
            databases.create_document(
                database_id=DATABASE_ID,
                collection_id=REPORTS_COLLECTION,
                document_id=ID.unique(),
                data={
                    'user_id': 'seed_user',
                    'report_data': ' Sample report data...',
                    'analysis': 'Sample analysis...',
                    'timestamp': (datetime.now() - timedelta(days=random.randint(0, 3))).isoformat(),
                    'status': 'resolved'
                }
            )
        except Exception as e:
            print(f"Failed to create report: {e}")

if __name__ == "__main__":
    seed_searches()
    seed_chats()
    seed_reports()
    print("Seeding complete.")

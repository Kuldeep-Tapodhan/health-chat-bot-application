import os
from appwrite.client import Client
from appwrite.services.users import Users
from appwrite.services.databases import Databases

# Initialize Appwrite Client
client = Client()

APPWRITE_PROJECT_ID = os.getenv("NEXT_PUBLIC_APPWRITE_PROJECT_ID", "69370a87002fd794bb2c")
APPWRITE_API_KEY = os.getenv("APPWRITE_API_KEY")
APPWRITE_ENDPOINT = os.getenv("NEXT_PUBLIC_APPWRITE_ENDPOINT", "https://nyc.cloud.appwrite.io/v1")

if not APPWRITE_API_KEY:
    print("WARNING: APPWRITE_API_KEY is not set. Appwrite operations will fail.")

client.set_endpoint(APPWRITE_ENDPOINT)
client.set_project(APPWRITE_PROJECT_ID)
client.set_key(APPWRITE_API_KEY)

# Initialize Services
users_service = Users(client)
databases = Databases(client)

# DB Constants
CHAT_DB_ID = os.getenv("NEXT_PUBLIC_APPWRITE_DATABASE_ID", "693718fa0035792b67ac")
CHAT_COLLECTION_ID = 'ai_chats'
REGIONAL_CHAT_COLLECTION_ID = 'regional_chats_'
REPORT_DB_ID = os.getenv("NEXT_PUBLIC_APPWRITE_DATABASE_ID", "693718fa0035792b67ac")
REPORT_COLLECTION_ID = os.getenv("NEXT_PUBLIC_APPWRITE_COLLECTION_ID", "reports")
OTP_COLLECTION_ID = os.getenv("APPWRITE_OTP_COLLECTION_ID", "otp_verifications")

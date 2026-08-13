import sys
import os
from dotenv import load_dotenv

# Load env from backend_fastapi/.env
# Script is in backend_fastapi/scripts/
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

# Add parent directory to path to import services
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from services.appwrite_client import client, databases, CHAT_DB_ID, OTP_COLLECTION_ID
from appwrite.services.databases import Databases

# Attributes to create
# Format: (key, type, size, required)
ATTRIBUTES = [
    ("email", "string", 255, True),
    ("otp", "string", 10, True),
    ("expiresAt", "string", 50, True),
    ("isUsed", "boolean", 0, True) # Size 0 for boolean usually ignored
]

def setup_otp_collection():
    print(f"Checking configuration for OTP Collection: {OTP_COLLECTION_ID} in DB: {CHAT_DB_ID}")
    
    try:
        # 1. Check if collection exists
        try:
            databases.get_collection(CHAT_DB_ID, OTP_COLLECTION_ID)
            print("Collection already exists.")
        except Exception:
            print("Collection does not exist. Creating...")
            databases.create_collection(CHAT_DB_ID, OTP_COLLECTION_ID, "OTP Verifications")
            print("Collection created.")

        # 2. Check/Create Attributes
        # Appwrite create_attribute methods are async in backend but the SDK call returns immediately
        # We'll try to create them, catching errors if they exist
        
        print("Configuring attributes...")
        
        try:
            databases.create_string_attribute(CHAT_DB_ID, OTP_COLLECTION_ID, "email", 255, True)
            print("Attribute 'email' created.")
        except Exception as e:
            if "already exists" in str(e):
                print("Attribute 'email' already exists.")
            else:
                print(f"Error creating 'email': {e}")
                
        try:
            databases.create_string_attribute(CHAT_DB_ID, OTP_COLLECTION_ID, "otp", 10, True)
            print("Attribute 'otp' created.")
        except Exception as e:
            if "already exists" in str(e):
                print("Attribute 'otp' already exists.")
            else:
                print(f"Error creating 'otp': {e}")
                
        try:
            databases.create_string_attribute(CHAT_DB_ID, OTP_COLLECTION_ID, "expiresAt", 64, True)
            print("Attribute 'expiresAt' created.")
        except Exception as e:
            if "already exists" in str(e):
                print("Attribute 'expiresAt' already exists.")
            else:
                print(f"Error creating 'expiresAt': {e}")
                
        try:
            databases.create_boolean_attribute(CHAT_DB_ID, OTP_COLLECTION_ID, "isUsed", True)
            print("Attribute 'isUsed' created.")
        except Exception as e:
            if "already exists" in str(e):
                print("Attribute 'isUsed' already exists.")
            else:
                print(f"Error creating 'isUsed': {e}")

        # 3. Create Index (Optional but good for query performance)
        print("Configuring indexes...")
        try:
            # Type: key, unique: false, attributes: [email, otp]
            # Key "idx_email_otp"
            databases.create_index(CHAT_DB_ID, OTP_COLLECTION_ID, "idx_email_otp", "key", ["email", "otp"], ["ASC", "ASC"])
            print("Index 'idx_email_otp' created.")
        except Exception as e:
            if "already exists" in str(e):
                print("Index 'idx_email_otp' already exists.")
            else:
                print(f"Error creating index: {e}")
                
        print("\nSetup Complete! Note: Attribute creation is asynchronous in Appwrite.")
        print("It may take a minute before the collection is fully ready for writes.")
        
    except Exception as e:
        print(f"Critical Error during setup: {e}")

if __name__ == "__main__":
    setup_otp_collection()

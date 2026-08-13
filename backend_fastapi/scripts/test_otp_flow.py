import sys
import os
from dotenv import load_dotenv

# Load env variables
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

sys.path.append(backend_dir)

from services.appwrite_client import databases, CHAT_DB_ID, OTP_COLLECTION_ID
from appwrite.id import ID
from appwrite.query import Query
import datetime
import random

def test_otp_flow():
    print("--- Starting OTP Diagnostics ---")
    
    # 1. Test Variables
    test_email = "test_diagnostic@example.com"
    otp = str(random.randint(100000, 999999))
    expires_at = (datetime.datetime.utcnow() + datetime.timedelta(minutes=10)).isoformat()
    
    print(f"Test Email: {test_email}")
    print(f"Generated OTP: {otp}")
    
    # 2. Test Write (Send OTP Logic)
    print("\n[Step 1] Attempting to Write OTP to Appwrite...")
    try:
        doc = databases.create_document(
            database_id=CHAT_DB_ID,
            collection_id=OTP_COLLECTION_ID,
            document_id=ID.unique(),
            data={
                "email": test_email,
                "otp": otp,
                "expiresAt": expires_at,
                "isUsed": False
            }
        )
        print("SUCCESS: OTP document created.")
        print(f"Doc ID: {doc['$id']}")
    except Exception as e:
        print(f"FAILURE: Could not write to Appwrite. Error: {e}")
        return

    # 3. Test Read/Verify (Verify OTP Logic)
    print("\n[Step 2] Attempting to Read/Verify OTP from Appwrite...")
    try:
        queries = [
            Query.equal("email", test_email),
            Query.equal("otp", otp),
            Query.equal("isUsed", False),
            Query.order_desc("$createdAt"),
            Query.limit(1)
        ]
        
        result = databases.list_documents(
            database_id=CHAT_DB_ID,
            collection_id=OTP_COLLECTION_ID,
            queries=queries
        )
        
        if result['total'] > 0:
            print("SUCCESS: Found OTP document via Query.")
            found_doc = result['documents'][0]
            if found_doc['otp'] == otp:
                 print("MATCH: OTP matches.")
            else:
                 print("MISMATCH: OTP does not match (Unexpected).")
        else:
            print("FAILURE: Query returned 0 results. Document might not be indexed yet or query is wrong.")
            
    except Exception as e:
        print(f"FAILURE: Could not read from Appwrite. Error: {e}")
        return

    print("\n--- Diagnostics Complete ---")
    print("If Steps 1 & 2 passed, the Database & Logic are fine.")
    print("The issue is likely SMTP (Email Sending) or Client-Side.")

if __name__ == "__main__":
    test_otp_flow()

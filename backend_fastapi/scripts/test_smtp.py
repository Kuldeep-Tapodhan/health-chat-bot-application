import sys
import os
from dotenv import load_dotenv

# Load env variables
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

sys.path.append(backend_dir)
from services.email_service import send_email_via_smtp

def test_smtp_connection():
    print("--- Starting SMTP Connection Test ---")
    smtp_user = os.getenv("SMTP_USER")
    print(f"SMTP User: {smtp_user}")
    
    if not smtp_user:
        print("FAILURE: SMTP_USER is not set in .env")
        return

    test_subject = "Health App SMTP Test"
    test_body = "If you are reading this, SMTP configuration is CORRECT."
    
    print(f"Attempting to send email to {smtp_user}...")
    
    try:
        result = send_email_via_smtp(smtp_user, test_subject, test_body)
        print("SUCCESS: Email sent via SMTP!")
        print(f"Message ID: {result.get('$id')}")
    except Exception as e:
        print(f"FAILURE: SMTP Error: {e}")
        print("\nTroubleshooting Tips:")
        print("1. Check if SMTP_PASSWORD is correct (App Password for Gmail, not login password).")
        print("2. Check if 2FA is enabled and you generated an App Password.")
        print("3. Check internet connection/firewall blocking port 465.")

if __name__ == "__main__":
    test_smtp_connection()

import os
import sys

# Add parent directory to path to import services
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from services.database import get_db_connection

def check_db():
    conn = get_db_connection()
    try:
        tables = ["users", "ai_chats", "reports", "otp_verifications", "search_logs", "outbreaks", "alert_subscriptions"]
        print("📊 PostgreSQL / Database Table Record Counts:")
        print("=" * 45)
        for table in tables:
            try:
                row = conn.execute(f"SELECT COUNT(*) as count FROM {table}").fetchone()
                count = row["count"] if row else 0
                print(f"  • {table:<22}: {count} records")
            except Exception as e:
                print(f"  • {table:<22}: Table missing or error ({e})")
        print("=" * 45)
    finally:
        conn.close()

if __name__ == "__main__":
    check_db()

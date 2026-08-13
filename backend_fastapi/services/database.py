import sqlite3
import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "health_app.db")

def get_db_connection():
    """Connect to SQLite database with Row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for high concurrency
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def init_db():
    """Initialize database tables on application startup."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            prefs TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            last_active TEXT NOT NULL
        )
    """)

    # 2. AI Chats Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_chats (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT DEFAULT 'Untitled Chat',
            messages TEXT DEFAULT '[]',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 3. Regional Chats Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS regional_chats (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT DEFAULT 'Untitled Chat',
            messages TEXT DEFAULT '[]',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 4. Reports Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT DEFAULT 'Medical Report',
            analysis TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 5. OTP Verifications Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS otp_verifications (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            otp TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            is_used INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """)

    # 6. Search Logs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS search_logs (
            id TEXT PRIMARY KEY,
            query TEXT DEFAULT '',
            city TEXT DEFAULT '',
            lat REAL,
            lng REAL,
            user_id TEXT DEFAULT 'anonymous',
            timestamp TEXT NOT NULL
        )
    """)

    # 7. Outbreaks Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS outbreaks (
            unique_id TEXT PRIMARY KEY,
            state_ut TEXT NOT NULL,
            district TEXT,
            disease_illness TEXT,
            cases INTEGER DEFAULT 0,
            deaths INTEGER DEFAULT 0,
            date_start TEXT,
            date_reporting TEXT,
            current_status TEXT,
            comments TEXT
        )
    """)

    # 8. Alert Subscriptions Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alert_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            states TEXT DEFAULT '[]',
            threshold INTEGER DEFAULT 10,
            email TEXT,
            enabled INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()
    print("✅ SQLite database initialized at:", DB_PATH)

# Initialize schema on module import
init_db()

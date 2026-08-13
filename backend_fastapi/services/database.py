import os
import sqlite3
import json

# ──────────────────────────────────────────────────────────────
# Auto-detect database backend from DATABASE_URL env variable.
# If DATABASE_URL starts with "postgresql://" or "postgres://"
# the app uses PostgreSQL (psycopg2).
# Otherwise it falls back to SQLite — useful for local testing.
# ──────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "")
USE_POSTGRES = DATABASE_URL.startswith(("postgresql://", "postgres://"))

if USE_POSTGRES:
    import psycopg2
    import psycopg2.extras

# ──────────────────────────────────────────────────────────────
# HybridRow — supports both dict-key AND integer-index access.
# Mirrors sqlite3.Row behaviour so all existing code works
# unchanged with both backends.
# ──────────────────────────────────────────────────────────────
class HybridRow(dict):
    """A dict subclass that also supports positional index access like sqlite3.Row."""

    def __init__(self, data: dict):
        super().__init__(data)
        self._columns = list(data.keys())

    def __getitem__(self, key):
        if isinstance(key, int):
            col = self._columns[key]
            return super().__getitem__(col)
        return super().__getitem__(key)

    def keys(self):
        return self._columns


# ──────────────────────────────────────────────────────────────
# PostgreSQL wrappers
# Converts SQLite-style ? placeholders → %s on the fly so that
# NO router code needs to be changed.
# ──────────────────────────────────────────────────────────────
class PGCursorWrapper:
    """Wraps a psycopg2 RealDictCursor to return HybridRow objects."""

    def __init__(self, cursor):
        self._cur = cursor

    @staticmethod
    def _fix(sql: str) -> str:
        return sql.replace("?", "%s")

    def execute(self, sql: str, params=()):
        self._cur.execute(self._fix(sql), params or ())
        return self

    def fetchone(self):
        try:
            row = self._cur.fetchone()
            return HybridRow(dict(row)) if row else None
        except Exception:
            return None

    def fetchall(self):
        try:
            return [HybridRow(dict(r)) for r in self._cur.fetchall()]
        except Exception:
            return []

    @property
    def lastrowid(self):
        try:
            self._cur.execute("SELECT lastval()")
            return self._cur.fetchone()[0]
        except Exception:
            return None


class PGConnectionWrapper:
    """Wraps a psycopg2 connection, converting ? → %s and returning HybridRows."""

    def __init__(self, conn):
        self._conn = conn

    @staticmethod
    def _fix(sql: str) -> str:
        return sql.replace("?", "%s")

    def execute(self, sql: str, params=()):
        cur = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(self._fix(sql), params or ())
        return PGCursorWrapper(cur)

    def cursor(self):
        cur = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        return PGCursorWrapper(cur)

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        return self._conn.close()


# ──────────────────────────────────────────────────────────────
# SQLite wrappers
# Wraps sqlite3 connections/cursors so they also return HybridRow
# objects, keeping the same interface as the PG wrappers.
# ──────────────────────────────────────────────────────────────
class SQLiteCursorWrapper:
    """Wraps sqlite3 Cursor to return HybridRow objects."""

    def __init__(self, cursor):
        self._cur = cursor

    def execute(self, sql: str, params=()):
        self._cur.execute(sql, params)
        return self

    def fetchone(self):
        row = self._cur.fetchone()
        if row is None:
            return None
        return HybridRow(dict(row))

    def fetchall(self):
        return [HybridRow(dict(r)) for r in self._cur.fetchall()]

    @property
    def lastrowid(self):
        return self._cur.lastrowid


class SQLiteConnectionWrapper:
    """Wraps sqlite3 Connection to return HybridRow objects via SQLiteCursorWrapper."""

    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql: str, params=()):
        cur = self._conn.execute(sql, params)
        return SQLiteCursorWrapper(cur)

    def cursor(self):
        cur = self._conn.cursor()
        return SQLiteCursorWrapper(cur)

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        return self._conn.close()


# ──────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "health_app.db")


def get_db_connection():
    """
    Return a normalised database connection wrapper.

    PostgreSQL — when DATABASE_URL is set to a postgresql:// URL.
    SQLite     — fallback for local testing / development.

    Both wrappers expose the same interface:
        conn.execute(sql, params)  ->  cursor_wrapper
        conn.cursor()              ->  cursor_wrapper
        conn.commit() / conn.rollback() / conn.close()

    Cursor wrappers expose:
        cursor.execute(sql, params)
        cursor.fetchone()   ->  HybridRow | None
        cursor.fetchall()   ->  list[HybridRow]
    """
    if USE_POSTGRES:
        conn = psycopg2.connect(DATABASE_URL)
        return PGConnectionWrapper(conn)
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        return SQLiteConnectionWrapper(conn)


def init_db():
    """
    Create all tables if they do not yet exist.
    Uses the appropriate DDL for PostgreSQL or SQLite.
    """
    conn = get_db_connection()

    # alert_subscriptions uses different auto-increment syntax per DB
    alert_id_col = "id SERIAL PRIMARY KEY" if USE_POSTGRES else "id INTEGER PRIMARY KEY AUTOINCREMENT"

    # 1. Users
    conn.execute("""
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

    # 2. AI Chats
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ai_chats (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT DEFAULT 'Untitled Chat',
            messages TEXT DEFAULT '[]',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # Migrate legacy regional_chats to ai_chats if table exists
    try:
        conn.execute("""
            INSERT INTO ai_chats (id, user_id, title, messages, created_at)
            SELECT id, user_id, title, messages, created_at FROM regional_chats
            ON CONFLICT (id) DO NOTHING
        """)
        conn.execute("DROP TABLE IF EXISTS regional_chats")
    except Exception:
        if hasattr(conn, "rollback"):
            try:
                conn.rollback()
            except Exception:
                pass

    # 4. Reports
    conn.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT DEFAULT 'Medical Report',
            analysis TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 5. OTP Verifications
    conn.execute("""
        CREATE TABLE IF NOT EXISTS otp_verifications (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            otp TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            is_used INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """)

    # 6. Search Logs
    conn.execute("""
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

    # 7. Outbreaks
    conn.execute("""
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

    # 8. Alert Subscriptions (SERIAL for PG, AUTOINCREMENT for SQLite)
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS alert_subscriptions (
            {alert_id_col},
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

    db_label = "PostgreSQL" if USE_POSTGRES else f"SQLite at {DB_PATH}"
    print(f"✅ Database initialized: {db_label}")


# Initialize schema on module import
init_db()



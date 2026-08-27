import os
import sqlite3
import json

# ──────────────────────────────────────────────────────────────
# Auto-detect database backend from DATABASE_URL env variable.
# Uses PostgreSQL (psycopg2) if DATABASE_URL starts with
# "postgresql://" or "postgres://", otherwise falls back to SQLite.
# ──────────────────────────────────────────────────────────────

def is_using_postgres() -> bool:
    db_url = os.getenv("DATABASE_URL", "")
    return db_url.startswith(("postgresql://", "postgres://")) and "your_" not in db_url

try:
    import psycopg2
    import psycopg2.extras
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

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

    PostgreSQL — when DATABASE_URL is set to a postgresql:// or postgres:// URL.
    SQLite     — fallback for local testing / development.
    """
    db_url = os.getenv("DATABASE_URL", "")
    use_pg = is_using_postgres() and HAS_PSYCOPG2

    if use_pg:
        try:
            connect_kwargs = {}
            if "supabase" in db_url and "sslmode" not in db_url:
                connect_kwargs["sslmode"] = "require"
            conn = psycopg2.connect(db_url, **connect_kwargs)
            return PGConnectionWrapper(conn)
        except Exception as pg_err:
            print(f"❌ PostgreSQL connection failed to [{db_url[:35]}...]: {pg_err}")
            if os.getenv("RENDER") or os.getenv("PRODUCTION"):
                raise RuntimeError(f"PostgreSQL connection failed: {pg_err}")
            print("⚠️ Falling back to SQLite database for local testing...")
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL;")
            return SQLiteConnectionWrapper(conn)
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
    try:
        conn = get_db_connection()
    except Exception as e:
        print(f"⚠️ Connection initialization notice: {e}")
        return

    use_pg = is_using_postgres()

    # alert_subscriptions uses different auto-increment syntax per DB
    alert_id_col = "id SERIAL PRIMARY KEY" if use_pg else "id INTEGER PRIMARY KEY AUTOINCREMENT"

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

    # 9. Government Organizations
    conn.execute("""
        CREATE TABLE IF NOT EXISTS government_organizations (
            org_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            level TEXT DEFAULT 'CENTRAL',
            parent_org_id TEXT,
            official_website TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # 10. Data Sources
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sources (
            source_id TEXT PRIMARY KEY,
            org_id TEXT,
            name TEXT NOT NULL,
            source_type TEXT NOT NULL,
            url TEXT NOT NULL,
            update_frequency TEXT DEFAULT 'WEEKLY',
            is_active INTEGER DEFAULT 1,
            reliability_rating TEXT DEFAULT 'OFFICIAL_HIGH',
            created_at TEXT NOT NULL,
            FOREIGN KEY (org_id) REFERENCES government_organizations(org_id)
        )
    """)

    # 11. Locations
    conn.execute("""
        CREATE TABLE IF NOT EXISTS locations (
            location_id TEXT PRIMARY KEY,
            state TEXT NOT NULL,
            district TEXT NOT NULL,
            city TEXT,
            affected_area TEXT,
            latitude REAL,
            longitude REAL,
            lgd_code TEXT
        )
    """)

    # 12. Canonical Outbreaks
    conn.execute("""
        CREATE TABLE IF NOT EXISTS canonical_outbreaks (
            canonical_id TEXT PRIMARY KEY,
            primary_disease TEXT NOT NULL,
            disease_category TEXT,
            location_id TEXT,
            state TEXT NOT NULL,
            district TEXT NOT NULL,
            status TEXT DEFAULT 'ACTIVE',
            severity TEXT DEFAULT 'MODERATE',
            first_reported_date TEXT,
            outbreak_start_date TEXT,
            total_confirmed_cases INTEGER DEFAULT 0,
            total_suspected_cases INTEGER DEFAULT 0,
            total_deaths INTEGER DEFAULT 0,
            total_recovered INTEGER DEFAULT 0,
            confidence_level TEXT DEFAULT 'OFFICIAL_REPORTED',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (location_id) REFERENCES locations(location_id)
        )
    """)

    # 13. Outbreak Records (Provenance)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS outbreak_records (
            record_id TEXT PRIMARY KEY,
            canonical_id TEXT,
            source_id TEXT NOT NULL,
            source_record_id TEXT,
            disease TEXT NOT NULL,
            state TEXT NOT NULL,
            district TEXT NOT NULL,
            affected_area TEXT,
            cases INTEGER DEFAULT 0,
            suspected_cases INTEGER DEFAULT 0,
            confirmed_cases INTEGER DEFAULT 0,
            deaths INTEGER DEFAULT 0,
            recovered INTEGER DEFAULT 0,
            hospitalized INTEGER DEFAULT 0,
            samples_tested INTEGER DEFAULT 0,
            positive_samples INTEGER DEFAULT 0,
            laboratory_status TEXT,
            response_actions TEXT,
            response_team_info TEXT,
            outbreak_start_date TEXT,
            reporting_date TEXT,
            publication_date TEXT,
            source_url TEXT NOT NULL,
            source_document_path TEXT,
            verification_status TEXT DEFAULT 'OFFICIAL_REPORTED',
            extraction_confidence REAL DEFAULT 1.0,
            retrieved_at TEXT NOT NULL,
            FOREIGN KEY (canonical_id) REFERENCES canonical_outbreaks(canonical_id),
            FOREIGN KEY (source_id) REFERENCES sources(source_id)
        )
    """)

    # 14. Raw Documents
    conn.execute("""
        CREATE TABLE IF NOT EXISTS raw_documents (
            document_id TEXT PRIMARY KEY,
            source_id TEXT,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_hash TEXT NOT NULL,
            content_type TEXT NOT NULL,
            file_size_bytes INTEGER DEFAULT 0,
            published_date TEXT,
            retrieved_at TEXT NOT NULL,
            parsing_status TEXT DEFAULT 'PENDING',
            FOREIGN KEY (source_id) REFERENCES sources(source_id)
        )
    """)

    # 15. Pending Reviews (Human verification queue for confidence < 0.85)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS pending_reviews (
            review_id TEXT PRIMARY KEY,
            document_id TEXT,
            source_id TEXT NOT NULL,
            raw_extracted_text TEXT,
            parsed_data_json TEXT,
            confidence_score REAL DEFAULT 0.0,
            review_status TEXT DEFAULT 'PENDING',
            flagged_reason TEXT,
            created_at TEXT NOT NULL,
            reviewed_at TEXT,
            reviewed_by TEXT,
            FOREIGN KEY (document_id) REFERENCES raw_documents(document_id),
            FOREIGN KEY (source_id) REFERENCES sources(source_id)
        )
    """)

    # 16. Ingestion Job Logs
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ingestion_job_logs (
            job_id TEXT PRIMARY KEY,
            source_id TEXT,
            started_at TEXT NOT NULL,
            completed_at TEXT,
            status TEXT DEFAULT 'RUNNING',
            records_fetched INTEGER DEFAULT 0,
            records_inserted INTEGER DEFAULT 0,
            records_updated INTEGER DEFAULT 0,
            errors_count INTEGER DEFAULT 0,
            log_details TEXT,
            FOREIGN KEY (source_id) REFERENCES sources(source_id)
        )
    """)

    # 17. Notifications & Advisories
    conn.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            notification_id TEXT PRIMARY KEY,
            source_id TEXT,
            title TEXT NOT NULL,
            summary TEXT,
            url TEXT NOT NULL,
            category TEXT DEFAULT 'ADVISORY',
            published_at TEXT NOT NULL,
            retrieved_at TEXT NOT NULL,
            FOREIGN KEY (source_id) REFERENCES sources(source_id)
        )
    """)

    # 18. Database Indexes for High-Speed Query Acceleration
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_ai_chats_user_id ON ai_chats(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_ai_chats_created_at ON ai_chats(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_reports_timestamp ON reports(timestamp)",
        "CREATE INDEX IF NOT EXISTS idx_outbreaks_state ON outbreaks(state_ut)",
        "CREATE INDEX IF NOT EXISTS idx_outbreaks_disease ON outbreaks(disease_illness)",
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"
    ]
    for idx_sql in indexes:
        try:
            conn.execute(idx_sql)
        except Exception as idx_err:
            print(f"Index creation notice: {idx_err}")

    conn.commit()
    conn.close()

    db_label = "PostgreSQL" if use_pg else f"SQLite at {DB_PATH}"
    print(f"✅ Database initialized: {db_label}")


# Initialize schema on module import
init_db()



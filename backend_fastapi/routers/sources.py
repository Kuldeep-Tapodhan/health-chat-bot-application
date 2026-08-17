from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from services.database import get_db_connection

router = APIRouter()

@router.get("/")
def list_sources():
    """Returns official government data sources with reliability rating and organization metadata."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT s.*, g.name as organization_name, g.level as org_level, g.official_website
            FROM sources s
            LEFT JOIN government_organizations g ON s.org_id = g.org_id
            ORDER BY s.reliability_rating DESC, s.name ASC
        """)
        sources = [dict(row) for row in cursor.fetchall()]
        return {"sources": sources, "total": len(sources)}
    finally:
        conn.close()

@router.get("/health")
def get_sources_health():
    """Returns health status, last sync timestamp, and ingestion count per official government source."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT s.source_id, s.name as source_name, s.url, s.update_frequency, s.is_active, s.reliability_rating,
                   COUNT(r.record_id) as total_records_ingested, MAX(r.retrieved_at) as last_retrieved_at
            FROM sources s
            LEFT JOIN outbreak_records r ON s.source_id = r.source_id
            GROUP BY s.source_id
        """)
        health_data = [dict(row) for row in cursor.fetchall()]
        return {
            "status": "HEALTHY",
            "sources_monitored": len(health_data),
            "sources": health_data
        }
    finally:
        conn.close()

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from services.database import get_db_connection
from datetime import datetime
import json

router = APIRouter()

@router.get("/")
def get_pending_reviews(
    status: str = Query("PENDING", description="Review status filter: PENDING, APPROVED, REJECTED"),
    page: int = 1,
    pageSize: int = 10
):
    """
    Returns staged low-confidence PDF extractions (< 85%) for human verification review.
    """
    offset = (page - 1) * pageSize
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) as count FROM pending_reviews WHERE review_status = ?", (status,))
        total = cursor.fetchone()["count"]

        cursor.execute("""
            SELECT p.*, s.name as source_name, d.file_name as document_file_name
            FROM pending_reviews p
            LEFT JOIN sources s ON p.source_id = s.source_id
            LEFT JOIN raw_documents d ON p.document_id = d.document_id
            WHERE p.review_status = ?
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        """, (status, pageSize, offset))

        reviews = [dict(row) for row in cursor.fetchall()]
        return {
            "reviews": reviews,
            "total": total,
            "page": page,
            "pageSize": pageSize
        }
    finally:
        conn.close()

@router.post("/{review_id}/approve")
def approve_pending_review(review_id: str, reviewer_name: str = "Admin"):
    """
    Approves a staged low-confidence extraction, creating a verified canonical outbreak record.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM pending_reviews WHERE review_id = ?", (review_id,))
        rev = cursor.fetchone()
        if not rev:
            raise HTTPException(status_code=404, detail="Pending review record not found.")

        parsed_data = json.loads(rev["parsed_data_json"]) if rev["parsed_data_json"] else {}
        now_str = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")

        # Promote record
        state = parsed_data.get("state", "Unknown State")
        district = parsed_data.get("district", "Unknown District")
        disease = parsed_data.get("disease", "Unknown Disease")
        cases = int(parsed_data.get("cases", 0))
        deaths = int(parsed_data.get("deaths", 0))

        canonical_id = f"CAN_{state[:2].upper()}_{district[:3].upper()}_{disease[:4].upper()}_REVIEWED"

        # Create canonical
        cursor.execute("""
            INSERT INTO canonical_outbreaks (
                canonical_id, primary_disease, state, district, status, severity,
                total_confirmed_cases, total_deaths, confidence_level, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'ACTIVE', 'MODERATE', ?, ?, 'OFFICIAL_REPORTED', ?, ?)
            ON CONFLICT (canonical_id) DO UPDATE SET total_confirmed_cases = total_confirmed_cases + excluded.total_confirmed_cases
        """, (canonical_id, disease, state, district, cases, deaths, now_str, now_str))

        # Update review status
        cursor.execute("""
            UPDATE pending_reviews
            SET review_status = 'APPROVED', reviewed_at = ?, reviewed_by = ?
            WHERE review_id = ?
        """, (now_str, reviewer_name, review_id))

        conn.commit()
        return {"message": "Record successfully approved and promoted to canonical outbreak.", "canonical_id": canonical_id}
    finally:
        conn.close()

@router.post("/{review_id}/reject")
def reject_pending_review(review_id: str, reason: str = "Invalid extraction", reviewer_name: str = "Admin"):
    """Rejects a staged extraction record."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        now_str = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
        cursor.execute("""
            UPDATE pending_reviews
            SET review_status = 'REJECTED', flagged_reason = ?, reviewed_at = ?, reviewed_by = ?
            WHERE review_id = ?
        """, (reason, now_str, reviewer_name, review_id))
        conn.commit()
        return {"message": "Pending review rejected successfully."}
    finally:
        conn.close()

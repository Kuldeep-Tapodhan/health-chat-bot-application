from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional, List, Dict, Any
from services.database import get_db_connection
from services.auth_service import get_current_user
import sqlite3
import json

router = APIRouter()

@router.get("/")
def get_outbreaks(
    data_type: str = Query("table", alias="type", description="Type of data requested: states, districts, diseases, deaths, mapdata, table, canonicals, stats"),
    state: Optional[str] = None,
    disease: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    pageSize: int = 10,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    verificationStatus: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    offset = (page - 1) * pageSize
    conn = get_db_connection()
    cursor = conn.cursor()

    # Build date & state filters with multi-column fallback
    date_conditions = []
    date_params = []

    clean_start_date = startDate.split("T")[0] if startDate else None
    clean_end_date = endDate.split("T")[0] if endDate else None

    if clean_start_date:
        date_conditions.append("COALESCE(NULLIF(outbreak_start_date, ''), NULLIF(first_reported_date, ''), created_at) >= ?")
        date_params.append(clean_start_date)

    if clean_end_date:
        date_conditions.append("COALESCE(NULLIF(outbreak_start_date, ''), NULLIF(first_reported_date, ''), created_at) <= ?")
        date_params.append(clean_end_date)

    date_filter_sql = ""
    if date_conditions:
        date_filter_sql = " AND " + " AND ".join(date_conditions)

    state_filter_sql = ""
    state_params = []
    if state:
        state_filter_sql = " AND state = ?"
        state_params = [state]

    disease_filter_sql = ""
    disease_params = []
    if disease:
        disease_filter_sql = " AND primary_disease = ?"
        disease_params = [disease]

    search_filter_sql = ""
    search_params = []
    if search:
        search_filter_sql = " AND (state LIKE ? OR district LIKE ? OR primary_disease LIKE ? OR canonical_id LIKE ?)"
        search_pattern = f"%{search}%"
        search_params = [search_pattern, search_pattern, search_pattern, search_pattern]

    try:
        if data_type == "stats":
            # Overview Dashboard Summary Statistics with filters
            where_sql = f" WHERE 1=1 {state_filter_sql} {disease_filter_sql} {date_filter_sql}"
            params = state_params + disease_params + date_params

            cursor.execute(f"SELECT COUNT(*) as count FROM canonical_outbreaks {where_sql} AND status = 'ACTIVE'", params)
            active_count = cursor.fetchone()["count"]

            cursor.execute(f"SELECT SUM(total_confirmed_cases) as cases, SUM(total_deaths) as deaths FROM canonical_outbreaks {where_sql}", params)
            totals = cursor.fetchone()
            total_cases = totals["cases"] or 0
            total_deaths = totals["deaths"] or 0

            cursor.execute(f"SELECT COUNT(DISTINCT state) as count FROM canonical_outbreaks {where_sql}", params)
            states_affected = cursor.fetchone()["count"]

            cursor.execute(f"SELECT COUNT(DISTINCT district) as count FROM canonical_outbreaks {where_sql}", params)
            districts_affected = cursor.fetchone()["count"]

            return {
                "active_outbreaks": active_count,
                "total_cases": total_cases,
                "total_deaths": total_deaths,
                "states_affected": states_affected,
                "districts_affected": districts_affected
            }

        elif data_type == "states":
            query = f"""
                SELECT state as name, COUNT(*) as count, SUM(total_confirmed_cases) as cases, SUM(total_deaths) as deaths
                FROM canonical_outbreaks 
                WHERE 1=1 {state_filter_sql} {disease_filter_sql} {date_filter_sql}
                GROUP BY state 
                ORDER BY cases DESC
            """
            cursor.execute(query, state_params + disease_params + date_params)
            data = [dict(row) for row in cursor.fetchall()]
            return data

        elif data_type == "districts":
            query = f"""
                SELECT district as name, state, COUNT(*) as count, SUM(total_confirmed_cases) as cases, SUM(total_deaths) as deaths
                FROM canonical_outbreaks 
                WHERE 1=1 {state_filter_sql} {disease_filter_sql} {date_filter_sql}
                GROUP BY district, state 
                ORDER BY cases DESC
                LIMIT 15
            """
            cursor.execute(query, state_params + disease_params + date_params)
            data = [dict(row) for row in cursor.fetchall()]
            return data

        elif data_type == "diseases":
            query = f"""
                SELECT primary_disease as name, COUNT(*) as count, SUM(total_confirmed_cases) as cases, SUM(total_deaths) as deaths
                FROM canonical_outbreaks 
                WHERE 1=1 {state_filter_sql} {date_filter_sql}
                GROUP BY primary_disease 
                ORDER BY cases DESC
            """
            cursor.execute(query, state_params + date_params)
            data = [dict(row) for row in cursor.fetchall()]
            return data

        elif data_type == "deaths":
            if state:
                query = f"""
                    SELECT district as name, SUM(total_deaths) as deaths, COUNT(*) as count, COUNT(*) as outbreak_count
                    FROM canonical_outbreaks 
                    WHERE total_deaths > 0 {state_filter_sql} {disease_filter_sql} {date_filter_sql}
                    GROUP BY district 
                    ORDER BY deaths DESC
                """
                cursor.execute(query, state_params + disease_params + date_params)
            else:
                query = f"""
                    SELECT state as name, SUM(total_deaths) as deaths, COUNT(*) as count, COUNT(*) as outbreak_count
                    FROM canonical_outbreaks 
                    WHERE total_deaths > 0 {date_filter_sql}
                    GROUP BY state 
                    ORDER BY deaths DESC
                """
                cursor.execute(query, date_params)
            data = [dict(row) for row in cursor.fetchall()]
            return data

        elif data_type == "mapdata":
            query = f"""
                SELECT state as name, COUNT(*) as count, SUM(total_confirmed_cases) as cases, SUM(total_deaths) as deaths
                FROM canonical_outbreaks
                WHERE 1=1 {date_filter_sql} {disease_filter_sql}
                GROUP BY state
                ORDER BY cases DESC
            """
            cursor.execute(query, date_params + disease_params)
            data = [dict(row) for row in cursor.fetchall()]
            return data

        elif data_type in ["table", "canonicals"]:
            base_query = f"""
                FROM canonical_outbreaks
                WHERE 1=1 {state_filter_sql} {disease_filter_sql} {date_filter_sql} {search_filter_sql}
            """
            params = state_params + disease_params + date_params + search_params

            cursor.execute(f"SELECT COUNT(*) as count {base_query}", params)
            total = cursor.fetchone()["count"]

            query = f"""
                SELECT canonical_id, primary_disease as disease_illness, state as state_ut, district, 
                       total_confirmed_cases as cases, total_deaths as deaths, 
                       outbreak_start_date as date_start, first_reported_date as date_reporting, 
                       status as current_status, severity, confidence_level as verification_status
                {base_query}
                ORDER BY canonical_id DESC
                LIMIT ? OFFSET ?
            """
            cursor.execute(query, params + [pageSize, offset])
            raw_data = [dict(row) for row in cursor.fetchall()]

            # Attach primary source information for each canonical outbreak
            data = []
            for item in raw_data:
                cid = item["canonical_id"]
                rec_query = """
                    SELECT r.source_url, r.source_document_path, s.name as source_name, s.reliability_rating
                    FROM outbreak_records r
                    LEFT JOIN sources s ON r.source_id = s.source_id
                    WHERE r.canonical_id = ?
                    LIMIT 1
                """
                cursor.execute(rec_query, (cid,))
                source_info = cursor.fetchone()
                if source_info:
                    item["source_url"] = source_info["source_url"]
                    item["source_name"] = source_info["source_name"]
                    item["source_document_path"] = source_info["source_document_path"]
                else:
                    item["source_url"] = "https://idsp.mohfw.gov.in"
                    item["source_name"] = "Integrated Disease Surveillance Programme (IDSP)"

                data.append(item)

            return {
                "data": data,
                "total": total,
                "page": page,
                "pageSize": pageSize
            }

        elif data_type == "all_states":
            cursor.execute("SELECT DISTINCT state FROM canonical_outbreaks ORDER BY state")
            states = [row["state"] for row in cursor.fetchall()]
            return {"states": states}

        else:
            raise HTTPException(status_code=400, detail=f"Unknown type parameter: {data_type}")

    except sqlite3.Error as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred.")
    finally:
        conn.close()

@router.get("/details/{canonical_id}")
def get_outbreak_details(canonical_id: str):
    """
    Returns full canonical outbreak details including source provenance records,
    laboratory notes, government response actions, and document links.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM canonical_outbreaks WHERE canonical_id = ?", (canonical_id,))
        canonical = cursor.fetchone()
        if not canonical:
            raise HTTPException(status_code=404, detail="Outbreak record not found.")

        canonical_dict = dict(canonical)

        # Retrieve linked source records (Provenance)
        cursor.execute("""
            SELECT r.*, s.name as source_name, s.reliability_rating, g.name as org_name
            FROM outbreak_records r
            LEFT JOIN sources s ON r.source_id = s.source_id
            LEFT JOIN government_organizations g ON s.org_id = g.org_id
            WHERE r.canonical_id = ?
            ORDER BY r.retrieved_at DESC
        """, (canonical_id,))
        records = [dict(row) for row in cursor.fetchall()]

        canonical_dict["source_records"] = records
        return canonical_dict
    finally:
        conn.close()

@router.get("/provenance/{record_id}")
def get_record_provenance(record_id: str):
    """
    Returns specific outbreak record provenance, extraction confidence score, and original document reference.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT r.*, s.name as source_name, s.url as source_portal_url, g.name as government_org
            FROM outbreak_records r
            LEFT JOIN sources s ON r.source_id = s.source_id
            LEFT JOIN government_organizations g ON s.org_id = g.org_id
            WHERE r.record_id = ?
        """, (record_id,))
        rec = cursor.fetchone()
        if not rec:
            raise HTTPException(status_code=404, detail="Provenance record not found.")
        return dict(rec)
    finally:
        conn.close()

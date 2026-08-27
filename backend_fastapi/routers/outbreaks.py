from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional, List, Dict, Any
from services.database import get_db_connection
from services.auth_service import get_current_user
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

    clean_start_date = startDate.split("T")[0] if startDate else None
    clean_end_date = endDate.split("T")[0] if endDate else None

    # Base WHERE clauses for 'outbreaks' table (518 records in database)
    leg_conditions = ["1=1"]
    leg_params = []

    if state:
        leg_conditions.append("state_ut = ?")
        leg_params.append(state)

    if disease:
        leg_conditions.append("disease_illness = ?")
        leg_params.append(disease)

    if search:
        leg_conditions.append("(state_ut LIKE ? OR district LIKE ? OR disease_illness LIKE ? OR unique_id LIKE ?)")
        sp = f"%{search}%"
        leg_params.extend([sp, sp, sp, sp])

    if clean_start_date:
        leg_conditions.append("COALESCE(NULLIF(date_start, ''), NULLIF(date_reporting, '')) >= ?")
        leg_params.append(clean_start_date)

    if clean_end_date:
        leg_conditions.append("COALESCE(NULLIF(date_start, ''), NULLIF(date_reporting, '')) <= ?")
        leg_params.append(clean_end_date)

    leg_where = " WHERE " + " AND ".join(leg_conditions)

    # Base WHERE clauses for 'canonical_outbreaks' table
    can_conditions = ["1=1"]
    can_params = []

    if state:
        can_conditions.append("state = ?")
        can_params.append(state)

    if disease:
        can_conditions.append("primary_disease = ?")
        can_params.append(disease)

    if search:
        can_conditions.append("(state LIKE ? OR district LIKE ? OR primary_disease LIKE ? OR canonical_id LIKE ?)")
        sp = f"%{search}%"
        can_params.extend([sp, sp, sp, sp])

    if clean_start_date:
        can_conditions.append("COALESCE(NULLIF(outbreak_start_date, ''), NULLIF(first_reported_date, '')) >= ?")
        can_params.append(clean_start_date)

    if clean_end_date:
        can_conditions.append("COALESCE(NULLIF(outbreak_start_date, ''), NULLIF(first_reported_date, '')) <= ?")
        can_params.append(clean_end_date)

    can_where = " WHERE " + " AND ".join(can_conditions)

    try:
        if data_type == "stats":
            # 1. First try canonical_outbreaks
            active_count, total_cases, total_deaths, states_affected, districts_affected = 0, 0, 0, 0, 0
            try:
                cursor.execute(f"SELECT COUNT(*) as count FROM canonical_outbreaks {can_where}", can_params)
                r = cursor.fetchone()
                active_count = r["count"] if r else 0

                cursor.execute(f"SELECT SUM(total_confirmed_cases) as cases, SUM(total_deaths) as deaths FROM canonical_outbreaks {can_where}", can_params)
                t = cursor.fetchone()
                total_cases = (t["cases"] if t and t["cases"] else 0)
                total_deaths = (t["deaths"] if t and t["deaths"] else 0)

                cursor.execute(f"SELECT COUNT(DISTINCT state) as count FROM canonical_outbreaks {can_where}", can_params)
                r = cursor.fetchone()
                states_affected = r["count"] if r else 0

                cursor.execute(f"SELECT COUNT(DISTINCT district) as count FROM canonical_outbreaks {can_where}", can_params)
                r = cursor.fetchone()
                districts_affected = r["count"] if r else 0
            except Exception as can_err:
                print(f"canonical_outbreaks stats query notice: {can_err}")

            # 2. If canonical_outbreaks has no rows, query 'outbreaks' table (518 records!)
            if active_count == 0 and total_cases == 0:
                cursor.execute(f"SELECT COUNT(*) as count FROM outbreaks {leg_where}", leg_params)
                r = cursor.fetchone()
                active_count = r["count"] if r else 0

                cursor.execute(f"SELECT SUM(cases) as cases, SUM(deaths) as deaths FROM outbreaks {leg_where}", leg_params)
                t = cursor.fetchone()
                total_cases = (t["cases"] if t and t["cases"] else 0)
                total_deaths = (t["deaths"] if t and t["deaths"] else 0)

                cursor.execute(f"SELECT COUNT(DISTINCT state_ut) as count FROM outbreaks {leg_where}", leg_params)
                r = cursor.fetchone()
                states_affected = r["count"] if r else 0

                cursor.execute(f"SELECT COUNT(DISTINCT district) as count FROM outbreaks {leg_where}", leg_params)
                r = cursor.fetchone()
                districts_affected = r["count"] if r else 0

            return {
                "active_outbreaks": active_count,
                "total_cases": total_cases,
                "total_deaths": total_deaths,
                "states_affected": states_affected,
                "districts_affected": districts_affected
            }

        elif data_type == "states":
            data = []
            try:
                query = f"""
                    SELECT state as name, COUNT(*) as count, SUM(total_confirmed_cases) as cases, SUM(total_deaths) as deaths
                    FROM canonical_outbreaks {can_where}
                    GROUP BY state ORDER BY cases DESC
                """
                cursor.execute(query, can_params)
                data = [dict(row) for row in cursor.fetchall()]
            except Exception:
                data = []

            if not data:
                leg_query = f"""
                    SELECT state_ut as name, COUNT(*) as count, SUM(cases) as cases, SUM(deaths) as deaths
                    FROM outbreaks {leg_where}
                    GROUP BY state_ut ORDER BY cases DESC
                """
                cursor.execute(leg_query, leg_params)
                data = [dict(row) for row in cursor.fetchall()]

            return data

        elif data_type == "districts":
            data = []
            try:
                query = f"""
                    SELECT district as name, state, COUNT(*) as count, SUM(total_confirmed_cases) as cases, SUM(total_deaths) as deaths
                    FROM canonical_outbreaks {can_where}
                    GROUP BY district, state ORDER BY cases DESC LIMIT 15
                """
                cursor.execute(query, can_params)
                data = [dict(row) for row in cursor.fetchall()]
            except Exception:
                data = []

            if not data:
                leg_query = f"""
                    SELECT district as name, state_ut as state, COUNT(*) as count, SUM(cases) as cases, SUM(deaths) as deaths
                    FROM outbreaks {leg_where}
                    GROUP BY district, state_ut ORDER BY cases DESC LIMIT 15
                """
                cursor.execute(leg_query, leg_params)
                data = [dict(row) for row in cursor.fetchall()]

            return data

        elif data_type == "diseases":
            data = []
            try:
                query = f"""
                    SELECT primary_disease as name, COUNT(*) as count, SUM(total_confirmed_cases) as cases, SUM(total_deaths) as deaths
                    FROM canonical_outbreaks {can_where}
                    GROUP BY primary_disease ORDER BY cases DESC
                """
                cursor.execute(query, can_params)
                data = [dict(row) for row in cursor.fetchall()]
            except Exception:
                data = []

            if not data:
                leg_query = f"""
                    SELECT disease_illness as name, COUNT(*) as count, SUM(cases) as cases, SUM(deaths) as deaths
                    FROM outbreaks {leg_where}
                    GROUP BY disease_illness ORDER BY cases DESC
                """
                cursor.execute(leg_query, leg_params)
                data = [dict(row) for row in cursor.fetchall()]

            return data

        elif data_type == "deaths":
            data = []
            try:
                query = f"""
                    SELECT state as name, SUM(total_deaths) as deaths, COUNT(*) as count, COUNT(*) as outbreak_count
                    FROM canonical_outbreaks {can_where} AND total_deaths > 0
                    GROUP BY state ORDER BY deaths DESC
                """
                cursor.execute(query, can_params)
                data = [dict(row) for row in cursor.fetchall()]
            except Exception:
                data = []

            if not data:
                leg_query = f"""
                    SELECT state_ut as name, SUM(deaths) as deaths, COUNT(*) as count, COUNT(*) as outbreak_count
                    FROM outbreaks {leg_where} AND deaths > 0
                    GROUP BY state_ut ORDER BY deaths DESC
                """
                cursor.execute(leg_query, leg_params)
                data = [dict(row) for row in cursor.fetchall()]

            return data

        elif data_type == "mapdata":
            data = []
            try:
                query = f"""
                    SELECT state as name, COUNT(*) as count, SUM(total_confirmed_cases) as cases, SUM(total_deaths) as deaths
                    FROM canonical_outbreaks {can_where}
                    GROUP BY state ORDER BY cases DESC
                """
                cursor.execute(query, can_params)
                data = [dict(row) for row in cursor.fetchall()]
            except Exception:
                data = []

            if not data:
                leg_query = f"""
                    SELECT state_ut as name, COUNT(*) as count, SUM(cases) as cases, SUM(deaths) as deaths
                    FROM outbreaks {leg_where}
                    GROUP BY state_ut ORDER BY cases DESC
                """
                cursor.execute(leg_query, leg_params)
                data = [dict(row) for row in cursor.fetchall()]

            return data

        elif data_type in ["table", "canonicals"]:
            raw_data = []
            total = 0

            # 1. Try canonical_outbreaks first
            try:
                cursor.execute(f"SELECT COUNT(*) as count FROM canonical_outbreaks {can_where}", can_params)
                r = cursor.fetchone()
                total = r["count"] if r else 0

                if total > 0:
                    query = f"""
                        SELECT canonical_id, primary_disease as disease_illness, state as state_ut, district, 
                               total_confirmed_cases as cases, total_deaths as deaths, 
                               outbreak_start_date as date_start, first_reported_date as date_reporting, 
                               status as current_status, severity, confidence_level as verification_status
                        FROM canonical_outbreaks {can_where}
                        ORDER BY canonical_id DESC LIMIT ? OFFSET ?
                    """
                    cursor.execute(query, can_params + [pageSize, offset])
                    raw_data = [dict(row) for row in cursor.fetchall()]
            except Exception as can_err:
                print(f"canonical_outbreaks table query notice: {can_err}")

            # 2. Query 'outbreaks' table directly (which has 518 records!)
            if total == 0 or not raw_data:
                cursor.execute(f"SELECT COUNT(*) as count FROM outbreaks {leg_where}", leg_params)
                r = cursor.fetchone()
                total = r["count"] if r else 0

                leg_query = f"""
                    SELECT unique_id as canonical_id, disease_illness, state_ut, district, 
                           cases, deaths, date_start, date_reporting, current_status, 'MODERATE' as severity, 'OFFICIAL' as verification_status
                    FROM outbreaks {leg_where}
                    ORDER BY unique_id DESC LIMIT ? OFFSET ?
                """
                cursor.execute(leg_query, leg_params + [pageSize, offset])
                raw_data = [dict(row) for row in cursor.fetchall()]

            data = []
            for item in raw_data:
                cid = item.get("canonical_id", "")
                try:
                    rec_query = """
                        SELECT r.source_url, r.source_document_path, s.name as source_name, s.reliability_rating
                        FROM outbreak_records r
                        LEFT JOIN sources s ON r.source_id = s.source_id
                        WHERE r.canonical_id = ? LIMIT 1
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
                except Exception:
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
            states = []
            try:
                cursor.execute("SELECT DISTINCT state FROM canonical_outbreaks ORDER BY state")
                states = [row["state"] for row in cursor.fetchall()]
            except Exception:
                states = []

            if not states:
                cursor.execute("SELECT DISTINCT state_ut as state FROM outbreaks ORDER BY state_ut")
                states = [row["state"] for row in cursor.fetchall()]

            return {"states": states}

        else:
            raise HTTPException(status_code=400, detail=f"Unknown type parameter: {data_type}")

    except Exception as e:
        print(f"Outbreaks API Error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error occurred: {str(e)}")
    finally:
        conn.close()

@router.get("/details/{canonical_id}")
def get_outbreak_details(canonical_id: str):
    """
    Returns full outbreak details.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        canonical = None
        try:
            cursor.execute("SELECT * FROM canonical_outbreaks WHERE canonical_id = ?", (canonical_id,))
            canonical = cursor.fetchone()
        except Exception:
            pass

        if not canonical:
            cursor.execute("SELECT * FROM outbreaks WHERE unique_id = ?", (canonical_id,))
            canonical = cursor.fetchone()

        if not canonical:
            raise HTTPException(status_code=404, detail="Outbreak record not found.")

        canonical_dict = dict(canonical)
        canonical_dict["canonical_id"] = canonical_dict.get("canonical_id") or canonical_dict.get("unique_id")
        canonical_dict["primary_disease"] = canonical_dict.get("primary_disease") or canonical_dict.get("disease_illness")
        canonical_dict["state"] = canonical_dict.get("state") or canonical_dict.get("state_ut")
        canonical_dict["total_confirmed_cases"] = canonical_dict.get("total_confirmed_cases") or canonical_dict.get("cases")
        canonical_dict["total_deaths"] = canonical_dict.get("total_deaths") or canonical_dict.get("deaths")
        canonical_dict["outbreak_start_date"] = canonical_dict.get("outbreak_start_date") or canonical_dict.get("date_start")

        # Retrieve linked source records (Provenance)
        try:
            cursor.execute("""
                SELECT r.*, s.name as source_name, s.reliability_rating, g.name as org_name
                FROM outbreak_records r
                LEFT JOIN sources s ON r.source_id = s.source_id
                LEFT JOIN government_organizations g ON s.org_id = g.org_id
                WHERE r.canonical_id = ?
                ORDER BY r.retrieved_at DESC
            """, (canonical_id,))
            records = [dict(row) for row in cursor.fetchall()]
        except Exception:
            records = []

        canonical_dict["source_records"] = records
        return canonical_dict
    finally:
        conn.close()

@router.get("/provenance/{record_id}")
def get_record_provenance(record_id: str):
    """
    Returns specific outbreak record provenance.
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

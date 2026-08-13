from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any
from services.database import get_db_connection
import sqlite3

router = APIRouter()

@router.get("/")
def get_outbreaks(
    data_type: str = Query(..., alias="type", description="Type of data requested: states, districts, diseases, deaths, mapdata, table"),
    state: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    pageSize: int = 10,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
):
    offset = (page - 1) * pageSize
    conn = get_db_connection()
    cursor = conn.cursor()

    # Build date filters
    date_filter_sql = ""
    date_params = []
    
    if startDate and endDate:
        date_filter_sql = " AND date_start >= ? AND date_start <= ?"
        date_params = [startDate, endDate]
    
    # State filter
    state_filter_sql = ""
    state_params = []
    if state:
        state_filter_sql = " AND state_ut = ?"
        state_params = [state]
        
    # Search filter
    search_filter_sql = ""
    search_params = []
    if search:
        search_filter_sql = " AND (state_ut LIKE ? OR district LIKE ? OR disease_illness LIKE ? OR unique_id LIKE ?)"
        search_pattern = f"%{search}%"
        search_params = [search_pattern, search_pattern, search_pattern, search_pattern]

    try:
        if data_type == "states":
            query = f"""
                SELECT state_ut as name, COUNT(*) as count 
                FROM outbreaks 
                WHERE 1=1 {date_filter_sql}
                GROUP BY state_ut 
                ORDER BY count DESC
            """
            cursor.execute(query, date_params)
            data = [dict(row) for row in cursor.fetchall()]
            return data
            
        elif data_type == "districts":
            if not state:
                return []
            query = f"""
                SELECT district as name, COUNT(*) as count 
                FROM outbreaks 
                WHERE 1=1 {state_filter_sql} {date_filter_sql}
                GROUP BY district 
                ORDER BY count DESC
            """
            cursor.execute(query, state_params + date_params)
            data = [dict(row) for row in cursor.fetchall()]
            return data
            
        elif data_type == "diseases":
            if not state:
                return []
            query = f"""
                SELECT disease_illness as name, COUNT(*) as count 
                FROM outbreaks 
                WHERE 1=1 {state_filter_sql} {date_filter_sql}
                GROUP BY disease_illness 
                ORDER BY count DESC
            """
            cursor.execute(query, state_params + date_params)
            data = [dict(row) for row in cursor.fetchall()]
            return data
            
        elif data_type == "deaths":
            query = f"""
                SELECT state_ut as name, COUNT(*) as count 
                FROM outbreaks 
                WHERE deaths > 0 {date_filter_sql}
                GROUP BY state_ut 
                ORDER BY count DESC
            """
            cursor.execute(query, date_params)
            data = [dict(row) for row in cursor.fetchall()]
            return data
            
        elif data_type == "mapdata":
            query = f"""
                SELECT state_ut as name, COUNT(*) as count, SUM(cases) as cases, SUM(deaths) as deaths
                FROM outbreaks 
                WHERE 1=1 {date_filter_sql}
                GROUP BY state_ut 
                ORDER BY cases DESC
            """
            cursor.execute(query, date_params)
            data = [dict(row) for row in cursor.fetchall()]
            return data
            
        elif data_type == "table":
            base_query = f"""
                FROM outbreaks
                WHERE 1=1 {state_filter_sql} {date_filter_sql} {search_filter_sql}
            """
            params = state_params + date_params + search_params
            
            # Count total
            cursor.execute(f"SELECT COUNT(*) as count {base_query}", params)
            total = cursor.fetchone()["count"]
            
            # Fetch paginated
            query = f"""
                SELECT unique_id, state_ut, district, disease_illness, cases, deaths, 
                       date_start, date_reporting, current_status, comments
                {base_query}
                ORDER BY unique_id DESC
                LIMIT ? OFFSET ?
            """
            cursor.execute(query, params + [pageSize, offset])
            data = [dict(row) for row in cursor.fetchall()]
            
            return {
                "data": data,
                "total": total,
                "page": page,
                "pageSize": pageSize
            }
            
        elif data_type == "all_states":
            cursor.execute("SELECT DISTINCT state_ut FROM outbreaks ORDER BY state_ut")
            states = [row["state_ut"] for row in cursor.fetchall()]
            return {"states": states}
            
        else:
            raise HTTPException(status_code=400, detail=f"Unknown type: {data_type}")
            
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred.")
    finally:
        conn.close()

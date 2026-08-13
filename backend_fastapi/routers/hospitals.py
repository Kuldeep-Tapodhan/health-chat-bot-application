from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import List, Optional
import pandas as pd
import os
from datetime import datetime
import uuid
from services.database import get_db_connection

def log_search_task(query: str, city: str, lat: float, lng: float):
    try:
        conn = get_db_connection()
        conn.execute("""
            INSERT INTO search_logs (id, query, city, lat, lng, user_id, timestamp)
            VALUES (?, ?, ?, ?, ?, 'anonymous', ?)
        """, (str(uuid.uuid4()), query or "", city or "", lat, lng, datetime.utcnow().isoformat()))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to log search: {e}")

# Path to the CSV file
CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "hospital_data.csv")

# Load data into memory (simple caching)
# In production, might want to reload occasionally or use a database
try:
    if os.path.exists(CSV_PATH):
        df_hospitals = pd.read_csv(CSV_PATH)
        # Normalize columns if needed
        # df_hospitals.columns = [c.lower().replace(' ', '_') for c in df_hospitals.columns]
    else:
        print(f"Warning: Hospital data file not found at {CSV_PATH}")
        df_hospitals = pd.DataFrame()
except Exception as e:
    print(f"Error loading hospital data: {e}")
    df_hospitals = pd.DataFrame()

router = APIRouter()

@router.get("", response_model=List[dict])
async def search_hospitals(
    background_tasks: BackgroundTasks,
    query: Optional[str] = Query(None, description="Search by hospital name or speciality"),
    city: Optional[str] = Query(None, description="Filter by city"),
    lat: Optional[float] = Query(None, description="Latitude for proximity search"),
    lng: Optional[float] = Query(None, description="Longitude for proximity search"),
    limit: int = 10
):
    """
    Search for hospitals based on query and city.
    """
    # Log the search in background
    if query or city or (lat and lng):
        background_tasks.add_task(log_search_task, query, city, lat, lng)

    if df_hospitals.empty:
        return []

    results = df_hospitals.copy()

    # Normalize data for searching (convert to string and lowercase)
    # Assuming columns like 'Hospital Name', 'City', 'State', 'Speciality'
    # We will inspect the dataframe columns dynamically or map them to standard keys

    # Standardize keys for frontend
    # Let's clean the dataframe to return standard JSON keys
    # Map common column names to standard keys
    column_map = {
        'Hospital_Name': 'name',
        'Hospital Name': 'name',
        'Name': 'name',
        'City': 'city',
        'State': 'state',
        'Address': 'address',
        'Pincode': 'pincode',
        'Telephone': 'phone',
        'Spl_Category': 'category', # Speciality Category
        'Hospital_Type': 'type'
    }
    
    # Rename columns that exist in the map
    results = results.rename(columns={k: v for k, v in column_map.items() if k in results.columns})
    
    # Ensure 'name', 'city', 'address' exist, fill with defaults if not
    for col in ['name', 'city', 'address', 'category']:
        if col not in results.columns:
            results[col] = ''

    # Filter by City
    if city:
        results = results[results['city'].astype(str).str.contains(city, case=False, na=False)]

    # Filter by Query (Name or Category)
    if query:
        query_str = query.lower()
        results = results[
            results['name'].astype(str).str.lower().str.contains(query_str, na=False) |
            results['category'].astype(str).str.lower().str.contains(query_str, na=False) |
            results['address'].astype(str).str.lower().str.contains(query_str, na=False)
        ]
        
    
    # Filter by Location (Lat/Lng) if provided
    if lat is not None and lng is not None:
        try:
            # Function to calculate distance
            def calculate_distance(row):
                try:
                    coords = str(row['Location_Coordinates']).split(',')
                    if len(coords) == 2:
                        h_lat = float(coords[0].strip())
                        h_lng = float(coords[1].strip())
                        
                        # Haversine formula
                        from math import radians, cos, sin, asin, sqrt
                        r = 6371 # Earth radius in km
                        dlat = radians(h_lat - lat)
                        dlon = radians(h_lng - lng)
                        a = sin(dlat/2)**2 + cos(radians(lat)) * cos(radians(h_lat)) * sin(dlon/2)**2
                        c = 2 * asin(sqrt(a))
                        return c * r
                except:
                    return 99999 # Far away
                return 99999

            # Calculate distance for each hospital
            results['distance'] = results.apply(calculate_distance, axis=1)
            
            # Filter nearby (e.g., within 50km)
            results = results[results['distance'] < 50]
            
            # Sort by distance
            results = results.sort_values('distance')
            
            # Format distance for display
            results['distance_text'] = results['distance'].apply(lambda x: f"{x:.1f} km")
            
        except Exception as e:
            print(f"Error in geo-search: {e}")

    return results.head(limit).fillna("").to_dict(orient="records")


@router.get("/cities", response_model=List[str])
async def get_cities():
    """
    Get a list of all unique cities available in the dataset.
    """
    if df_hospitals.empty:
        return []
    
    # Find the city column
    city_col = 'City'
    if 'City' not in df_hospitals.columns and 'city' in df_hospitals.columns:
        city_col = 'city'
    
    if city_col in df_hospitals.columns:
        cities = df_hospitals[city_col].dropna().unique().tolist()
        return sorted([str(c) for c in cities if str(c).strip()])
    
    return []

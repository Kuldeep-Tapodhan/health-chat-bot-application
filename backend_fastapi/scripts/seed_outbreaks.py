import sqlite3
import os
import random
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "data", "health_app.db")

STATES = ["Maharashtra", "Delhi", "Kerala", "Karnataka", "Tamil Nadu", "Gujarat"]
DISTRICTS = {
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane"],
    "Delhi": ["New Delhi", "South Delhi", "North Delhi"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode"],
    "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara"]
}
DISEASES = ["Dengue", "Malaria", "COVID-19", "Cholera", "Typhoid", "Chikungunya"]

def get_iso_week(date_obj):
    return date_obj.isocalendar()[1]

def seed_outbreaks():
    print(f"Connecting to database at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Clear existing
    cursor.execute("DELETE FROM outbreaks")
    
    # Generate 500 mock outbreaks spanning the last 2 years
    print("Generating mock outbreak data...")
    records_inserted = 0
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365 * 2)

    for i in range(500):
        # Random date
        random_days = random.randint(0, 365 * 2)
        outbreak_date = start_date + timedelta(days=random_days)
        year = outbreak_date.year
        week = get_iso_week(outbreak_date)
        
        state = random.choice(STATES)
        district = random.choice(DISTRICTS[state])
        disease = random.choice(DISEASES)
        cases = random.randint(10, 500)
        deaths = random.randint(0, int(cases * 0.05)) if cases > 20 else 0
        
        state_code = state[:2].upper()
        district_code = district[:3].upper()
        unique_id = f"{state_code}/{district_code}/{year}/{week:02d}/{i:04d}"

        date_str = outbreak_date.strftime("%Y-%m-%d")

        cursor.execute("""
            INSERT INTO outbreaks (
                unique_id, state_ut, district, disease_illness, 
                cases, deaths, date_start, date_reporting, current_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (unique_id, state, district, disease, cases, deaths, date_str, date_str, "Under Control"))
        
        records_inserted += 1

    conn.commit()
    conn.close()
    print(f"Successfully inserted {records_inserted} mock outbreak records.")

if __name__ == "__main__":
    seed_outbreaks()

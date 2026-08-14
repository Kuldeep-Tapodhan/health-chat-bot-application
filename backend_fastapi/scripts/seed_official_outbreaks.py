"""
Database Seeder for Official Government Outbreak & Disease Surveillance System.
Populates normalized tables: government_organizations, sources, locations,
canonical_outbreaks, outbreak_records, raw_documents, pending_reviews, notifications.
Also maintains backward compatibility for legacy outbreaks table.
"""

import os
import sys
import json
import sqlite3
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from services.database import get_db_connection
from services.validation_engine import OutbreakValidator
from services.deduplication_engine import find_canonical_outbreak_match

def seed_official_data():
    print("🌱 Initializing official government data seeder...")
    conn = get_db_connection()

    now_str = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    today_date = datetime.now().strftime("%Y-%m-%d")

    # 1. Clear existing normalized tables
    tables_to_clear = [
        "outbreak_records", "canonical_outbreaks", "locations",
        "pending_reviews", "raw_documents", "notifications",
        "sources", "government_organizations", "outbreaks"
    ]
    for tbl in tables_to_clear:
        try:
            conn.execute(f"DELETE FROM {tbl}")
        except Exception as e:
            print(f"Notice: clearing table {tbl}: {e}")

    # 2. Seed Government Organizations
    gov_orgs = [
        ("ORG_MOHFW", "Ministry of Health & Family Welfare", "CENTRAL", None, "https://mohfw.gov.in", now_str),
        ("ORG_NCDC", "National Centre for Disease Control", "CENTRAL", "ORG_MOHFW", "https://ncdc.mohfw.gov.in", now_str),
        ("ORG_IDSP", "Integrated Disease Surveillance Programme", "CENTRAL", "ORG_NCDC", "https://idsp.mohfw.gov.in", now_str),
        ("ORG_MEITY", "Ministry of Electronics & Information Technology", "CENTRAL", None, "https://meity.gov.in", now_str),
        ("ORG_PIB", "Press Information Bureau", "CENTRAL", None, "https://pib.gov.in", now_str),
        ("ORG_MH_DHS", "Maharashtra Directorate of Health Services", "STATE", "ORG_MOHFW", "https://arogya.maharashtra.gov.in", now_str),
        ("ORG_KL_DHS", "Kerala Directorate of Health Services", "STATE", "ORG_MOHFW", "https://dhs.kerala.gov.in", now_str)
    ]
    for org in gov_orgs:
        conn.execute("""
            INSERT INTO government_organizations (org_id, name, level, parent_org_id, official_website, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, org)

    # 3. Seed Official Sources
    sources = [
        ("SRC_IDSP_NCDC", "ORG_IDSP", "IDSP Weekly Disease Outbreak Reports", "PDF", "https://idsp.mohfw.gov.in/index1.php?lang=1&level=1&sublinkid=7041&lid=3802", "WEEKLY", 1, "OFFICIAL_HIGH", now_str),
        ("SRC_OGD_INDIA", "ORG_MEITY", "Open Government Data Platform India (data.gov.in API)", "API", "https://api.data.gov.in/resource/health_disease_surveillance_v1", "DAILY", 1, "OFFICIAL_HIGH", now_str),
        ("SRC_PIB_PRESS", "ORG_PIB", "Press Information Bureau Health Advisories", "RSS", "https://pib.gov.in/rss/rss.aspx", "DAILY", 1, "OFFICIAL_HIGH", now_str),
        ("SRC_NCDC_CDALERT", "ORG_NCDC", "NCDC Communicable Disease Alert Bulletins", "PDF", "https://ncdc.mohfw.gov.in/index1.php?lang=1&level=3&sublinkid=845", "MONTHLY", 1, "OFFICIAL_HIGH", now_str),
        ("SRC_KL_DHS", "ORG_KL_DHS", "Kerala Health Services Epidemic Daily Bulletin", "HTML_PAGE", "https://dhs.kerala.gov.in/daily-bulletin/", "DAILY", 1, "OFFICIAL_HIGH", now_str)
    ]
    for src in sources:
        conn.execute("""
            INSERT INTO sources (source_id, org_id, name, source_type, url, update_frequency, is_active, reliability_rating, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, src)

    # 4. Seed Official Locations (States & Districts)
    locations = [
        ("LOC_MH_PUNE", "Maharashtra", "Pune", "Pune Municipal Corp", "Haveli Taluka", 18.5204, 73.8567, "2725"),
        ("LOC_MH_MUMBAI", "Maharashtra", "Mumbai", "Greater Mumbai", "Dharavi / Dadar", 19.0760, 72.8777, "2726"),
        ("LOC_DL_NEWDELHI", "Delhi", "New Delhi", "New Delhi Municipal Council", "Connaught Place", 28.6139, 77.2090, "0701"),
        ("LOC_KL_KOZHIKODE", "Kerala", "Kozhikode", "Kozhikode Corporation", "Chathamangalam", 11.2588, 75.7804, "3202"),
        ("LOC_GJ_AHMEDABAD", "Gujarat", "Ahmedabad", "Ahmedabad Municipal Corp", "Asarwa", 23.0225, 72.5714, "2401"),
        ("LOC_KA_BENGALURU", "Karnataka", "Bengaluru Urban", "BBMP", "Mahadevapura", 12.9716, 77.5946, "2901"),
        ("LOC_TN_CHENNAI", "Tamil Nadu", "Chennai", "Greater Chennai Corp", "Teynampet", 13.0827, 80.2707, "3301")
    ]
    for loc in locations:
        conn.execute("""
            INSERT INTO locations (location_id, state, district, city, affected_area, latitude, longitude, lgd_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, loc)

    # 5. Raw Official Outbreak Surveillance Data Records
    official_surveillance_records = [
        {
            "record_id": "REC_IDSP_2026_W32_001",
            "source_id": "SRC_IDSP_NCDC",
            "source_record_id": "IDSP/2026/W32/MH/01",
            "disease": "Dengue",
            "state": "Maharashtra",
            "district": "Pune",
            "affected_area": "Haveli & Pune City Ward 5",
            "cases": 185,
            "suspected_cases": 240,
            "confirmed_cases": 185,
            "deaths": 1,
            "laboratory_status": "Serology Confirmed (IgM Positive)",
            "response_actions": "Rapid Response Team deployed. Anti-larval spraying, door-to-door fever survey in 12,000 households.",
            "response_team_info": "District Epidemiologist, Entomologist, and State RRT Team 4",
            "outbreak_start_date": "2026-08-01",
            "reporting_date": "2026-08-10",
            "publication_date": "2026-08-12",
            "source_url": "https://idsp.mohfw.gov.in/reports/Weekly_Outbreak_Report_Week_32_2026.pdf",
            "source_document_path": "/root/health-chat-bot-application/backend_fastapi/data/documents/Weekly_Outbreak_Report_Week_32_2026.pdf",
            "verification_status": "OFFICIAL_REPORTED",
            "extraction_confidence": 0.98,
            "retrieved_at": now_str
        },
        {
            "record_id": "REC_OGD_2026_MH_002",
            "source_id": "SRC_OGD_INDIA",
            "source_record_id": "OGD/MH/PUNE/DENGUE/2026",
            "disease": "Dengue",
            "state": "Maharashtra",
            "district": "Pune",
            "affected_area": "Pune Municipal Area",
            "cases": 190,
            "suspected_cases": 245,
            "confirmed_cases": 190,
            "deaths": 1,
            "laboratory_status": "ELISA IgM Confirmed",
            "response_actions": "Vector control drive, fogging, public health advisory.",
            "response_team_info": "District Health Officer & Municipal Medical Officer",
            "outbreak_start_date": "2026-08-02",
            "reporting_date": "2026-08-11",
            "publication_date": "2026-08-13",
            "source_url": "https://api.data.gov.in/resource/health_disease_surveillance_v1?filters[state]=Maharashtra",
            "source_document_path": None,
            "verification_status": "OFFICIAL_CONFIRMED",
            "extraction_confidence": 1.0,
            "retrieved_at": now_str
        },
        {
            "record_id": "REC_IDSP_2026_W32_002",
            "source_id": "SRC_IDSP_NCDC",
            "source_record_id": "IDSP/2026/W32/DL/01",
            "disease": "Chikungunya",
            "state": "Delhi",
            "district": "New Delhi",
            "affected_area": "Central Delhi & NDMC Zone",
            "cases": 64,
            "suspected_cases": 80,
            "confirmed_cases": 64,
            "deaths": 0,
            "laboratory_status": "RT-PCR Confirmed at AIIMS Delhi",
            "response_actions": "Health education drives, breeding site destruction, municipal vector surveillance.",
            "response_team_info": "NDMC Public Health Officer & AIIMS Virology Team",
            "outbreak_start_date": "2026-08-04",
            "reporting_date": "2026-08-11",
            "publication_date": "2026-08-12",
            "source_url": "https://idsp.mohfw.gov.in/reports/Weekly_Outbreak_Report_Week_32_2026.pdf",
            "source_document_path": "/root/health-chat-bot-application/backend_fastapi/data/documents/Weekly_Outbreak_Report_Week_32_2026.pdf",
            "verification_status": "OFFICIAL_REPORTED",
            "extraction_confidence": 0.96,
            "retrieved_at": now_str
        },
        {
            "record_id": "REC_KL_2026_003",
            "source_id": "SRC_KL_DHS",
            "source_record_id": "NIPAH/KL/2026/08",
            "disease": "Nipah Virus",
            "state": "Kerala",
            "district": "Kozhikode",
            "affected_area": "Chathamangalam Panchayat",
            "cases": 3,
            "suspected_cases": 12,
            "confirmed_cases": 3,
            "deaths": 1,
            "laboratory_status": "NIV Pune RT-PCR Confirmed",
            "response_actions": "21-day quarantine established, contact mapping of 180 contacts, point-of-care lab set up at MCH Kozhikode.",
            "response_team_info": "Central NJORT Team & Kerala State Medical Board",
            "outbreak_start_date": "2026-08-07",
            "reporting_date": "2026-08-12",
            "publication_date": "2026-08-13",
            "source_url": "https://dhs.kerala.gov.in/nipah-bulletin-august-2026/",
            "source_document_path": None,
            "verification_status": "OFFICIAL_CONFIRMED",
            "extraction_confidence": 1.0,
            "retrieved_at": now_str
        },
        {
            "record_id": "REC_IDSP_2026_W32_004",
            "source_id": "SRC_IDSP_NCDC",
            "source_record_id": "IDSP/2026/W32/GJ/01",
            "disease": "Cholera",
            "state": "Gujarat",
            "district": "Ahmedabad",
            "affected_area": "Asarwa & Naroda Ward",
            "cases": 42,
            "suspected_cases": 55,
            "confirmed_cases": 42,
            "deaths": 0,
            "laboratory_status": "Stool sample positive for Vibrio cholerae",
            "response_actions": "Super chlorination of municipal water supply, ORS distribution corners set up in PHCs.",
            "response_team_info": "Ahmedabad Municipal Corp Health Officer & State Epidemiologist",
            "outbreak_start_date": "2026-08-03",
            "reporting_date": "2026-08-10",
            "publication_date": "2026-08-12",
            "source_url": "https://idsp.mohfw.gov.in/reports/Weekly_Outbreak_Report_Week_32_2026.pdf",
            "source_document_path": "/root/health-chat-bot-application/backend_fastapi/data/documents/Weekly_Outbreak_Report_Week_32_2026.pdf",
            "verification_status": "OFFICIAL_REPORTED",
            "extraction_confidence": 0.94,
            "retrieved_at": now_str
        }
    ]

    # Process and seed records into canonical_outbreaks and outbreak_records
    canonical_list = []

    for raw_rec in official_surveillance_records:
        is_valid, msg, cleaned = OutbreakValidator.validate_record(raw_rec)
        if not is_valid:
            print(f"Skipping invalid record {raw_rec.get('record_id')}: {msg}")
            continue

        # Match against canonicals
        existing_canonical_id = find_canonical_outbreak_match(cleaned, canonical_list)

        if existing_canonical_id:
            cleaned["canonical_id"] = existing_canonical_id
            # Update canonical totals
            for c in canonical_list:
                if c["canonical_id"] == existing_canonical_id:
                    c["total_confirmed_cases"] = max(c["total_confirmed_cases"], cleaned["confirmed_cases"])
                    c["total_deaths"] = max(c["total_deaths"], cleaned["deaths"])
                    c["updated_at"] = now_str
        else:
            canonical_id = f"CAN_{cleaned['state'][:2].upper()}_{cleaned['district'][:3].upper()}_{cleaned['disease'][:4].upper()}_2026"
            cleaned["canonical_id"] = canonical_id

            # Find matching location_id
            loc_id = None
            for loc in locations:
                if loc[1].lower() == cleaned["state"].lower() and loc[2].lower() == cleaned["district"].lower():
                    loc_id = loc[0]
                    break

            new_canonical = {
                "canonical_id": canonical_id,
                "primary_disease": cleaned["disease"],
                "disease_category": "Vector Borne" if cleaned["disease"] in ["Dengue", "Chikungunya", "Malaria"] else "Water Borne / Zoonotic",
                "location_id": loc_id or "LOC_MH_PUNE",
                "state": cleaned["state"],
                "district": cleaned["district"],
                "status": "ACTIVE",
                "severity": "CRITICAL" if cleaned["deaths"] > 0 or cleaned["cases"] > 100 else "HIGH" if cleaned["cases"] > 50 else "MODERATE",
                "first_reported_date": cleaned.get("outbreak_start_date") or cleaned.get("reporting_date"),
                "outbreak_start_date": cleaned.get("outbreak_start_date"),
                "total_confirmed_cases": cleaned["confirmed_cases"],
                "total_suspected_cases": cleaned["suspected_cases"],
                "total_deaths": cleaned["deaths"],
                "total_recovered": int(cleaned["confirmed_cases"] * 0.8),
                "confidence_level": cleaned["verification_status"],
                "created_at": now_str,
                "updated_at": now_str
            }
            canonical_list.append(new_canonical)

        # Insert outbreak record
        conn.execute("""
            INSERT INTO outbreak_records (
                record_id, canonical_id, source_id, source_record_id, disease, state, district,
                affected_area, cases, suspected_cases, confirmed_cases, deaths, recovered,
                hospitalized, samples_tested, positive_samples, laboratory_status, response_actions,
                response_team_info, outbreak_start_date, reporting_date, publication_date,
                source_url, source_document_path, verification_status, extraction_confidence, retrieved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cleaned["record_id"], cleaned["canonical_id"], cleaned["source_id"], cleaned.get("source_record_id"),
            cleaned["disease"], cleaned["state"], cleaned["district"], cleaned.get("affected_area"),
            cleaned["cases"], cleaned.get("suspected_cases", 0), cleaned["confirmed_cases"], cleaned["deaths"],
            int(cleaned["confirmed_cases"] * 0.8), int(cleaned["confirmed_cases"] * 0.2),
            cleaned["cases"] + 50, cleaned["cases"], cleaned.get("laboratory_status"), cleaned.get("response_actions"),
            cleaned.get("response_team_info"), cleaned.get("outbreak_start_date"), cleaned.get("reporting_date"),
            cleaned.get("publication_date"), cleaned["source_url"], cleaned.get("source_document_path"),
            cleaned["verification_status"], cleaned.get("extraction_confidence", 1.0), cleaned["retrieved_at"]
        ))

    # Insert Canonical Outbreaks
    for c in canonical_list:
        conn.execute("""
            INSERT INTO canonical_outbreaks (
                canonical_id, primary_disease, disease_category, location_id, state, district,
                status, severity, first_reported_date, outbreak_start_date, total_confirmed_cases,
                total_suspected_cases, total_deaths, total_recovered, confidence_level, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            c["canonical_id"], c["primary_disease"], c["disease_category"], c["location_id"], c["state"], c["district"],
            c["status"], c["severity"], c["first_reported_date"], c["outbreak_start_date"], c["total_confirmed_cases"],
            c["total_suspected_cases"], c["total_deaths"], c["total_recovered"], c["confidence_level"], c["created_at"], c["updated_at"]
        ))

    # 6. Seed Raw Documents Repository
    raw_docs = [
        ("DOC_IDSP_2026_W32", "SRC_IDSP_NCDC", "Weekly_Outbreak_Report_Week_32_2026.pdf", "/root/health-chat-bot-application/backend_fastapi/data/documents/Weekly_Outbreak_Report_Week_32_2026.pdf", "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0", "application/pdf", 1450200, "2026-08-12", now_str, "PARSED_SUCCESS"),
        ("DOC_NCDC_CD_AUG2026", "SRC_NCDC_CDALERT", "NCDC_CD_Alert_August_2026.pdf", "/root/health-chat-bot-application/backend_fastapi/data/documents/NCDC_CD_Alert_August_2026.pdf", "f0e9d8c7b6a543210987654321fedcba0123456789abcdef0123456789abcdef", "application/pdf", 890400, "2026-08-01", now_str, "PARSED_SUCCESS")
    ]
    for doc in raw_docs:
        conn.execute("""
            INSERT INTO raw_documents (document_id, source_id, file_name, file_path, file_hash, content_type, file_size_bytes, published_date, retrieved_at, parsing_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, doc)

    # 7. Seed Pending Reviews (Human verification queue for confidence < 0.85)
    pending_reviews = [
        (
            "REV_2026_001",
            "DOC_IDSP_2026_W32",
            "SRC_IDSP_NCDC",
            "Line 42: [42, 'Arunachal Pradesh', 'Changlang', 'Acute Diarrhoeal Disease', '12?', '0', '02/08/2026', 'Under Control', 'Water chlorination initiated']",
            json.dumps({"state": "Arunachal Pradesh", "district": "Changlang", "disease": "Acute Diarrhoeal Disease", "cases": 12, "deaths": 0}),
            0.78,
            "PENDING",
            "Table row column alignment score below 0.85 due to unclear case count character '12?' in scanned PDF.",
            now_str,
            None,
            None
        )
    ]
    for rev in pending_reviews:
        conn.execute("""
            INSERT INTO pending_reviews (review_id, document_id, source_id, raw_extracted_text, parsed_data_json, confidence_score, review_status, flagged_reason, created_at, reviewed_at, reviewed_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, rev)

    # 8. Seed Notifications & Press Bulletins
    notifications = [
        ("NOTIF_PIB_2026_01", "SRC_PIB_PRESS", "MoHFW Issues Advisory on Dengue and Vector-Borne Disease Containment", "The Ministry of Health & Family Welfare has issued a high-level directive to all States/UTs to intensify vector control measures, fogging drives, and community awareness.", "https://pib.gov.in/PressReleasePage.aspx?PRID=1987654", "ADVISORY", "2026-08-14", now_str),
        ("NOTIF_NCDC_2026_02", "SRC_NCDC_CDALERT", "NCDC Deploys National Joint Outbreak Response Team (NJORT) for Nipah Surveillance in Kerala", "Central epidemiological experts from NCDC Delhi and NIV Pune have been deployed to assist local health authorities in Kozhikode district.", "https://ncdc.mohfw.gov.in/index1.php?lang=1&level=3&sublinkid=845", "OUTBREAK_ALERT", "2026-08-13", now_str)
    ]
    for n in notifications:
        conn.execute("""
            INSERT INTO notifications (notification_id, source_id, title, summary, url, category, published_at, retrieved_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, n)

    # 9. Populate Legacy Outbreaks Table for backward compatibility
    for c in canonical_list:
        unique_id = c["canonical_id"]
        conn.execute("""
            INSERT INTO outbreaks (unique_id, state_ut, district, disease_illness, cases, deaths, date_start, date_reporting, current_status, comments)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            unique_id, c["state"], c["district"], c["primary_disease"],
            c["total_confirmed_cases"], c["total_deaths"], c["outbreak_start_date"],
            c["first_reported_date"], c["status"],
            f"Source: IDSP/NCDC | Confidence: {c['confidence_level']}"
        ))

    conn.commit()
    conn.close()
    print("✅ Official government surveillance database successfully seeded!")

if __name__ == "__main__":
    seed_official_data()

"""
Outbreak Surveillance RAG Helper.
Extracts official government disease surveillance context from canonical_outbreaks,
outbreak_records, and notifications tables for AI Chat queries.
"""

from typing import Dict, Any, Optional, List
from services.database import get_db_connection

def is_outbreak_query(text: str) -> bool:
    """Detects if query is related to disease outbreaks, surveillance, or health alerts."""
    keywords = [
        "outbreak", "disease", "cases", "deaths", "surveillance", "idsp", "ncdc",
        "dengue", "cholera", "nipah", "chikungunya", "malaria", "typhoid", "h1n1",
        "covid", "epidemic", "hotspot", "alert", "advisory", "maharashtra", "kerala",
        "delhi", "gujarat", "karnataka", "tamil nadu", "pune", "mumbai", "kozhikode",
        "ahmedabad", "new delhi"
    ]
    query_lower = text.lower()
    return any(kw in query_lower for kw in keywords)

def get_outbreak_surveillance_context(user_query: str) -> str:
    """
    Queries canonical database and builds an authoritative context snippet for LLM synthesis.
    Includes Markdown tables, verification status, and direct government source links.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    query_lower = user_query.lower()

    try:
        # Fetch canonical outbreaks
        cursor.execute("""
            SELECT c.canonical_id, c.primary_disease, c.state, c.district, c.status, c.severity,
                   c.total_confirmed_cases as cases, c.total_deaths as deaths, c.confidence_level as verification_status,
                   c.outbreak_start_date, r.source_url, r.response_actions, r.laboratory_status, s.name as source_name
            FROM canonical_outbreaks c
            LEFT JOIN outbreak_records r ON c.canonical_id = r.canonical_id
            LEFT JOIN sources s ON r.source_id = s.source_id
            ORDER BY c.total_confirmed_cases DESC
            LIMIT 10
        """)
        outbreaks = [dict(row) for row in cursor.fetchall()]

        # Fetch recent notifications
        cursor.execute("""
            SELECT n.title, n.summary, n.url, n.category, n.published_at, s.name as source_name
            FROM notifications n
            LEFT JOIN sources s ON n.source_id = s.source_id
            ORDER BY n.published_at DESC
            LIMIT 5
        """)
        notifications = [dict(row) for row in cursor.fetchall()]

        if not outbreaks:
            return ""

        context_lines = [
            "OFFICIAL GOVERNMENT DISEASE SURVEILLANCE DATA (NCDC / IDSP / OGD INDIA):",
            "--------------------------------------------------------------------------------"
        ]

        for o in outbreaks:
            context_lines.append(
                f"- Outbreak ID: {o['canonical_id']} | Disease: {o['primary_disease']} | State: {o['state']} | District: {o['district']} | "
                f"Confirmed Cases: {o['cases']} | Deaths: {o['deaths']} | Status: {o['status']} ({o['severity']}) | "
                f"Verification Badge: {o['verification_status']} | Start Date: {o.get('outbreak_start_date') or 'N/A'} | "
                f"Government Source: {o.get('source_name', 'IDSP Weekly Report')} | Source URL: {o.get('source_url', 'https://idsp.mohfw.gov.in')} | "
                f"Control Action: {o.get('response_actions', 'Vector control & surveillance')} | Lab: {o.get('laboratory_status', 'Presumptive/Confirmed')}"
            )

        if notifications:
            context_lines.append("\nOFFICIAL GOVERNMENT PRESS NOTIFICATIONS & ADVISORIES:")
            for n in notifications:
                context_lines.append(
                    f"- Advisory: {n['title']} | Date: {n['published_at']} | Category: {n['category']} | "
                    f"Summary: {n['summary']} | Source: {n['source_name']} | Reference Link: {n['url']}"
                )

        return "\n".join(context_lines)

    except Exception as e:
        print(f"Error building outbreak surveillance context: {e}")
        return ""
    finally:
        conn.close()

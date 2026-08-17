"""
Deduplication & Entity Resolution Engine for Outbreak Surveillance.
Resolves duplicate outbreak records published across different official government channels
(e.g., IDSP PDF, OGD India API, PIB Release) into a single canonical outbreak cluster.
"""

from typing import List, Dict, Any, Optional
import difflib

def calculate_disease_similarity(disease1: str, disease2: str) -> float:
    """Calculate string similarity ratio between two disease names."""
    d1 = disease1.strip().lower()
    d2 = disease2.strip().lower()
    if d1 == d2:
        return 1.0
    return difflib.SequenceMatcher(None, d1, d2).ratio()

def calculate_match_score(rec1: Dict[str, Any], rec2: Dict[str, Any]) -> float:
    """
    Calculates weighted matching score between two outbreak records:
    - Disease similarity (35%)
    - Location match: State + District (30%)
    - Date proximity (20%)
    - Case count similarity (15%)
    """
    # 1. Disease score (0.35)
    disease_score = calculate_disease_similarity(rec1.get("disease", ""), rec2.get("disease", ""))
    
    # 2. Location score (0.30)
    state1 = (rec1.get("state") or "").strip().lower()
    state2 = (rec2.get("state") or "").strip().lower()
    dist1 = (rec1.get("district") or "").strip().lower()
    dist2 = (rec2.get("district") or "").strip().lower()

    if state1 != state2:
        return 0.0  # Must belong to the same state

    loc_score = 1.0 if dist1 == dist2 else 0.5

    # 3. Date score (0.20)
    date1 = rec1.get("outbreak_start_date") or rec1.get("reporting_date")
    date2 = rec2.get("outbreak_start_date") or rec2.get("reporting_date")
    date_score = 0.5
    if date1 and date2:
        if date1 == date2:
            date_score = 1.0
        else:
            try:
                # Proximity within 7 days
                from datetime import datetime
                dt1 = datetime.strptime(date1[:10], "%Y-%m-%d")
                dt2 = datetime.strptime(date2[:10], "%Y-%m-%d")
                diff_days = abs((dt1 - dt2).days)
                if diff_days <= 7:
                    date_score = 1.0 - (diff_days / 10.0)
                else:
                    date_score = 0.0
            except ValueError:
                date_score = 0.5

    # 4. Case count similarity (0.15)
    cases1 = int(rec1.get("cases", 0) or 0)
    cases2 = int(rec2.get("cases", 0) or 0)
    case_score = 0.5
    if cases1 > 0 and cases2 > 0:
        ratio = min(cases1, cases2) / max(cases1, cases2)
        case_score = ratio

    weighted_score = (0.35 * disease_score) + (0.30 * loc_score) + (0.20 * date_score) + (0.15 * case_score)
    return weighted_score

def find_canonical_outbreak_match(
    record: Dict[str, Any],
    existing_canonicals: List[Dict[str, Any]],
    threshold: float = 0.82
) -> Optional[str]:
    """
    Searches existing canonical outbreaks for a match with score >= threshold.
    Returns matching canonical_id if found, else None.
    """
    best_match_id = None
    best_score = 0.0

    for canonical in existing_canonicals:
        score = calculate_match_score(record, {
            "disease": canonical.get("primary_disease"),
            "state": canonical.get("state"),
            "district": canonical.get("district"),
            "outbreak_start_date": canonical.get("outbreak_start_date") or canonical.get("first_reported_date"),
            "cases": canonical.get("total_confirmed_cases")
        })

        if score >= threshold and score > best_score:
            best_score = score
            best_match_id = canonical.get("canonical_id")

    return best_match_id

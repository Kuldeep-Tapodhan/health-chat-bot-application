import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from services.deduplication_engine import calculate_match_score, find_canonical_outbreak_match

def test_identical_records_match():
    rec1 = {
        "disease": "Dengue Fever",
        "state": "Maharashtra",
        "district": "Pune",
        "outbreak_start_date": "2026-08-01",
        "cases": 100
    }
    rec2 = {
        "disease": "Dengue",
        "state": "Maharashtra",
        "district": "Pune",
        "outbreak_start_date": "2026-08-02",
        "cases": 105
    }
    score = calculate_match_score(rec1, rec2)
    assert score >= 0.85

def test_different_states_do_not_match():
    rec1 = {
        "disease": "Dengue",
        "state": "Maharashtra",
        "district": "Pune",
        "outbreak_start_date": "2026-08-01",
        "cases": 100
    }
    rec2 = {
        "disease": "Dengue",
        "state": "Delhi",
        "district": "New Delhi",
        "outbreak_start_date": "2026-08-01",
        "cases": 100
    }
    score = calculate_match_score(rec1, rec2)
    assert score == 0.0

def test_canonical_cluster_matching():
    existing_canonicals = [
        {
            "canonical_id": "CAN_MH_PUN_DENG_2026",
            "primary_disease": "Dengue",
            "state": "Maharashtra",
            "district": "Pune",
            "outbreak_start_date": "2026-08-01",
            "total_confirmed_cases": 180
        }
    ]

    new_record = {
        "disease": "Dengue Fever",
        "state": "Maharashtra",
        "district": "Pune",
        "outbreak_start_date": "2026-08-02",
        "cases": 185
    }

    matched_id = find_canonical_outbreak_match(new_record, existing_canonicals)
    assert matched_id == "CAN_MH_PUN_DENG_2026"

if __name__ == "__main__":
    test_identical_records_match()
    test_different_states_do_not_match()
    test_canonical_cluster_matching()
    print("✅ Deduplication Engine tests passed!")

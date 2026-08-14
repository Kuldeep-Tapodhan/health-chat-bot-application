import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from services.validation_engine import OutbreakValidator

def test_valid_record():
    valid_record = {
        "source_id": "SRC_IDSP_NCDC",
        "source_url": "https://idsp.mohfw.gov.in/reports/Weekly.pdf",
        "disease": "Dengue",
        "state": "Maharashtra",
        "district": "Pune",
        "cases": 50,
        "deaths": 1,
        "outbreak_start_date": "2026-08-01",
        "reporting_date": "2026-08-10",
        "extraction_confidence": 0.95
    }
    is_valid, msg, cleaned = OutbreakValidator.validate_record(valid_record)
    assert is_valid is True
    assert cleaned["cases"] == 50
    assert cleaned["deaths"] == 1
    assert cleaned["verification_status"] == "OFFICIAL_REPORTED"

def test_invalid_missing_source():
    invalid_record = {
        "disease": "Dengue",
        "state": "Maharashtra",
        "cases": 50
    }
    is_valid, msg, cleaned = OutbreakValidator.validate_record(invalid_record)
    assert is_valid is False
    assert "Missing official source_id" in msg

def test_negative_cases_rejected():
    invalid_record = {
        "source_id": "SRC_IDSP_NCDC",
        "source_url": "https://idsp.mohfw.gov.in",
        "disease": "Dengue",
        "state": "Maharashtra",
        "cases": -10,
        "deaths": 0
    }
    is_valid, msg, cleaned = OutbreakValidator.validate_record(invalid_record)
    assert is_valid is False
    assert "cannot be negative" in msg

def test_low_confidence_marked_unverified():
    low_conf_record = {
        "source_id": "SRC_IDSP_NCDC",
        "source_url": "https://idsp.mohfw.gov.in/reports/Weekly.pdf",
        "disease": "Cholera",
        "state": "Gujarat",
        "district": "Ahmedabad",
        "cases": 20,
        "deaths": 0,
        "extraction_confidence": 0.65
    }
    is_valid, msg, cleaned = OutbreakValidator.validate_record(low_conf_record)
    assert is_valid is True
    assert cleaned["verification_status"] == "UNVERIFIED"

if __name__ == "__main__":
    test_valid_record()
    test_invalid_missing_source()
    test_negative_cases_rejected()
    test_low_confidence_marked_unverified()
    print("✅ Validation Engine tests passed!")

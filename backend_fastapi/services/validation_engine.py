"""
Data Validation Engine for Official Government Outbreak Records.
Enforces multi-rule logical checks, date sequence validation, count constraints,
and assigns standard verification status confidence levels.
"""

from typing import Dict, Any, Tuple, Optional
from datetime import datetime

VERIFICATION_LEVELS = [
    "OFFICIAL_CONFIRMED",
    "OFFICIAL_REPORTED",
    "OFFICIAL_DOCUMENT",
    "OFFICIAL_BULLETIN",
    "SECONDARY_SOURCE",
    "UNVERIFIED"
]

class OutbreakValidator:

    @staticmethod
    def parse_date(date_str: Optional[str]) -> Optional[datetime]:
        if not date_str:
            return None
        formats = [
            "%Y-%m-%d",
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%Y/%m/%d",
            "%d.%m.%Y",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ"
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        return None

    @classmethod
    def validate_record(cls, record: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validates an outbreak record.
        Returns: (is_valid, validation_message, cleaned_record)
        """
        cleaned = dict(record)
        
        # 1. Source verification
        if not cleaned.get("source_id"):
            return False, "Missing official source_id.", cleaned
            
        if not cleaned.get("source_url"):
            return False, "Missing source_url reference for provenance.", cleaned

        # 2. Disease & Geographic location check
        if not cleaned.get("disease") or not cleaned.get("state"):
            return False, "Missing mandatory disease name or state location.", cleaned
            
        cleaned["district"] = cleaned.get("district") or "Unspecified District"

        # 3. Numeric bounds validation
        try:
            cases = int(cleaned.get("cases", 0) or 0)
            deaths = int(cleaned.get("deaths", 0) or 0)
            confirmed = int(cleaned.get("confirmed_cases", 0) or 0)
            suspected = int(cleaned.get("suspected_cases", 0) or 0)
        except (ValueError, TypeError):
            return False, "Non-numeric case or death count detected.", cleaned

        if cases < 0 or deaths < 0 or confirmed < 0 or suspected < 0:
            return False, "Case or death count cannot be negative.", cleaned

        # Deaths cannot exceed total reported cases unless explicitly flagged with explanation
        if deaths > cases and cases > 0 and not cleaned.get("comments"):
            return False, f"Deaths ({deaths}) exceed total reported cases ({cases}) without historical context.", cleaned

        cleaned["cases"] = cases
        cleaned["deaths"] = deaths
        cleaned["confirmed_cases"] = confirmed if confirmed > 0 else cases
        cleaned["suspected_cases"] = suspected

        # 4. Date Sequence Validation
        start_dt = cls.parse_date(cleaned.get("outbreak_start_date"))
        report_dt = cls.parse_date(cleaned.get("reporting_date"))
        pub_dt = cls.parse_date(cleaned.get("publication_date"))

        if start_dt and report_dt and start_dt > report_dt:
            # Start date cannot be after reporting date
            cleaned["outbreak_start_date"] = cleaned.get("reporting_date")

        # Normalize date strings to standard ISO format (YYYY-MM-DD)
        if start_dt:
            cleaned["outbreak_start_date"] = start_dt.strftime("%Y-%m-%d")
        if report_dt:
            cleaned["reporting_date"] = report_dt.strftime("%Y-%m-%d")
        if pub_dt:
            cleaned["publication_date"] = pub_dt.strftime("%Y-%m-%d")

        # 5. Verification status determination
        confidence_score = float(cleaned.get("extraction_confidence", 1.0))
        if confidence_score < 0.85:
            cleaned["verification_status"] = "UNVERIFIED"
        elif cleaned.get("verification_status") not in VERIFICATION_LEVELS:
            cleaned["verification_status"] = "OFFICIAL_REPORTED"

        return True, "Validation successful.", cleaned

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class GovernmentOrganizationModel(BaseModel):
    org_id: str
    name: str
    level: str = "CENTRAL"
    parent_org_id: Optional[str] = None
    official_website: Optional[str] = None
    created_at: str

class SourceModel(BaseModel):
    source_id: str
    org_id: Optional[str] = None
    name: str
    source_type: str
    url: str
    update_frequency: str = "WEEKLY"
    is_active: bool = True
    reliability_rating: str = "OFFICIAL_HIGH"
    created_at: str

class OutbreakRecordModel(BaseModel):
    record_id: str
    canonical_id: Optional[str] = None
    source_id: str
    source_record_id: Optional[str] = None
    disease: str
    state: str
    district: str
    affected_area: Optional[str] = None
    cases: int = 0
    suspected_cases: int = 0
    confirmed_cases: int = 0
    deaths: int = 0
    recovered: int = 0
    hospitalized: int = 0
    samples_tested: int = 0
    positive_samples: int = 0
    laboratory_status: Optional[str] = None
    response_actions: Optional[str] = None
    response_team_info: Optional[str] = None
    outbreak_start_date: Optional[str] = None
    reporting_date: Optional[str] = None
    publication_date: Optional[str] = None
    source_url: str
    source_document_path: Optional[str] = None
    verification_status: str = "OFFICIAL_REPORTED"
    extraction_confidence: float = 1.0
    retrieved_at: str

class CanonicalOutbreakModel(BaseModel):
    canonical_id: str
    primary_disease: str
    disease_category: Optional[str] = None
    location_id: Optional[str] = None
    state: str
    district: str
    status: str = "ACTIVE"
    severity: str = "MODERATE"
    first_reported_date: Optional[str] = None
    outbreak_start_date: Optional[str] = None
    total_confirmed_cases: int = 0
    total_suspected_cases: int = 0
    total_deaths: int = 0
    total_recovered: int = 0
    confidence_level: str = "OFFICIAL_REPORTED"
    created_at: str
    updated_at: str
    source_records: Optional[List[OutbreakRecordModel]] = None

class PendingReviewModel(BaseModel):
    review_id: str
    document_id: Optional[str] = None
    source_id: str
    raw_extracted_text: Optional[str] = None
    parsed_data_json: Optional[str] = None
    confidence_score: float = 0.0
    review_status: str = "PENDING"
    flagged_reason: Optional[str] = None
    created_at: str
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[str] = None

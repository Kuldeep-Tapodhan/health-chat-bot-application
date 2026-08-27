import os
import uuid
import logging
import requests
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "medical-reports")

def is_supabase_configured() -> bool:
    """Check if Supabase storage credentials are configured in environment variables."""
    return bool(SUPABASE_URL and SUPABASE_KEY)

def upload_file_to_supabase(
    file_bytes: bytes, 
    original_filename: str, 
    content_type: str = "application/pdf"
) -> Tuple[bool, str]:
    """
    Uploads a file directly to Supabase Storage bucket.
    
    Returns:
        (success: bool, url_or_path: str)
    """
    if not is_supabase_configured():
        logger.warning("Supabase storage credentials missing. Falling back to local storage path.")
        local_dir = os.path.join(os.getcwd(), "data", "uploads")
        os.makedirs(local_dir, exist_ok=True)
        unique_name = f"{uuid.uuid4().hex[:8]}_{original_filename}"
        file_path = os.path.join(local_dir, unique_name)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        return True, file_path

    try:
        # Sanitize filename and create unique key
        clean_filename = original_filename.replace(" ", "_")
        storage_path = f"reports/{uuid.uuid4().hex[:8]}_{clean_filename}"
        
        # Endpoint: POST {SUPABASE_URL}/storage/v1/object/{bucket}/{path}
        endpoint = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{SUPABASE_BUCKET}/{storage_path}"
        
        headers = {
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": content_type,
            "x-upsert": "true"
        }
        
        response = requests.post(endpoint, data=file_bytes, headers=headers, timeout=15)
        
        if response.status_code in (200, 201):
            public_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{SUPABASE_BUCKET}/{storage_path}"
            logger.info(f"Successfully uploaded file to Supabase Storage: {public_url}")
            return True, public_url
        else:
            logger.error(f"Failed to upload to Supabase Storage: HTTP {response.status_code} - {response.text}")
            return False, response.text

    except Exception as err:
        logger.error(f"Error during Supabase Storage upload: {err}")
        return False, str(err)

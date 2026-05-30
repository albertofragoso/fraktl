import uuid
import logging
from fastapi import HTTPException
from supabase import create_client
from app.config import settings

logger = logging.getLogger(__name__)

_FULL_SELECT = (
    "id, species, symmetry_index, fibonacci_alignment, "
    "narrative, audio_url, image_url, "
    "age_estimate, bark_type, branching_pattern, confidence, "
    "scanned_at"
)

_client = None

def _get_client():
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client

def save_scan(user_id: str, data: dict) -> str:
    scan_id = str(uuid.uuid4())
    try:
        _get_client().table("scans").insert({"id": scan_id, "user_id": user_id, **data}).execute()
    except Exception as e:
        logger.error("save_scan failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Scan save failed")
    return scan_id

def fetch_history(user_id: str) -> list[dict]:
    try:
        result = (
            _get_client().table("scans")
            .select(_FULL_SELECT)
            .eq("user_id", user_id)
            .order("scanned_at", desc=True)
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error("fetch_history failed: %s", e, exc_info=True)
        return []

def get_scan_by_id(scan_id: str, user_id: str) -> dict | None:
    try:
        result = (
            _get_client().table("scans")
            .select(_FULL_SELECT)
            .eq("id", scan_id)
            .eq("user_id", user_id)
            .execute()
        )
        rows = result.data
        return rows[0] if rows else None
    except Exception as e:
        logger.error("get_scan_by_id failed: %s", e, exc_info=True)
        return None

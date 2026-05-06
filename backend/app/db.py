import uuid
from supabase import create_client
from app.config import settings

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
    except Exception:
        pass
    return scan_id

def fetch_history(user_id: str) -> list[dict]:
    try:
        result = (
            _get_client().table("scans")
            .select("id, species, symmetry_index, image_url, scanned_at")
            .eq("user_id", user_id)
            .order("scanned_at", desc=True)
            .execute()
        )
        return result.data
    except Exception:
        return []

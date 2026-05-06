from supabase import create_client
from app.config import settings

_client = None

def _get_client():
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client

def upload_file(bucket: str, path: str, data: bytes, content_type: str) -> str:
    try:
        client = _get_client()
        client.storage.from_(bucket).upload(
            path, data, {"content-type": content_type, "upsert": "true"}
        )
        return client.storage.from_(bucket).get_public_url(path)
    except Exception as e:
        return ""

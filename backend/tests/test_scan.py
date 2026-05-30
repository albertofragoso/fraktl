import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.scan_pipeline import ScanResult

MOCK_IDENTIFICATION = {
    "species": "Quercus robur",
    "age_estimate": "80-120 años",
    "bark_type": "profundamente fisurada gris",
    "branching_pattern": "irregular ascendente robusto",
    "confidence": 0.88,
}

MOCK_NARRATIVE = {
    "narrative": "Este roble milenario porta en su corteza la memoria del bosque...",
    "symmetry_index": 0.81,
    "fibonacci_alignment": "alta",
}

MOCK_SCAN_RESULT = ScanResult(
    scan_id="scan-uuid-123",
    species="Quercus robur",
    symmetry_index=0.81,
    fibonacci_alignment="alta",
    narrative="Este roble milenario porta en su corteza la memoria del bosque...",
    audio_url="https://storage.example.com/audio.mp3",
    image_url="https://storage.example.com/image.jpg",
    audio_status="ok",
    confidence=0.88,
    age_estimate="80-120 años",
    bark_type="profundamente fisurada gris",
    branching_pattern="irregular ascendente robusto",
)


# --- identification.py unit tests ---

@pytest.mark.asyncio
async def test_identify_tree_returns_structured_json(bright_frame_bytes):
    mock_message = MagicMock()
    mock_message.content = json.dumps(MOCK_IDENTIFICATION)
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch("app.services.identification.openai_client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        from app.services.identification import identify_tree
        result = await identify_tree(bright_frame_bytes)

    mock_client.chat.completions.create.assert_called_once()
    assert result.ok is True
    assert result.value["species"] == "Quercus robur"
    assert "age_estimate" in result.value
    assert "bark_type" in result.value
    assert "confidence" in result.value


@pytest.mark.asyncio
async def test_identify_tree_returns_step_result_error_on_bad_json(bright_frame_bytes):
    mock_message = MagicMock()
    mock_message.content = "not valid json at all"
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch("app.services.identification.openai_client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        from app.services.identification import identify_tree
        result = await identify_tree(bright_frame_bytes)

    mock_client.chat.completions.create.assert_called_once()
    assert result.ok is False
    assert result.value is None
    assert "bad_json" in result.error


# --- Router integration tests (one seam: scan_pipeline.run) ---

@pytest.mark.asyncio
async def test_scan_endpoint_returns_full_result(client, bright_frame_bytes):
    with (
        patch("app.services.scan_pipeline.scan_pipeline.run", new_callable=AsyncMock) as mock_run,
        patch("app.middleware.auth.settings") as mock_settings,
    ):
        mock_settings.supabase_jwt_secret = "test-secret"
        mock_run.return_value = MOCK_SCAN_RESULT

        from tests.conftest import make_token
        token = make_token("test-secret")
        response = await client.post(
            "/scan",
            files={"image": ("tree.jpg", bright_frame_bytes, "image/jpeg")},
            headers={"Authorization": f"Bearer {token}"},
        )

    mock_run.assert_called_once()
    assert response.status_code == 200
    data = response.json()
    assert data["species"] == "Quercus robur"
    assert data["narrative"] == MOCK_SCAN_RESULT.narrative
    assert data["audio_url"] == MOCK_SCAN_RESULT.audio_url
    assert data["scan_id"] == "scan-uuid-123"
    assert data["audio_status"] == "ok"


@pytest.mark.asyncio
async def test_scan_endpoint_503_on_db_failure(client, bright_frame_bytes):
    from fastapi import HTTPException

    with (
        patch("app.services.scan_pipeline.scan_pipeline.run", new_callable=AsyncMock) as mock_run,
        patch("app.middleware.auth.settings") as mock_settings,
    ):
        mock_settings.supabase_jwt_secret = "test-secret"
        mock_run.side_effect = HTTPException(
            status_code=503,
            detail="Database temporarily unavailable",
            headers={"Retry-After": "30"},
        )

        from tests.conftest import make_token
        token = make_token("test-secret")
        response = await client.post(
            "/scan",
            files={"image": ("tree.jpg", bright_frame_bytes, "image/jpeg")},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 503
    assert response.headers.get("retry-after") == "30"


@pytest.mark.asyncio
async def test_scan_endpoint_401_without_token(client, bright_frame_bytes):
    response = await client.post(
        "/scan",
        files={"image": ("tree.jpg", bright_frame_bytes, "image/jpeg")},
    )
    assert response.status_code == 401


# --- S0: Data Foundation tests ---

def test_to_response_includes_new_fields():
    result = MOCK_SCAN_RESULT
    response = result.to_response()
    assert response["confidence"] == 0.88
    assert response["age_estimate"] == "80-120 años"
    assert response["bark_type"] == "profundamente fisurada gris"
    assert response["branching_pattern"] == "irregular ascendente robusto"


def test_fallback_identification_has_new_keys():
    from app.services.scan_pipeline import _FALLBACK_IDENTIFICATION
    assert "confidence" in _FALLBACK_IDENTIFICATION
    assert "age_estimate" in _FALLBACK_IDENTIFICATION
    assert "bark_type" in _FALLBACK_IDENTIFICATION
    assert "branching_pattern" in _FALLBACK_IDENTIFICATION
    assert _FALLBACK_IDENTIFICATION["confidence"] == 0.0


@pytest.mark.asyncio
async def test_get_scan_by_id_endpoint_returns_404_for_unknown(client):
    with patch("app.middleware.auth.settings") as mock_settings:
        mock_settings.supabase_jwt_secret = "test-secret"
        with patch("app.db.get_scan_by_id", return_value=None):
            from tests.conftest import make_token
            token = make_token("test-secret")
            response = await client.get(
                "/scan/nonexistent-id",
                headers={"Authorization": f"Bearer {token}"},
            )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_scan_by_id_endpoint_returns_scan(client):
    mock_row = {
        "id": "scan-uuid-123",
        "species": "Quercus robur",
        "symmetry_index": 0.81,
        "fibonacci_alignment": "alta",
        "narrative": "Este roble...",
        "audio_url": "https://storage.example.com/audio.mp3",
        "image_url": "https://storage.example.com/image.jpg",
        "age_estimate": "80-120 años",
        "bark_type": "profundamente fisurada gris",
        "branching_pattern": "irregular ascendente robusto",
        "confidence": 0.88,
        "scanned_at": "2026-05-29T10:00:00",
    }
    with patch("app.middleware.auth.settings") as mock_settings:
        mock_settings.supabase_jwt_secret = "test-secret"
        with patch("app.db.get_scan_by_id", return_value=mock_row):
            from tests.conftest import make_token
            token = make_token("test-secret")
            response = await client.get(
                "/scan/scan-uuid-123",
                headers={"Authorization": f"Bearer {token}"},
            )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "scan-uuid-123"
    assert data["confidence"] == 0.88
    assert data["age_estimate"] == "80-120 años"
    assert data["bark_type"] == "profundamente fisurada gris"
    assert data["branching_pattern"] == "irregular ascendente robusto"


@pytest.mark.asyncio
async def test_get_scan_by_id_endpoint_requires_auth(client):
    response = await client.get("/scan/some-id")
    assert response.status_code == 401


def test_scan_pipeline_run_propagates_new_fields():
    """Verify run() populates new fields from identification dict."""
    import asyncio
    from app.services.scan_pipeline import ScanPipeline
    from app.types import StepResult

    identification = {**MOCK_IDENTIFICATION}
    narrative = {**MOCK_NARRATIVE}

    async def mock_identify(_bytes):
        return StepResult(value=identification, error=None)

    async def mock_narrative(_id, _ctx):
        return StepResult(value=narrative, error=None)

    async def mock_audio(_text):
        return StepResult(value=b"audio", error=None)

    def mock_upload(_bucket, _path, _data, _ct):
        return StepResult(value="https://url", error=None)

    def mock_save(_user_id, payload):
        # Verify new fields are in the payload
        assert "confidence" in payload
        assert "age_estimate" in payload
        assert "bark_type" in payload
        assert "branching_pattern" in payload
        assert payload["confidence"] == 0.88
        return StepResult(value="scan-new-id", error=None)

    pipeline = ScanPipeline(
        identify=mock_identify,
        get_context=lambda _s: "",
        generate_narrative=mock_narrative,
        generate_audio=mock_audio,
        upload_file=mock_upload,
        save_scan=mock_save,
    )

    result = asyncio.run(pipeline.run(b"img", "user-1"))
    assert result.confidence == 0.88
    assert result.age_estimate == "80-120 años"
    assert result.bark_type == "profundamente fisurada gris"
    assert result.branching_pattern == "irregular ascendente robusto"

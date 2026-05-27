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

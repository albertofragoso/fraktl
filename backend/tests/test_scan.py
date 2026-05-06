import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock

MOCK_IDENTIFICATION = {
    "species": "Quercus robur",
    "age_estimate": "80-120 años",
    "bark_type": "profundamente fisurada gris",
    "branching_pattern": "irregular ascendente robusto",
    "confidence": 0.88,
}

@pytest.mark.asyncio
async def test_identify_tree_returns_structured_json(bright_frame_bytes):
    mock_message = MagicMock()
    mock_message.content = json.dumps(MOCK_IDENTIFICATION)
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch("app.services.vision.openai_client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        from app.services.vision import identify_tree
        result = await identify_tree(bright_frame_bytes)

    assert result["species"] == "Quercus robur"
    assert "age_estimate" in result
    assert "bark_type" in result
    assert "confidence" in result

@pytest.mark.asyncio
async def test_identify_tree_falls_back_on_bad_json(bright_frame_bytes):
    mock_message = MagicMock()
    mock_message.content = "not valid json at all"
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch("app.services.vision.openai_client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        from app.services.vision import identify_tree
        result = await identify_tree(bright_frame_bytes)

    assert result["species"] == "Árbol desconocido"
    assert result["confidence"] == 0.0


MOCK_NARRATIVE = {
    "narrative": "Este roble milenario porta en su corteza la memoria del bosque...",
    "symmetry_index": 0.81,
    "fibonacci_alignment": "alta",
}

@pytest.mark.asyncio
async def test_scan_endpoint_returns_full_result(client, bright_frame_bytes):
    with (
        patch("app.routers.scan.identify_tree", return_value=MOCK_IDENTIFICATION) as _,
        patch("app.routers.scan.get_context", return_value="contexto botánico mock") as _,
        patch("app.routers.scan.generate_narrative", return_value=MOCK_NARRATIVE) as _,
        patch("app.routers.scan.generate_audio", return_value=b"audio") as _,
        patch("app.routers.scan.upload_file", return_value="https://storage.example.com/file") as _,
        patch("app.routers.scan.save_scan", return_value="scan-uuid-123") as _,
        patch("app.middleware.auth.settings") as mock_settings,
    ):
        from tests.conftest import make_token
        mock_settings.supabase_jwt_secret = "test-secret"
        token = make_token("test-secret")
        response = await client.post(
            "/scan",
            files={"image": ("tree.jpg", bright_frame_bytes, "image/jpeg")},
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["species"] == "Quercus robur"
    assert "narrative" in data
    assert "audio_url" in data
    assert "scan_id" in data

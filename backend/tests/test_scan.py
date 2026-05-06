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

import pytest
from unittest.mock import patch, MagicMock
from tests.conftest import make_token

TOKEN = make_token("test-secret")
AUTH = {"Authorization": f"Bearer {TOKEN}"}
SETTINGS_PATH = "app.middleware.auth.settings"
DB_PATH = "app.db._get_client"

SAMPLE_SCANS = [
    {
        "id": "scan-1",
        "species": "Quercus robur",
        "symmetry_index": 0.87,
        "image_url": "https://example.com/img1.jpg",
        "scanned_at": "2026-05-06T10:00:00",
    },
    {
        "id": "scan-2",
        "species": "Pinus sylvestris",
        "symmetry_index": 0.72,
        "image_url": "https://example.com/img2.jpg",
        "scanned_at": "2026-05-05T09:00:00",
    },
]


def _mock_supabase(data: list):
    mock_result = MagicMock()
    mock_result.data = data
    mock_client = MagicMock()
    (
        mock_client.table.return_value
        .select.return_value
        .eq.return_value
        .order.return_value
        .execute.return_value
    ) = mock_result
    return mock_client


@pytest.mark.asyncio
async def test_history_returns_scans(client):
    with patch(SETTINGS_PATH) as mock_settings, patch(DB_PATH) as mock_get_client:
        mock_settings.supabase_jwt_secret = "test-secret"
        mock_get_client.return_value = _mock_supabase(SAMPLE_SCANS)
        response = await client.get("/history", headers=AUTH)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert body[0]["species"] == "Quercus robur"
    assert body[1]["species"] == "Pinus sylvestris"


@pytest.mark.asyncio
async def test_history_empty_returns_empty_list(client):
    with patch(SETTINGS_PATH) as mock_settings, patch(DB_PATH) as mock_get_client:
        mock_settings.supabase_jwt_secret = "test-secret"
        mock_get_client.return_value = _mock_supabase([])
        response = await client.get("/history", headers=AUTH)

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_history_requires_auth(client):
    response = await client.get("/history")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_history_db_error_returns_empty_list(client):
    mock_client = MagicMock()
    (
        mock_client.table.return_value
        .select.return_value
        .eq.return_value
        .order.return_value
        .execute.side_effect
    ) = Exception("db error")

    with patch(SETTINGS_PATH) as mock_settings, patch(DB_PATH) as mock_get_client:
        mock_settings.supabase_jwt_secret = "test-secret"
        mock_get_client.return_value = mock_client
        response = await client.get("/history", headers=AUTH)

    assert response.status_code == 200
    assert response.json() == []

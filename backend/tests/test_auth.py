import pytest
from unittest.mock import patch
from tests.conftest import make_token

@pytest.mark.asyncio
async def test_missing_token_returns_401(client):
    response = await client.get("/history")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_valid_token_returns_200(client):
    token = make_token("test-secret")
    with patch("app.middleware.auth.settings") as mock_settings:
        mock_settings.supabase_jwt_secret = "test-secret"
        response = await client.get(
            "/history",
            headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_expired_token_returns_401(client):
    token = make_token("test-secret", expired=True)
    with patch("app.middleware.auth.settings") as mock_settings:
        mock_settings.supabase_jwt_secret = "test-secret"
        response = await client.get(
            "/history",
            headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 401

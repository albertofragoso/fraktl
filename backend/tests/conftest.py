import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

from jose import jwt
from datetime import datetime, timedelta

def make_token(secret: str, user_id: str = "user-123", expired: bool = False) -> str:
    exp = datetime.utcnow() + (timedelta(hours=-1) if expired else timedelta(hours=1))
    return jwt.encode(
        {"sub": user_id, "aud": "authenticated", "exp": exp},
        secret,
        algorithm="HS256"
    )

import pytest
import numpy as np
import cv2
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

@pytest.fixture
def bright_frame_bytes() -> bytes:
    # Simulate bright frame with vertical edges (tree trunk)
    img = np.ones((480, 640, 3), dtype=np.uint8) * 120
    img[:, 300:320] = 20   # dark vertical stripe = edge
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()

@pytest.fixture
def dark_frame_bytes() -> bytes:
    img = np.ones((480, 640, 3), dtype=np.uint8) * 15
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()

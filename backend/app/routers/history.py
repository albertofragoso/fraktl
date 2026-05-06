from fastapi import APIRouter, Depends
from app.middleware.auth import get_current_user
from app.db import fetch_history

router = APIRouter()

@router.get("/history")
async def get_history(user_id: str = Depends(get_current_user)):
    return fetch_history(user_id)

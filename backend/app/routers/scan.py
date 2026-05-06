from fastapi import APIRouter, UploadFile, File
from app.services.detector import is_valid_tree_frame

router = APIRouter()

@router.post("/scan/detect")
async def detect(frame: UploadFile = File(...)):
    image_bytes = await frame.read()
    valid, hint = is_valid_tree_frame(image_bytes)
    return {"valid": valid, "hint": hint}

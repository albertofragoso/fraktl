from fastapi import APIRouter, UploadFile, File, Depends
from app.services.detector import is_valid_tree_frame
from app.services.scan_pipeline import scan_pipeline
from app.middleware.auth import get_current_user

router = APIRouter()


@router.post("/scan/detect")
async def detect(frame: UploadFile = File(...)):
    image_bytes = await frame.read()
    valid, hint = is_valid_tree_frame(image_bytes)
    return {"valid": valid, "hint": hint}


@router.post("/scan")
async def scan(
    image: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    image_bytes = await image.read()
    result = await scan_pipeline.run(image_bytes, user_id)
    return result.to_response()


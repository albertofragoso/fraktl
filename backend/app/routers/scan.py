import uuid
from fastapi import APIRouter, UploadFile, File, Depends
from app.services.detector import is_valid_tree_frame
from app.services.vision import identify_tree, generate_narrative
from app.services.tts import generate_audio
from app.services.storage import upload_file
from app.rag.retriever import get_context
from app.middleware.auth import get_current_user
from app.db import save_scan

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
    file_id = str(uuid.uuid4())

    identification = await identify_tree(image_bytes)
    rag_context = get_context(identification["species"])
    narrative_data = await generate_narrative(identification, rag_context)
    audio_bytes = await generate_audio(narrative_data["narrative"])

    audio_url = upload_file("audio", f"{file_id}.mp3", audio_bytes, "audio/mpeg")
    image_url = upload_file("scans", f"{file_id}.jpg", image_bytes, "image/jpeg")

    scan_id = save_scan(user_id, {
        "species": identification["species"],
        "symmetry_index": narrative_data["symmetry_index"],
        "fibonacci_alignment": narrative_data["fibonacci_alignment"],
        "narrative": narrative_data["narrative"],
        "audio_url": audio_url,
        "image_url": image_url,
    })

    return {
        "scan_id": scan_id,
        "species": identification["species"],
        "symmetry_index": narrative_data["symmetry_index"],
        "fibonacci_alignment": narrative_data["fibonacci_alignment"],
        "narrative": narrative_data["narrative"],
        "audio_url": audio_url,
        "image_url": image_url,
    }

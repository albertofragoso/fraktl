import uuid
import logging
from dataclasses import dataclass
from typing import Callable, Literal

from fastapi import HTTPException

from app.types import StepResult

logger = logging.getLogger(__name__)

_FALLBACK_IDENTIFICATION = {
    "species": "Árbol desconocido",
    "age_estimate": "desconocido",
    "bark_type": "desconocida",
    "branching_pattern": "desconocido",
    "confidence": 0.0,
}

_FALLBACK_NARRATIVE = {
    "narrative": "Este árbol guarda en su estructura el registro silencioso del tiempo.",
    "symmetry_index": 0.5,
    "fibonacci_alignment": "media",
}


@dataclass
class ScanResult:
    scan_id: str
    species: str
    symmetry_index: float
    fibonacci_alignment: str
    narrative: str
    audio_url: str | None
    image_url: str | None
    audio_status: Literal["ok", "failed"]

    def to_response(self) -> dict:
        return {
            "scan_id": self.scan_id,
            "species": self.species,
            "symmetry_index": self.symmetry_index,
            "fibonacci_alignment": self.fibonacci_alignment,
            "narrative": self.narrative,
            "audio_url": self.audio_url,
            "image_url": self.image_url,
            "audio_status": self.audio_status,
        }


class ScanPipeline:
    def __init__(
        self,
        *,
        identify: Callable | None = None,
        get_context: Callable | None = None,
        generate_narrative: Callable | None = None,
        generate_audio: Callable | None = None,
        upload_file: Callable | None = None,
        save_scan: Callable | None = None,
    ):
        self._identify = identify or self._default_identify
        self._get_context = get_context or self._default_get_context
        self._generate_narrative = generate_narrative or self._default_generate_narrative
        self._generate_audio = generate_audio or self._default_generate_audio
        self._upload_file = upload_file or self._default_upload_file
        self._save_scan = save_scan or self._default_save_scan

    async def run(self, image_bytes: bytes, user_id: str) -> ScanResult:
        file_id = str(uuid.uuid4())

        # Step 1: identify_tree — fallback on failure
        try:
            id_result: StepResult[dict] = await self._identify(image_bytes)
        except Exception as e:
            logger.error("identify step raised", extra={"step": "identify", "error": str(e)})
            id_result = StepResult(value=None, error="internal_error")

        if not id_result.ok:
            identification = _FALLBACK_IDENTIFICATION.copy()
        else:
            identification = id_result.value

        # Step 2: get_context — continue with empty string on failure
        try:
            rag_context = self._get_context(identification["species"])
            if not isinstance(rag_context, str):
                rag_context = ""
        except Exception as e:
            logger.error("get_context step raised", extra={"step": "get_context", "error": str(e)})
            rag_context = ""

        # Step 3: generate_narrative — fallback on failure
        try:
            narr_result: StepResult[dict] = await self._generate_narrative(identification, rag_context)
        except Exception as e:
            logger.error("generate_narrative step raised", extra={"step": "generate_narrative", "error": str(e)})
            narr_result = StepResult(value=None, error="internal_error")

        if not narr_result.ok:
            narrative_data = _FALLBACK_NARRATIVE.copy()
        else:
            narrative_data = narr_result.value

        # Step 4: generate_audio — degrade on failure
        audio_bytes: bytes | None = None
        audio_status: Literal["ok", "failed"] = "ok"
        try:
            audio_result: StepResult[bytes] = await self._generate_audio(narrative_data["narrative"])
        except Exception as e:
            logger.error("generate_audio step raised", extra={"step": "generate_audio", "error": str(e)})
            audio_result = StepResult(value=None, error="internal_error")

        if not audio_result.ok:
            audio_status = "failed"
        else:
            audio_bytes = audio_result.value

        # Step 5a: upload audio — degrade on failure or if TTS failed
        audio_url: str | None = None
        if audio_bytes is not None:
            try:
                audio_upload = self._upload_file("audio", f"{file_id}.mp3", audio_bytes, "audio/mpeg")
            except Exception as e:
                logger.error("upload_file(audio) raised", extra={"step": "upload_audio", "error": str(e)})
                audio_upload = StepResult(value=None, error="internal_error")

            if audio_upload.ok:
                audio_url = audio_upload.value

        # Step 5b: upload image — degrade on failure
        image_url: str | None = None
        try:
            image_upload = self._upload_file("scans", f"{file_id}.jpg", image_bytes, "image/jpeg")
        except Exception as e:
            logger.error("upload_file(image) raised", extra={"step": "upload_image", "error": str(e)})
            image_upload = StepResult(value=None, error="internal_error")

        if image_upload.ok:
            image_url = image_upload.value

        # Step 6: save_scan — 503 on failure (not 500)
        try:
            save_result: StepResult[str] = self._save_scan(user_id, {
                "species": identification["species"],
                "symmetry_index": narrative_data["symmetry_index"],
                "fibonacci_alignment": narrative_data["fibonacci_alignment"],
                "narrative": narrative_data["narrative"],
                "audio_url": audio_url,
                "image_url": image_url,
            })
        except Exception as e:
            logger.error("save_scan step raised", extra={"step": "save_scan", "error": str(e)})
            save_result = StepResult(value=None, error="internal_error")

        if not save_result.ok:
            raise HTTPException(
                status_code=503,
                detail="Database temporarily unavailable",
                headers={"Retry-After": "30"},
            )

        return ScanResult(
            scan_id=save_result.value,
            species=identification["species"],
            symmetry_index=narrative_data["symmetry_index"],
            fibonacci_alignment=narrative_data["fibonacci_alignment"],
            narrative=narrative_data["narrative"],
            audio_url=audio_url,
            image_url=image_url,
            audio_status=audio_status,
        )

    # --- Default real implementations (used in production) ---

    async def _default_identify(self, image_bytes: bytes) -> StepResult[dict]:
        from app.services.identification import identify_tree
        return await identify_tree(image_bytes)

    def _default_get_context(self, species: str) -> str:
        from app.rag.retriever import get_context
        return get_context(species)

    async def _default_generate_narrative(self, identification: dict, rag_context: str) -> StepResult[dict]:
        from app.services.interpretation import generate_narrative
        return await generate_narrative(identification, rag_context)

    async def _default_generate_audio(self, text: str) -> StepResult[bytes]:
        from app.services.tts import generate_audio
        return await generate_audio(text)

    def _default_upload_file(self, bucket: str, path: str, data: bytes, content_type: str) -> StepResult[str]:
        from app.services.storage import upload_file
        result = upload_file(bucket, path, data, content_type)
        if result == "":
            return StepResult(value=None, error="storage_error")
        return StepResult(value=result, error=None)

    def _default_save_scan(self, user_id: str, payload: dict) -> StepResult[str]:
        from app.db import save_scan
        scan_id = save_scan(user_id, payload)
        if not scan_id:
            return StepResult(value=None, error="db_error")
        return StepResult(value=scan_id, error=None)


# Module-level singleton for production use (router imports this)
scan_pipeline = ScanPipeline()

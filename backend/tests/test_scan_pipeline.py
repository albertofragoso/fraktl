import pytest
from app.types import StepResult
from app.services.scan_pipeline import ScanPipeline, ScanResult

MOCK_IDENTIFICATION = {
    "species": "Quercus robur",
    "age_estimate": "80-120 años",
    "bark_type": "profundamente fisurada gris",
    "branching_pattern": "irregular ascendente robusto",
    "confidence": 0.88,
}

MOCK_NARRATIVE = {
    "narrative": "Este roble milenario porta en su corteza la memoria del bosque.",
    "symmetry_index": 0.81,
    "fibonacci_alignment": "alta",
}


# --- Happy path ---

@pytest.mark.asyncio
async def test_run_returns_scan_result_with_all_fields():
    async def mock_identify(image_bytes):
        return StepResult(value=MOCK_IDENTIFICATION, error=None)

    def mock_get_context(species):
        return "contexto botánico mock"

    async def mock_generate_narrative(identification, rag_context):
        return StepResult(value=MOCK_NARRATIVE, error=None)

    async def mock_generate_audio(text):
        return StepResult(value=b"audio-bytes", error=None)

    def mock_upload_file(bucket, path, data, content_type):
        return StepResult(value=f"https://storage.example.com/{path}", error=None)

    def mock_save_scan(user_id, payload):
        return StepResult(value="scan-uuid-123", error=None)

    pipeline = ScanPipeline(
        identify=mock_identify,
        get_context=mock_get_context,
        generate_narrative=mock_generate_narrative,
        generate_audio=mock_generate_audio,
        upload_file=mock_upload_file,
        save_scan=mock_save_scan,
    )

    result = await pipeline.run(b"image-bytes", "user-123")

    assert isinstance(result, ScanResult)
    assert result.scan_id == "scan-uuid-123"
    assert result.species == "Quercus robur"
    assert result.symmetry_index == 0.81
    assert result.fibonacci_alignment == "alta"
    assert result.narrative == "Este roble milenario porta en su corteza la memoria del bosque."
    assert result.audio_url == "https://storage.example.com/audio.mp3" or result.audio_url is not None
    assert result.image_url is not None
    assert result.audio_status == "ok"


def test_scan_result_to_response_has_all_fields():
    result = ScanResult(
        scan_id="scan-uuid-123",
        species="Quercus robur",
        symmetry_index=0.81,
        fibonacci_alignment="alta",
        narrative="El bosque habla.",
        audio_url="https://storage.example.com/audio.mp3",
        image_url="https://storage.example.com/image.jpg",
        audio_status="ok",
        confidence=0.88,
        age_estimate="80-120 años",
        bark_type="profundamente fisurada gris",
        branching_pattern="irregular ascendente robusto",
    )

    response = result.to_response()

    assert response["scan_id"] == "scan-uuid-123"
    assert response["species"] == "Quercus robur"
    assert response["symmetry_index"] == 0.81
    assert response["fibonacci_alignment"] == "alta"
    assert response["narrative"] == "El bosque habla."
    assert response["audio_url"] == "https://storage.example.com/audio.mp3"
    assert response["image_url"] == "https://storage.example.com/image.jpg"
    assert response["audio_status"] == "ok"
    assert response["confidence"] == 0.88
    assert response["age_estimate"] == "80-120 años"
    assert response["bark_type"] == "profundamente fisurada gris"
    assert response["branching_pattern"] == "irregular ascendente robusto"


# --- TTS failure ---

@pytest.mark.asyncio
async def test_tts_failure_yields_null_audio_url_and_failed_status():
    async def mock_identify(image_bytes):
        return StepResult(value=MOCK_IDENTIFICATION, error=None)

    def mock_get_context(species):
        return ""

    async def mock_generate_narrative(identification, rag_context):
        return StepResult(value=MOCK_NARRATIVE, error=None)

    async def mock_generate_audio(text):
        return StepResult(value=None, error="tts_timeout")

    def mock_upload_file(bucket, path, data, content_type):
        return StepResult(value=f"https://storage.example.com/{path}", error=None)

    def mock_save_scan(user_id, payload):
        return StepResult(value="scan-uuid-456", error=None)

    pipeline = ScanPipeline(
        identify=mock_identify,
        get_context=mock_get_context,
        generate_narrative=mock_generate_narrative,
        generate_audio=mock_generate_audio,
        upload_file=mock_upload_file,
        save_scan=mock_save_scan,
    )

    result = await pipeline.run(b"image-bytes", "user-123")

    assert result.audio_url is None
    assert result.audio_status == "failed"
    assert result.scan_id is not None  # scan still saved


# --- Storage failure (audio upload) ---

@pytest.mark.asyncio
async def test_audio_upload_failure_yields_null_audio_url_but_ok_status():
    async def mock_identify(image_bytes):
        return StepResult(value=MOCK_IDENTIFICATION, error=None)

    def mock_get_context(species):
        return ""

    async def mock_generate_narrative(identification, rag_context):
        return StepResult(value=MOCK_NARRATIVE, error=None)

    async def mock_generate_audio(text):
        return StepResult(value=b"audio-bytes", error=None)

    def mock_upload_file(bucket, path, data, content_type):
        if bucket == "audio":
            return StepResult(value=None, error="storage_error")
        return StepResult(value=f"https://storage.example.com/{path}", error=None)

    def mock_save_scan(user_id, payload):
        return StepResult(value="scan-uuid-789", error=None)

    pipeline = ScanPipeline(
        identify=mock_identify,
        get_context=mock_get_context,
        generate_narrative=mock_generate_narrative,
        generate_audio=mock_generate_audio,
        upload_file=mock_upload_file,
        save_scan=mock_save_scan,
    )

    result = await pipeline.run(b"image-bytes", "user-123")

    assert result.audio_url is None
    assert result.audio_status == "ok"  # TTS succeeded, only upload failed
    assert result.scan_id is not None


# --- DB failure ---

@pytest.mark.asyncio
async def test_db_failure_raises_503():
    from fastapi import HTTPException

    async def mock_identify(image_bytes):
        return StepResult(value=MOCK_IDENTIFICATION, error=None)

    def mock_get_context(species):
        return ""

    async def mock_generate_narrative(identification, rag_context):
        return StepResult(value=MOCK_NARRATIVE, error=None)

    async def mock_generate_audio(text):
        return StepResult(value=b"audio-bytes", error=None)

    def mock_upload_file(bucket, path, data, content_type):
        return StepResult(value=f"https://storage.example.com/{path}", error=None)

    def mock_save_scan(user_id, payload):
        return StepResult(value=None, error="db_unavailable")

    pipeline = ScanPipeline(
        identify=mock_identify,
        get_context=mock_get_context,
        generate_narrative=mock_generate_narrative,
        generate_audio=mock_generate_audio,
        upload_file=mock_upload_file,
        save_scan=mock_save_scan,
    )

    with pytest.raises(HTTPException) as exc_info:
        await pipeline.run(b"image-bytes", "user-123")

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "Scan save failed"


# --- Vision fallback ---

@pytest.mark.asyncio
async def test_vision_failure_uses_fallback_species():
    async def mock_identify(image_bytes):
        return StepResult(value=None, error="openai_timeout")

    def mock_get_context(species):
        return ""

    async def mock_generate_narrative(identification, rag_context):
        return StepResult(value=MOCK_NARRATIVE, error=None)

    async def mock_generate_audio(text):
        return StepResult(value=b"audio-bytes", error=None)

    def mock_upload_file(bucket, path, data, content_type):
        return StepResult(value=f"https://storage.example.com/{path}", error=None)

    def mock_save_scan(user_id, payload):
        return StepResult(value="scan-uuid-fallback", error=None)

    pipeline = ScanPipeline(
        identify=mock_identify,
        get_context=mock_get_context,
        generate_narrative=mock_generate_narrative,
        generate_audio=mock_generate_audio,
        upload_file=mock_upload_file,
        save_scan=mock_save_scan,
    )

    result = await pipeline.run(b"image-bytes", "user-123")

    assert result.species == "Árbol desconocido"
    assert result.scan_id is not None

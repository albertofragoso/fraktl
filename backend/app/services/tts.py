from openai import AsyncOpenAI
from app.config import settings
from app.types import StepResult

openai_client = AsyncOpenAI(api_key=settings.openai_api_key)


async def generate_audio(text: str) -> StepResult[bytes]:
    try:
        response = await openai_client.audio.speech.create(
            model="tts-1",
            voice="nova",
            input=text,
        )
        return StepResult(value=response.content, error=None)
    except Exception as e:
        return StepResult(value=None, error=f"tts_error:{e}")

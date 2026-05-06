from app.services.vision import openai_client

async def generate_audio(text: str) -> bytes:
    try:
        response = await openai_client.audio.speech.create(
            model="tts-1",
            voice="nova",
            input=text,
        )
        return response.content
    except Exception:
        return b""

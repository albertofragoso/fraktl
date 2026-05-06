import base64
import json
from openai import AsyncOpenAI
from app.config import settings
from app.prompts.identify import IDENTIFY_PROMPT

openai_client = AsyncOpenAI(api_key=settings.openai_api_key)

_FALLBACK_IDENTIFICATION = {
    "species": "Árbol desconocido",
    "age_estimate": "desconocido",
    "bark_type": "desconocida",
    "branching_pattern": "desconocido",
    "confidence": 0.0,
}

async def identify_tree(image_bytes: bytes) -> dict:
    b64 = base64.b64encode(image_bytes).decode()
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                    {"type": "text", "text": IDENTIFY_PROMPT},
                ],
            }],
            response_format={"type": "json_object"},
            max_tokens=300,
        )
        return json.loads(response.choices[0].message.content)
    except (json.JSONDecodeError, Exception):
        return _FALLBACK_IDENTIFICATION.copy()

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


import json as _json
from app.prompts.narrate import NARRATE_PROMPT

_FALLBACK_NARRATIVE = {
    "narrative": "Este árbol guarda en su estructura el registro silencioso del tiempo.",
    "symmetry_index": 0.5,
    "fibonacci_alignment": "media",
}

async def generate_narrative(identification: dict, rag_context: str) -> dict:
    prompt = NARRATE_PROMPT.format(
        identification=_json.dumps(identification, ensure_ascii=False),
        rag_context=rag_context,
    )
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",  # vision not needed here; mini is ~10x cheaper
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=400,
        )
        return _json.loads(response.choices[0].message.content)
    except Exception:
        return _FALLBACK_NARRATIVE.copy()

import base64
import json
from openai import AsyncOpenAI
from app.config import settings
from app.prompts.identify import IDENTIFY_PROMPT
from app.types import StepResult

openai_client = AsyncOpenAI(api_key=settings.openai_api_key)


async def identify_tree(image_bytes: bytes) -> StepResult[dict]:
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
        data = json.loads(response.choices[0].message.content)
        return StepResult(value=data, error=None)
    except json.JSONDecodeError as e:
        return StepResult(value=None, error=f"bad_json:{e}")
    except Exception as e:
        return StepResult(value=None, error=f"api_error:{e}")

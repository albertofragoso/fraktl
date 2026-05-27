import json
from openai import AsyncOpenAI
from app.config import settings
from app.prompts.narrate import NARRATE_PROMPT
from app.types import StepResult

openai_client = AsyncOpenAI(api_key=settings.openai_api_key)


async def generate_narrative(identification: dict, rag_context: str) -> StepResult[dict]:
    prompt = NARRATE_PROMPT.format(
        identification=json.dumps(identification, ensure_ascii=False),
        rag_context=rag_context,
    )
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=400,
        )
        data = json.loads(response.choices[0].message.content)
        return StepResult(value=data, error=None)
    except json.JSONDecodeError as e:
        return StepResult(value=None, error=f"bad_json:{e}")
    except Exception as e:
        return StepResult(value=None, error=f"api_error:{e}")

# Issue 03 — Split `vision.py` → `identification.py` + `interpretation.py`; fix `tts.py` client leak

**Type:** AFK  
**Blocked by:** Issue 02 (`StepResult[T]` must exist)  
**User stories:** #5, #6, #7

---

## What to build

Split `vision.py` into two focused modules and fix the cross-module client import in `tts.py`. This eliminates the seam leak where `tts.py` imports `openai_client` from `vision.py`, and separates two unrelated AI operations that happen to share an OpenAI client by accident.

**`identification.py`:** owns `identify_tree(image_bytes: bytes) -> StepResult[dict]`. Uses GPT-4o Vision (multimodal). Imports only its own prompt template (`prompts/identify.py`). Initializes its own `AsyncOpenAI` client. Moves `_FALLBACK_IDENTIFICATION` from `vision.py`.

**`interpretation.py`:** owns `generate_narrative(identification: dict, rag_context: str) -> StepResult[dict]`. Uses GPT-4o-mini (text only). Imports only its own prompt template (`prompts/narrate.py`). Initializes its own `AsyncOpenAI` client. Moves `_FALLBACK_NARRATIVE` from `vision.py`.

**`tts.py`:** remove `from app.services.vision import openai_client`; initialize `AsyncOpenAI(api_key=settings.openai_api_key)` directly.

**`vision.py`:** delete the file after contents are fully migrated.

**Critical — test patch path audit:** Before splitting, run `grep -r "patch.*vision" backend/tests/` to inventory all tests that mock `app.services.vision.openai_client`. Update every patch path in the same commit as the split (`app.services.identification.openai_client`, `app.services.interpretation.openai_client`). Add `mock_client.assert_called()` or equivalent in each affected test to ensure the mock is actually intercepting calls — a patch targeting a non-existent module applies silently without error.

## Acceptance criteria

- [ ] `identification.py` exists with `identify_tree(image_bytes) -> StepResult[dict]`; returns `StepResult(None, reason)` on API exception or bad JSON (not fallback dict silently)
- [ ] `interpretation.py` exists with `generate_narrative(identification, rag_context) -> StepResult[dict]`; returns `StepResult(None, reason)` on exception
- [ ] `tts.py` no longer imports from `vision.py`; owns its own `AsyncOpenAI` client; `generate_audio` returns `StepResult[bytes]`
- [ ] `vision.py` is deleted; no remaining imports of `app.services.vision` anywhere in the codebase
- [ ] All test patch paths updated from `app.services.vision.*` to the correct new module paths
- [ ] Each affected test has an assertion confirming the mock was called (not silently dead)
- [ ] All existing tests pass: `pytest tests/ -v`

## Blocked by

- Issue 02 — `StepResult[T]` must be importable from `app.types`

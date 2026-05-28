# Backend — CLAUDE.md

> For project-wide context see the root `../CLAUDE.md`.  
> Detailed docs: [Architecture](../docs/architecture.md) | [API Reference](../docs/api-reference.md) | [Style Guide](../docs/style-guide.md) | [RAG Corpus Guide](../docs/rag-corpus-guide.md) | [Deployment](../docs/deployment.md)

---

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Seed RAG corpus (auto-runs on startup if ChromaDB empty)
python scripts/seed_rag.py

# Dev server
uvicorn app.main:app --reload --port 8000

# Tests
pytest tests/ -v
```

**Required env file:** `backend/.env` (see root CLAUDE.md for vars)

---

## Project Layout

```
backend/
├── app/
│   ├── main.py            # FastAPI app + lifespan (triggers RAG seed)
│   ├── config.py          # pydantic-settings — all env vars loaded here
│   ├── db.py              # Supabase PostgreSQL: save_scan, fetch_history
│   ├── middleware/
│   │   └── auth.py        # get_current_user dependency (JWT → user_id)
│   ├── routers/
│   │   ├── scan.py        # POST /scan/detect  POST /scan
│   │   └── history.py     # GET /history
│   ├── services/
│   │   ├── detector.py    # OpenCV heuristics (brightness, edges, blur)
│   │   ├── vision.py      # identify_tree() via GPT-4o Vision + generate_narrative() via GPT-4o-mini
│   │   ├── tts.py         # generate_audio() via OpenAI TTS
│   │   └── storage.py     # upload_file() to Supabase Storage buckets
│   ├── rag/
│   │   ├── retriever.py   # ChromaDB vectorstore + get_context(species)
│   │   └── corpus/
│   │       └── fraktl_base.json  # Fraktl's own species signatures (editable)
│   └── prompts/
│       ├── identify.py    # Prompt for GPT-4o call 1 (species ID)
│       └── narrate.py     # Prompt for GPT-4o call 2 (biosemiotic narrative)
├── scripts/
│   └── seed_rag.py        # Index Wikipedia + fraktl_base.json into ChromaDB
├── tests/
│   ├── conftest.py        # AsyncClient fixture + image fixtures
│   ├── test_health.py
│   ├── test_auth.py
│   ├── test_detect.py
│   ├── test_scan.py
│   ├── test_history.py
│   └── test_rag.py
├── pytest.ini             # asyncio_mode = auto
├── Dockerfile
└── railway.toml           # Persistent volume for chroma_db/
```

---

## Adding a New Route

1. Create `app/routers/my_route.py` with an `APIRouter`
2. Import and register in `app/main.py`: `app.include_router(my_route.router)`
3. Protect with auth: `user_id: str = Depends(get_current_user)`
4. Write tests in `tests/test_my_route.py` using the `client` fixture

---

## Testing Patterns

```python
# Async endpoint test
@pytest.mark.asyncio
async def test_my_endpoint(client):
    response = await client.get("/my-route", headers={"Authorization": "Bearer mock"})
    assert response.status_code == 200

# Mock OpenAI call
from unittest.mock import patch, AsyncMock

with patch("app.services.vision.openai_client.chat.completions.create") as mock:
    mock.return_value = AsyncMock(...)
    ...

# Mock Supabase
with patch("app.db._supabase") as mock_sb:
    mock_sb.table.return_value.select.return_value... = MagicMock(data=[...])
    ...
```

**JWT in tests:** use `app/middleware/auth.py` `make_token()` helper (see `tests/test_auth.py`) — never hardcode a real token.

---

## RAG Corpus

- `app/rag/corpus/fraktl_base.json` — Fraktl's proprietary species signatures. Edit here to change the "energetic" narrative tone for any species.
- After editing the corpus, re-seed: `python scripts/seed_rag.py` (it upserts).
- Wikipedia content is fetched at seed time via `WikipediaLoader`. No files to edit.
- ChromaDB persists at `chroma_db/` (gitignored). Delete this folder to force a full re-seed.

---

## Prompt Tuning

Edit `app/prompts/identify.py` or `app/prompts/narrate.py` to change the tone, language, or output schema of VLM responses. No code changes needed.

- `identify.py` controls what structured data is extracted from the tree image (species, age, bark type, branching pattern).
- `narrate.py` receives the identification JSON + RAG context and produces the biosemiotic narrative. Tune here to adjust poetry level, length, or language.

---

## Key Constraints

- `POST /scan/detect` must **never** call OpenAI — heuristics only (OpenCV). Latency target: <200ms.
- All generated files (audio, images) go to **Supabase Storage** — FastAPI does not serve static files.
- ChromaDB is process-local. Do not share state between workers; Railway is configured for single-worker.

---

## Architecture Conventions

> Derived from the architecture review of 2026-05-27. These are enforced going forward — not aspirational.

### One module = one concern

If two functions only share an HTTP client, they do not belong in the same module. Sharing an import is not the same as sharing a responsibility.

| Module | Owns |
|---|---|
| `identification.py` | GPT-4o Vision calls, species ID only |
| `interpretation.py` | GPT-4o-mini + RAG context, narrative generation only |
| `tts.py` | Audio synthesis only |
| `storage.py` | File uploads to Supabase Storage only |
| `db.py` | PostgreSQL reads and writes only |

**Each module initializes its own external client.** Never import a client (`openai_client`, etc.) from another service module. Client initialization is cheap; coupling is not.

```python
# CORRECT — tts.py owns its client
from openai import AsyncOpenAI
_client = AsyncOpenAI(api_key=settings.openai_api_key)

# WRONG — seam leak
from app.services.identification import openai_client
```

### Typed results — `StepResult[T]`

Every service function that can fail returns `StepResult[T]` (from `app/types.py`). Never return zero values (`""`, `b""`, `None`) to signal failure — the caller cannot distinguish failure from a valid empty result.

```python
# CORRECT
async def generate_audio(text: str) -> StepResult[bytes]:
    try:
        return StepResult(value=audio_bytes, error=None)
    except Exception as e:
        return StepResult(value=None, error=str(e))

# WRONG
async def generate_audio(text: str) -> bytes:
    try: ...
    except Exception:
        return b""  # caller can't tell this from real silence
```

Never swallow exceptions with bare `pass`. If caught, surface via `StepResult.error` or re-raise.

**Zero-value contract:**

| Field | Failure signal |
|---|---|
| URL (`str`) | `StepResult(None, reason)` — never `""` |
| Audio (`bytes`) | `StepResult(None, reason)` — never `b""` |
| Scan ID (`str`) | `StepResult(None, reason)` — never a UUID for a non-existent record |

### Pipelines, not routers

Any sequence of 3+ service calls lives in a dedicated pipeline module — not inline in a router.

```python
# CORRECT — router is thin
@router.post("/scan")
async def scan(image: UploadFile, user_id: str = Depends(get_current_user)):
    result = await scan_pipeline.run(await image.read(), user_id)
    return result.to_response()
```

**Routers own only:** request parsing, auth injection, response serialization.  
**Pipelines own:** step ordering, degradation policy, error propagation decisions.

Services report failure via `StepResult`. They never decide what to do about it — that is the pipeline's job.

**Scan pipeline degradation policy:**

| Step failure | Policy |
|---|---|
| `identify_tree` fails | Use fallback identification; continue |
| `get_context` fails | Continue with empty context |
| `generate_narrative` fails | Use fallback narrative; continue |
| `generate_audio` fails | `audio_url: null` in response; continue |
| `upload_file` fails | Corresponding URL is `null`; continue |
| `save_scan` fails | HTTP 500 — never return a phantom `scan_id` |

### API response contracts

- `audio_url` and `image_url` are `str | null` — `null` means upload failed, never `""`
- `scan_id` is only present if the DB write succeeded
- Do not rename response fields without a versioning discussion — the Expo app depends on exact field names

### Testing layering

Test external behavior through module interfaces, not internal implementation. Patching `openai_client.chat.completions.create` directly is testing implementation. Injecting a mock `identification` function into `ScanPipeline` is testing behavior. Prefer the latter.

| Layer | Mock | Assert |
|---|---|---|
| Service unit | External SDK client only | `StepResult.ok`, `.value`, `.error` |
| Pipeline unit | Each service function | Step ordering, degradation per failure mode |
| Router integration | `scan_pipeline.run` (one seam) | HTTP status, response field presence |

**Every failure mode in the scan pipeline must have a test:**
- TTS failure → 200, `audio_url: null`
- Storage failure → 200, `image_url: null`
- DB failure → 500, no `scan_id`
- Vision fallback → 200, `species: "Árbol desconocido"`

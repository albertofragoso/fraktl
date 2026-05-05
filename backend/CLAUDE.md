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
│   │   ├── vision.py      # identify_tree() + generate_narrative() via GPT-4o
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

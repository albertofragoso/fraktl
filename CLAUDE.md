# Fraktl — CLAUDE.md

Project documentation for agents and developers.

---

## Description

Fraktl is a mobile app that scans trees with the camera, analyzes the image with GPT-4o Vision, queries a botanical RAG (LangChain + ChromaDB), and delivers a biosemiotic interpretation in text + audio (OpenAI TTS). Auth via Supabase (Google OAuth). Deployed on Railway via Docker.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | Expo + React Native (TypeScript) |
| Backend API | Python 3.12, FastAPI, Uvicorn |
| Vision AI | OpenAI GPT-4o Vision |
| RAG | LangChain + ChromaDB (local vector store) |
| TTS | OpenAI TTS API |
| Auth | Supabase (Google OAuth + JWT) |
| Storage | Supabase Storage (uploaded tree images) |
| Deploy | Railway (Docker) |

---

## Repository Structure

```
fraktl/
├── CLAUDE.md                  # This file
├── PRD.md                     # Product requirements
├── .gitignore
├── docs/                      # Architecture notes, ADRs
├── app/                       # Expo React Native app
│   └── ...
└── backend/
    ├── requirements.txt
    ├── scripts/               # One-off scripts (corpus ingestion, etc.)
    ├── tests/                 # pytest test suite
    └── app/
        ├── main.py            # FastAPI entry point
        ├── config.py          # pydantic-settings config
        ├── middleware/        # Auth middleware, CORS
        ├── routers/           # Route handlers (scan, audio, health)
        ├── services/          # Business logic (vision, tts, supabase)
        ├── rag/               # RAG pipeline
        │   ├── corpus/        # Raw botanical text corpus
        │   ├── ingest.py      # Corpus ingestion → ChromaDB
        │   └── retriever.py   # LangChain retriever wrapper
        └── prompts/           # Prompt templates (biosemiotic interpretation)
```

---

## Development Commands

### Backend

```bash
# Install deps (from backend/)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Seed the RAG corpus (run once after cloning)
python scripts/seed_rag.py

# Run dev server (from backend/)
uvicorn app.main:app --reload --port 8000

# Run tests
pytest tests/ -v
```

Note: the RAG seed also runs automatically on backend startup if ChromaDB is empty.

### Mobile App

```bash
# From app/
npm install
npx expo start
```

---

## Environment Variables

### Backend (`backend/.env`, never commit)

```
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=...
SUPABASE_JWT_SECRET=...

# App
ENVIRONMENT=development   # development | production
```

### Mobile App (`app/.env.local`, never commit)

```
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# API
EXPO_PUBLIC_API_URL=http://localhost:8000
```

---

## Data Flow (End-to-End)

```
Image (camera) 
  → POST /scan/detect (heuristic validation, no AI)
    → if valid → GPT-4o Vision (species identification + visual analysis)
      → ChromaDB RAG retrieval (botanical context + properties)
        → GPT-4o (biosemiotic narrative generation)
          → OpenAI TTS (audio synthesis)
            → Supabase Storage (persist audio + metadata)
              → response to client (audio URL + text)
```

---

## Key Architecture Decisions

### RAG: LangChain + ChromaDB
- Botanical corpus stored as text files in `backend/app/rag/corpus/`
- Ingested once via `backend/scripts/ingest_corpus.py` → persisted in `chroma_db/` (gitignored)
- At query time, retriever fetches top-k chunks relevant to the identified species
- Chunks + GPT-4o vision analysis fed into biosemiotic interpretation prompt

### `/scan/detect` — No custom ML model
- Tree species identification is delegated entirely to GPT-4o Vision
- No custom CV model to train or host; faster iteration, lower infra cost
- If accuracy proves insufficient, Pl@ntNet API is the planned fallback

### Supabase — Auth + Storage
- Google OAuth handled via Supabase; JWT passed in `Authorization: Bearer` header
- Uploaded images stored in Supabase Storage bucket `tree-scans`
- `supabase` Python SDK used on backend to verify JWT and manage storage

### Docker / Railway Deploy
- Single `backend/Dockerfile` builds the FastAPI app
- `chroma_db/` volume mounted or rebuilt from corpus on cold start
- Env vars injected via Railway project variables

---

## Implementation Notes

- **Frontend UI**: invoke the `frontend-design` skill for any UI component work to get production-grade React Native screens.
- **Parallel development**: use git worktrees (`superpowers:using-git-worktrees` skill) to develop backend and frontend features in parallel without branch conflicts.
- **Corpus ingestion**: run `python scripts/ingest_corpus.py` once after cloning to build the local ChromaDB. Do not commit `chroma_db/`.
- **Prompt templates**: biosemiotic interpretation prompts live in `backend/app/prompts/`. Edit these to tune the tone/depth of tree interpretations without touching application code.
- **Testing**: all route handlers should have corresponding tests in `backend/tests/`. Use `pytest-asyncio` for async FastAPI tests with `httpx.AsyncClient`.

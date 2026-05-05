# Fraktl — Architecture

> Related: [API Reference](./api-reference.md) | [RAG Corpus Guide](./rag-corpus-guide.md) | [Deployment](./deployment.md)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Expo (React Native)                       │
│                                                             │
│  AuthScreen → HomeScreen → ScanScreen → ResultScreen        │
│                                 ↕                           │
│              HistoryScreen ←────┘                           │
│                                                             │
│  lib/supabase.ts (auth)   hooks/useFrameDetection.ts        │
└───────────────────┬────────────────────────────────────────┘
                    │ HTTPS + JWT (Supabase Bearer token)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  FastAPI (Docker / Railway)                  │
│                                                             │
│  POST /scan/detect ──► services/detector.py (OpenCV)        │
│  POST /scan        ──► services/vision.py (GPT-4o x2)       │
│                    ──► rag/retriever.py (ChromaDB)          │
│                    ──► services/tts.py (OpenAI TTS)         │
│                    ──► services/storage.py (Supabase)       │
│                    ──► db.py (save_scan)                    │
│  GET  /history     ──► db.py (fetch_history)                │
│                                                             │
│  middleware/auth.py validates JWT on every protected route  │
└──────────┬──────────────────────┬───────────────────────────┘
           │                      │
           ▼                      ▼
    Supabase                 OpenAI API
    ├── Auth (JWT)           ├── GPT-4o Vision (2 calls/scan)
    ├── PostgreSQL           └── TTS (1 call/scan)
    └── Storage
         ├── bucket: scans   ChromaDB (persistent volume)
         └── bucket: audio   └── LangChain retriever
```

---

## Component Responsibilities

### Frontend (Expo)

| File | Responsibility |
|---|---|
| `app/_layout.tsx` | Root auth guard — redirects unauthenticated users to `(auth)` |
| `app/(auth)/index.tsx` | Google OAuth via Supabase + expo-auth-session |
| `app/(app)/scan.tsx` | Camera viewfinder + auto-capture trigger |
| `app/(app)/result.tsx` | Displays narrative, metrics, audio player |
| `app/(app)/history.tsx` | Paginated list of user scans from `/history` |
| `hooks/useFrameDetection.ts` | 1s polling loop to `/scan/detect`; fires `onValidFrame` callback |
| `lib/supabase.ts` | Supabase client with SecureStore session persistence |

### Backend (FastAPI)

| File | Responsibility |
|---|---|
| `app/main.py` | FastAPI app, lifespan (RAG seed on cold start) |
| `app/config.py` | All env vars via pydantic-settings |
| `app/middleware/auth.py` | Decodes Supabase JWT → `user_id` string |
| `app/routers/scan.py` | `/scan/detect` (heuristic) and `/scan` (full pipeline) |
| `app/routers/history.py` | `/history` — user's past scans |
| `app/services/detector.py` | OpenCV heuristics: brightness, blur, edge ratio |
| `app/services/vision.py` | `identify_tree()` and `generate_narrative()` via GPT-4o |
| `app/services/tts.py` | `generate_audio()` via OpenAI TTS → bytes |
| `app/services/storage.py` | `upload_file()` to Supabase Storage → public URL |
| `app/db.py` | `save_scan()` and `fetch_history()` via Supabase client |
| `app/rag/retriever.py` | ChromaDB vectorstore + `get_context(species)` |
| `app/prompts/identify.py` | Prompt for GPT-4o call 1 (structured species ID) |
| `app/prompts/narrate.py` | Prompt for GPT-4o call 2 (biosemiotic narrative) |
| `scripts/seed_rag.py` | One-time corpus indexing (Wikipedia + fraktl_base.json) |

---

## Data Flow — Full Scan

```
1. ScanScreen: expo-camera captures frame every 1s
2. → POST /scan/detect (JPEG, ~30KB)
        ↓ OpenCV: brightness > 40, blur var > 50, edge ratio > 5%
        ↓ returns { valid: bool, hint: string } in <200ms, NO AI call
3. If valid → POST /scan (full image, ~500KB)
        ↓ middleware/auth.py: decode JWT → user_id
        ↓ services/vision.py: identify_tree()
              → GPT-4o Vision call 1
              → returns { species, age_estimate, bark_type, branching_pattern }
        ↓ rag/retriever.py: get_context(species)
              → ChromaDB similarity search (k=4 chunks)
              → returns botanical text context
        ↓ services/vision.py: generate_narrative(identification, rag_context)
              → GPT-4o call 2 with enriched prompt
              → returns { narrative, symmetry_index, fibonacci_alignment }
        ↓ services/tts.py: generate_audio(narrative)
              → OpenAI TTS → audio bytes
        ↓ services/storage.py: upload_file(audio) + upload_file(image)
              → Supabase Storage → public URLs
        ↓ db.py: save_scan(user_id, {...})
              → PostgreSQL insert
        ↓ returns JSON to client
4. ResultScreen: renders text immediately, loads audio from URL
```

**Typical latency:** 8–15s total (dominated by GPT-4o x2 + TTS)

---

## Database Schema

```sql
-- Managed by Supabase Auth
-- auth.users (id, email, created_at, ...)

create table scans (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users not null,
  species             text,
  symmetry_index      float,            -- 0.0–1.0
  fibonacci_alignment text,             -- 'alta' | 'media' | 'baja'
  narrative           text,
  audio_url           text,             -- Supabase Storage public URL
  image_url           text,             -- Supabase Storage public URL
  resonance_score     int check (resonance_score between 1 and 5),  -- Phase 2
  hrv_delta           float,            -- Phase 3: rPPG measurement
  scanned_at          timestamptz default now()
);

create index scans_user_id_idx on scans(user_id);
create index scans_species_idx on scans(species);  -- Phase 4: resonance network
```

---

## Authentication Flow

```
Expo app → Supabase Google OAuth → Supabase issues JWT
JWT stored in SecureStore via supabase.ts

Every backend request:
  Authorization: Bearer <supabase_jwt>
  → middleware/auth.py decodes with SUPABASE_JWT_SECRET (HS256, aud="authenticated")
  → returns user_id (UUID) to route handler
```

---

## RAG Architecture

See [RAG Corpus Guide](./rag-corpus-guide.md) for corpus management.

```
ChromaDB collection: "fraktl_corpus"
Embedding model: text-embedding-3-small (OpenAI)
Chunk size: 500 tokens, overlap: 50
Retrieval: top-4 chunks by cosine similarity

Sources indexed:
  1. Wikipedia botanical articles (via WikipediaLoader)
  2. GBIF species data (via JSONLoader)
  3. fraktl_base.json — proprietary species signatures (Fraktl's moat)

Query: species name + structural characteristics
→ chunks injected into narrate.py prompt before GPT-4o call 2
```

---

## Post-MVP Phases

| Phase | Feature | Key Technical Change |
|---|---|---|
| **2** | Sacred geometry overlay + resonance feedback | `/scan` returns `geometry_overlay_url`; new `resonance_score` field activated |
| **3** | HRV measurement via rPPG (front camera) | New `/hrv` endpoint; rPPG Python lib; `hrv_delta` field activated |
| **4** | Resonance network (tree as social node) | New `/tree/:id/resonances` endpoint; geo-matching query |

---

## Key Constraints

- `/scan/detect` must respond in **<200ms** — zero AI calls, heuristics only
- FastAPI does **not** serve static files — all media via Supabase Storage URLs
- ChromaDB is **process-local** — Railway configured for single-worker
- `chroma_db/` dir is **gitignored** — rebuilt from corpus on cold start via lifespan seed

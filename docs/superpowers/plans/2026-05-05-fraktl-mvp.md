# Fraktl MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Git Worktrees:** After Task 4 (project setup), invoke `superpowers:using-git-worktrees` para crear worktrees independientes para `backend` y `frontend`. Ambos subsistemas pueden implementarse en paralelo a partir de ese punto.

> **Frontend Design:** Antes de cada tarea de pantalla (Tasks 13-19), invocar el skill `frontend-design` para guiar decisiones visuales.

**Goal:** Construir el MVP de Fraktl — escaneo automático de árboles vía cámara, análisis VLM con RAG botánico, e interpretación biosemiótica entregada como texto y audio.

**Architecture:** Expo app → FastAPI (Docker/Railway) → GPT-4o Vision (x2 llamadas) + ChromaDB RAG (LangChain) + OpenAI TTS. Auth y storage via Supabase.

**Tech Stack:** Python 3.12, FastAPI, LangChain, ChromaDB, OpenCV, OpenAI SDK, Supabase, Expo (React Native), expo-camera, expo-av, expo-auth-session.

---

## Mapa de Archivos

```
fraktl/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app + lifespan (seed RAG)
│   │   ├── config.py                  # Settings (env vars)
│   │   ├── middleware/
│   │   │   └── auth.py                # JWT verification (Supabase)
│   │   ├── routers/
│   │   │   ├── scan.py                # POST /scan/detect + POST /scan
│   │   │   └── history.py             # GET /history
│   │   ├── rag/
│   │   │   ├── retriever.py           # ChromaDB + LangChain retriever
│   │   │   └── corpus/
│   │   │       └── fraktl_base.json   # Base propia Fraktl por especie
│   │   ├── prompts/
│   │   │   ├── identify.py            # Prompt llamada 1 (identificación)
│   │   │   └── narrate.py             # Prompt llamada 2 (narrativa RAG)
│   │   ├── services/
│   │   │   ├── vision.py              # GPT-4o Vision calls
│   │   │   ├── tts.py                 # OpenAI TTS
│   │   │   ├── storage.py             # Supabase Storage upload
│   │   │   └── detector.py            # Heurística OpenCV para /scan/detect
│   │   └── db.py                      # Supabase PostgreSQL client
│   ├── scripts/
│   │   └── seed_rag.py                # Indexa corpus inicial en ChromaDB
│   ├── tests/
│   │   ├── conftest.py                # AsyncClient fixture + mocks
│   │   ├── test_detect.py             # Tests /scan/detect
│   │   ├── test_scan.py               # Tests /scan
│   │   ├── test_history.py            # Tests /history
│   │   └── test_rag.py                # Tests retriever
│   ├── Dockerfile
│   ├── railway.toml
│   └── requirements.txt
│
└── app/                               # Expo React Native
    ├── app/
    │   ├── _layout.tsx                # Root layout + auth guard
    │   ├── (auth)/
    │   │   └── index.tsx              # AuthScreen
    │   └── (app)/
    │       ├── _layout.tsx            # Stack navigator
    │       ├── index.tsx              # HomeScreen
    │       ├── scan.tsx               # ScanScreen
    │       ├── result.tsx             # ResultScreen
    │       └── history.tsx            # HistoryScreen
    ├── components/
    │   ├── ScanOverlay.tsx            # Guía de encuadre + hint
    │   └── AudioPlayer.tsx            # Player play/pause + barra
    ├── hooks/
    │   └── useFrameDetection.ts       # Polling + auto-captura
    ├── lib/
    │   └── supabase.ts                # Supabase client (SecureStore)
    ├── constants/
    │   └── api.ts                     # API_URL
    └── package.json
```

---

## Task 1: Estructura del monorepo + git

**Files:**
- Create: `backend/requirements.txt`
- Create: `.gitignore`

- [ ] **Step 1: Crear estructura de directorios**

```bash
mkdir -p fraktl/backend/app/{middleware,routers,rag/corpus,prompts,services} \
         fraktl/backend/scripts \
         fraktl/backend/tests \
         fraktl/app/app/\(auth\) \
         fraktl/app/app/\(app\) \
         fraktl/app/{components,hooks,lib,constants}
```

- [ ] **Step 2: Crear `backend/requirements.txt`**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.9
python-jose[cryptography]==3.3.0
httpx==0.27.0
supabase==2.7.2
openai==1.51.0
langchain-core==0.3.0
langchain-openai==0.2.0
langchain-chroma==0.1.4
langchain-community==0.3.0
chromadb==0.5.11
opencv-python-headless==4.10.0.84
numpy==2.1.0
pytest==8.3.3
pytest-asyncio==0.24.0
```

- [ ] **Step 3: Crear `.gitignore`**

```
# Python
__pycache__/
*.pyc
.env
chroma_db/
.venv/

# Node
node_modules/
.expo/
dist/

# OS
.DS_Store
```

- [ ] **Step 4: Inicializar git y primer commit**

```bash
cd fraktl
git init
git add .
git commit -m "chore: initialize monorepo structure"
```

---

## Task 2: Backend skeleton (FastAPI + config)

**Files:**
- Create: `backend/app/config.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Escribir test de health check**

```python
# backend/tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
```

```python
# backend/tests/test_health.py
import pytest

@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Correr test para verificar que falla**

```bash
cd backend
pytest tests/test_health.py -v
```
Expected: `FAILED — ModuleNotFoundError`

- [ ] **Step 3: Crear `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str
    supabase_url: str
    supabase_service_key: str
    supabase_jwt_secret: str

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 4: Crear `backend/app/main.py`**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # RAG seed se añade en Task 7
    yield

app = FastAPI(title="Fraktl API", lifespan=lifespan)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Correr test para verificar que pasa**

```bash
pytest tests/test_health.py -v
```
Expected: `PASSED`

- [ ] **Step 6: Commit**

```bash
git add backend/app/config.py backend/app/main.py backend/tests/
git commit -m "feat: fastapi skeleton with health endpoint"
```

---

## Task 3: Supabase — schema + storage buckets

**Files:** Configuración externa en Supabase dashboard (no archivos de código).

- [ ] **Step 1: Crear proyecto en Supabase**

Ir a supabase.com → New project. Anotar:
- `Project URL` → `SUPABASE_URL`
- `service_role` key → `SUPABASE_SERVICE_KEY`
- Settings → API → JWT Secret → `SUPABASE_JWT_SECRET`

- [ ] **Step 2: Ejecutar schema SQL en el SQL editor de Supabase**

```sql
create table scans (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users not null,
  species             text,
  symmetry_index      float,
  fibonacci_alignment text,
  narrative           text,
  audio_url           text,
  image_url           text,
  resonance_score     int check (resonance_score between 1 and 5),
  hrv_delta           float,
  scanned_at          timestamptz default now()
);

create index scans_user_id_idx on scans(user_id);
create index scans_species_idx on scans(species);
```

- [ ] **Step 3: Crear storage buckets**

En Supabase dashboard → Storage → New bucket:
- `scans` (public: true)
- `audio` (public: true)

- [ ] **Step 4: Habilitar Google OAuth**

En Supabase → Authentication → Providers → Google:
- Activar Google provider
- Añadir Client ID y Client Secret de Google Cloud Console
- Callback URL: `https://<project>.supabase.co/auth/v1/callback`

- [ ] **Step 5: Crear `backend/.env`**

```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret
```

- [ ] **Step 6: Commit**

```bash
git add backend/.env.example
git commit -m "chore: supabase schema and storage setup"
```

---

## Task 4: Expo project setup

**Files:**
- Create: `app/package.json` (via expo init)
- Create: `app/constants/api.ts`
- Create: `app/lib/supabase.ts`

- [ ] **Step 1: Inicializar proyecto Expo**

```bash
cd fraktl/app
npx create-expo-app@latest . --template blank-typescript
```

- [ ] **Step 2: Instalar dependencias**

```bash
npx expo install expo-camera expo-av expo-auth-session expo-web-browser \
  expo-secure-store expo-router @supabase/supabase-js
```

- [ ] **Step 3: Crear `app/constants/api.ts`**

```typescript
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'
```

- [ ] **Step 4: Crear `app/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

- [ ] **Step 5: Crear `app/.env.local`**

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 6: Commit**

```bash
git add app/
git commit -m "chore: expo project setup with supabase client"
```

---

> **GIT WORKTREES — invocar skill `superpowers:using-git-worktrees` aquí.**
> Crear dos worktrees: uno para `feature/backend` y otro para `feature/frontend`.
> Las Tasks 5-12 van en `feature/backend`. Las Tasks 13-19 en `feature/frontend`.
> Pueden ejecutarse en paralelo.

---

## Task 5: Auth middleware (JWT Supabase)

**Files:**
- Create: `backend/app/middleware/auth.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Escribir tests del middleware**

```python
# backend/tests/test_auth.py
import pytest
from unittest.mock import patch
from jose import jwt
from datetime import datetime, timedelta

def make_token(secret: str, user_id: str = "user-123", expired: bool = False) -> str:
    exp = datetime.utcnow() + (timedelta(hours=-1) if expired else timedelta(hours=1))
    return jwt.encode(
        {"sub": user_id, "aud": "authenticated", "exp": exp},
        secret,
        algorithm="HS256"
    )

@pytest.mark.asyncio
async def test_valid_token_returns_user_id(client):
    token = make_token("test-secret")
    with patch("app.middleware.auth.settings.supabase_jwt_secret", "test-secret"):
        response = await client.get(
            "/history",
            headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code != 401

@pytest.mark.asyncio
async def test_missing_token_returns_401(client):
    response = await client.get("/history")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_expired_token_returns_401(client):
    token = make_token("test-secret", expired=True)
    with patch("app.middleware.auth.settings.supabase_jwt_secret", "test-secret"):
        response = await client.get(
            "/history",
            headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 401
```

- [ ] **Step 2: Correr tests para verificar que fallan**

```bash
pytest tests/test_auth.py -v
```
Expected: `FAILED — router not found`

- [ ] **Step 3: Crear `backend/app/middleware/auth.py`**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import settings

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
```

- [ ] **Step 4: Crear `backend/app/routers/history.py` (stub para que el test pase)**

```python
from fastapi import APIRouter, Depends
from app.middleware.auth import get_current_user

router = APIRouter()

@router.get("/history")
async def get_history(user_id: str = Depends(get_current_user)):
    return []
```

- [ ] **Step 5: Registrar router en `backend/app/main.py`**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routers import history

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Fraktl API", lifespan=lifespan)
app.include_router(history.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Correr tests**

```bash
pytest tests/test_auth.py -v
```
Expected: `3 PASSED`

- [ ] **Step 7: Commit**

```bash
git add backend/app/middleware/ backend/app/routers/history.py backend/app/main.py backend/tests/test_auth.py
git commit -m "feat: supabase JWT auth middleware"
```

---

## Task 6: RAG retriever (LangChain + ChromaDB)

**Files:**
- Create: `backend/app/rag/retriever.py`
- Create: `backend/app/rag/corpus/fraktl_base.json`
- Create: `backend/tests/test_rag.py`

- [ ] **Step 1: Crear corpus base de Fraktl**

```json
[
  {
    "species": "Quercus robur",
    "signature": "El roble es arquetipo de resistencia y arraigo. Su crecimiento lento acumula décadas de información ambiental en cada capa de madera. Sus patrones de ramificación siguen proporciones fractales documentadas con exponente de Hausdorff ~1.7.",
    "fibonacci_note": "La disposición de sus ramas principales sigue ángulos de 137.5° — el ángulo áureo."
  },
  {
    "species": "Pinus sylvestris",
    "signature": "El pino silvestre exhibe la espiral de Fibonacci más visible del reino vegetal en la disposición de sus piñas. Su resina tiene propiedades antimicrobianas documentadas. Crece en altitudes donde el estrés osmótico genera mayor densidad de información en la madera.",
    "fibonacci_note": "Sus piñas muestran espirales 8/13 o 13/21, siempre números Fibonacci consecutivos."
  },
  {
    "species": "Fagus sylvatica",
    "signature": "La haya forma redes micorrizales densas que comparten nutrientes entre individuos. Su corteza lisa refleja luz de forma uniforme, señal de madurez estructural y baja acumulación de estrés. Sus hojas siguen venación pinnada con ramificación dicotómica fractal.",
    "fibonacci_note": "El ángulo de inserción de sus ramas laterales converge a 144° — 2 × el ángulo áureo."
  },
  {
    "species": "Betula pendula",
    "signature": "El abedul es pionero ecológico: coloniza espacios vacíos y prepara el suelo para especies tardías. Su corteza blanca refleja hasta el 85% de la luz solar incidente, regulando temperatura. Sus ramas péndulas describen curvas catenarias naturales.",
    "fibonacci_note": "La disposición de sus yemas laterales sigue filotaxis 1/3 o 2/5."
  },
  {
    "species": "Acer platanoides",
    "signature": "El arce presenta hojas con simetría bilateral casi perfecta — desviaciones menores al 3%. Sus frutos (sámaras) rotan en caída libre siguiendo geometría helicoidal optimizada para dispersión máxima. Alta densidad de madera indica lento crecimiento y alta acumulación energética.",
    "fibonacci_note": "Sus semillas pares se separan en ángulos que aproximan la proporción áurea 1:1.618."
  }
]
```

- [ ] **Step 2: Escribir test del retriever**

```python
# backend/tests/test_rag.py
import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_retriever_returns_relevant_docs():
    mock_docs = [MagicMock(page_content="El roble sigue ángulo áureo")]
    with patch("app.rag.retriever.retriever") as mock_retriever:
        mock_retriever.invoke.return_value = mock_docs
        from app.rag.retriever import get_context
        result = get_context("Quercus robur")
    assert "roble" in result or result == ""
```

- [ ] **Step 3: Correr test para verificar que falla**

```bash
pytest tests/test_rag.py -v
```
Expected: `FAILED — ModuleNotFoundError`

- [ ] **Step 4: Crear `backend/app/rag/retriever.py`**

```python
import json
from pathlib import Path
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document

CHROMA_PATH = "/app/chroma_db"
COLLECTION = "fraktl_corpus"

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

vectorstore = Chroma(
    collection_name=COLLECTION,
    embedding_function=embeddings,
    persist_directory=CHROMA_PATH,
)

retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

def collection_has_data() -> bool:
    return vectorstore._collection.count() > 0

def get_context(species: str) -> str:
    docs = retriever.invoke(species)
    return "\n\n".join(doc.page_content for doc in docs)
```

- [ ] **Step 5: Correr test**

```bash
pytest tests/test_rag.py -v
```
Expected: `PASSED`

- [ ] **Step 6: Commit**

```bash
git add backend/app/rag/ backend/tests/test_rag.py
git commit -m "feat: langchain chromadb retriever with fraktl corpus"
```

---

## Task 7: Seed script (LangChain Wikipedia loader)

**Files:**
- Create: `backend/scripts/seed_rag.py`

- [ ] **Step 1: Crear `backend/scripts/seed_rag.py`**

```python
"""
Indexa corpus inicial en ChromaDB.
Corre automáticamente en startup si la colección está vacía.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from langchain_community.document_loaders import WikipediaLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from app.rag.retriever import vectorstore

SPECIES_LIST = [
    "Quercus robur", "Pinus sylvestris", "Fagus sylvatica",
    "Betula pendula", "Acer platanoides", "Fraxinus excelsior",
    "Tilia cordata", "Castanea sativa", "Populus tremula",
]

CORPUS_PATH = Path(__file__).parent.parent / "app/rag/corpus/fraktl_base.json"

def seed():
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    docs_to_add = []

    # Wikipedia
    for species in SPECIES_LIST:
        print(f"Loading Wikipedia: {species}")
        try:
            raw = WikipediaLoader(query=species, load_max_docs=1).load()
            chunks = splitter.split_documents(raw)
            docs_to_add.extend(chunks)
        except Exception as e:
            print(f"  Warning: {e}")

    # Base propia Fraktl
    fraktl_data = json.loads(CORPUS_PATH.read_text())
    for entry in fraktl_data:
        content = (
            f"Especie: {entry['species']}\n"
            f"Firma Fraktl: {entry['signature']}\n"
            f"Fibonacci: {entry['fibonacci_note']}"
        )
        docs_to_add.append(Document(
            page_content=content,
            metadata={"species": entry["species"], "source": "fraktl_base"}
        ))

    vectorstore.add_documents(docs_to_add)
    print(f"Seed complete: {len(docs_to_add)} chunks indexed.")

if __name__ == "__main__":
    seed()
```

- [ ] **Step 2: Integrar seed en el lifespan de `backend/app/main.py`**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routers import history, scan
from app.rag.retriever import collection_has_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not collection_has_data():
        print("ChromaDB empty — running seed script...")
        from scripts.seed_rag import seed
        seed()
    yield

app = FastAPI(title="Fraktl API", lifespan=lifespan)
app.include_router(history.router)
app.include_router(scan.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 3: Verificar que el seed corre sin errores (local)**

```bash
cd backend
OPENAI_API_KEY=sk-... python scripts/seed_rag.py
```
Expected: `Seed complete: N chunks indexed.`

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/seed_rag.py backend/app/main.py
git commit -m "feat: rag seed script with wikipedia + fraktl corpus"
```

---

## Task 8: Detector heurístico (`/scan/detect`)

**Files:**
- Create: `backend/app/services/detector.py`
- Create: `backend/app/routers/scan.py`
- Create: `backend/tests/test_detect.py`

- [ ] **Step 1: Crear imagen de test (fixture)**

```python
# backend/tests/conftest.py  (añadir al archivo existente)
import numpy as np
import cv2

@pytest.fixture
def bright_frame_bytes() -> bytes:
    img = np.ones((480, 640, 3), dtype=np.uint8) * 120
    # Añadir bordes verticales simulando tronco
    img[:, 300:320] = 20
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()

@pytest.fixture
def dark_frame_bytes() -> bytes:
    img = np.ones((480, 640, 3), dtype=np.uint8) * 15
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()
```

- [ ] **Step 2: Escribir tests de detect**

```python
# backend/tests/test_detect.py
import pytest
from app.services.detector import is_valid_tree_frame

def test_bright_frame_with_edges_is_valid(bright_frame_bytes):
    valid, hint = is_valid_tree_frame(bright_frame_bytes)
    assert valid is True

def test_dark_frame_is_invalid(dark_frame_bytes):
    valid, hint = is_valid_tree_frame(dark_frame_bytes)
    assert valid is False
    assert "luz" in hint.lower()
```

- [ ] **Step 3: Correr tests para verificar que fallan**

```bash
pytest tests/test_detect.py -v
```
Expected: `FAILED — ModuleNotFoundError`

- [ ] **Step 4: Crear `backend/app/services/detector.py`**

```python
import cv2
import numpy as np

def is_valid_tree_frame(image_bytes: bytes) -> tuple[bool, str]:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return False, "No se pudo leer la imagen"

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Brillo mínimo
    if np.mean(gray) < 40:
        return False, "Busca mejor iluminación"

    # Nitidez mínima (varianza del Laplaciano)
    if cv2.Laplacian(gray, cv2.CV_64F).var() < 50:
        return False, "Imagen borrosa, mantén la cámara estable"

    # Presencia de bordes (estructura del árbol)
    edges = cv2.Canny(gray, 50, 150)
    if np.sum(edges > 0) / edges.size < 0.05:
        return False, "Apunta al tronco del árbol"

    return True, "Árbol detectado"
```

- [ ] **Step 5: Crear `backend/app/routers/scan.py` con `/scan/detect`**

```python
from fastapi import APIRouter, UploadFile, File
from app.services.detector import is_valid_tree_frame

router = APIRouter()

@router.post("/scan/detect")
async def detect(frame: UploadFile = File(...)):
    image_bytes = await frame.read()
    valid, hint = is_valid_tree_frame(image_bytes)
    return {"valid": valid, "hint": hint}
```

- [ ] **Step 6: Correr tests**

```bash
pytest tests/test_detect.py -v
```
Expected: `2 PASSED`

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/detector.py backend/app/routers/scan.py backend/tests/test_detect.py backend/tests/conftest.py
git commit -m "feat: heuristic tree frame detector (opencv)"
```

---

## Task 9: Prompts + Vision service (llamada 1 — identificación)

**Files:**
- Create: `backend/app/prompts/identify.py`
- Create: `backend/app/services/vision.py`

- [ ] **Step 1: Escribir test de la llamada de identificación**

```python
# backend/tests/test_scan.py
import pytest
from unittest.mock import AsyncMock, patch
import json

MOCK_IDENTIFICATION = {
    "species": "Quercus robur",
    "age_estimate": "80-120 años",
    "bark_type": "profundamente fisurada gris",
    "branching_pattern": "irregular ascendente robusto",
    "confidence": 0.88,
}

@pytest.mark.asyncio
async def test_identify_tree_returns_structured_json(bright_frame_bytes):
    mock_response = AsyncMock()
    mock_response.choices[0].message.content = json.dumps(MOCK_IDENTIFICATION)

    with patch("app.services.vision.openai_client.chat.completions.create",
               return_value=mock_response):
        from app.services.vision import identify_tree
        result = await identify_tree(bright_frame_bytes)

    assert result["species"] == "Quercus robur"
    assert "age_estimate" in result
    assert "bark_type" in result
```

- [ ] **Step 2: Correr test para verificar que falla**

```bash
pytest tests/test_scan.py::test_identify_tree_returns_structured_json -v
```
Expected: `FAILED — ModuleNotFoundError`

- [ ] **Step 3: Crear `backend/app/prompts/identify.py`**

```python
IDENTIFY_PROMPT = """Analiza esta imagen de un árbol. Responde SOLO con JSON válido con esta estructura exacta:
{
  "species": "nombre científico de la especie",
  "age_estimate": "estimado en años, ej: '50-80 años'",
  "bark_type": "descripción de la corteza en 5 palabras máximo",
  "branching_pattern": "descripción del patrón de ramificación en 5 palabras máximo",
  "confidence": 0.85
}
Si no puedes identificar la especie, usa "species": "Árbol desconocido"."""
```

- [ ] **Step 4: Crear `backend/app/services/vision.py`**

```python
import base64
import json
from openai import AsyncOpenAI
from app.config import settings
from app.prompts.identify import IDENTIFY_PROMPT

openai_client = AsyncOpenAI(api_key=settings.openai_api_key)

async def identify_tree(image_bytes: bytes) -> dict:
    b64 = base64.b64encode(image_bytes).decode()
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
```

- [ ] **Step 5: Correr test**

```bash
pytest tests/test_scan.py::test_identify_tree_returns_structured_json -v
```
Expected: `PASSED`

- [ ] **Step 6: Commit**

```bash
git add backend/app/prompts/identify.py backend/app/services/vision.py backend/tests/test_scan.py
git commit -m "feat: gpt-4o vision identification (call 1)"
```

---

## Task 10: Narrativa + TTS + Storage + endpoint `/scan`

**Files:**
- Create: `backend/app/prompts/narrate.py`
- Create: `backend/app/services/tts.py`
- Create: `backend/app/services/storage.py`
- Create: `backend/app/db.py`
- Modify: `backend/app/services/vision.py`
- Modify: `backend/app/routers/scan.py`

- [ ] **Step 1: Escribir test completo de `/scan`**

```python
# backend/tests/test_scan.py (añadir)
MOCK_NARRATIVE = {
    "narrative": "Este roble milenario porta en su corteza la memoria del bosque...",
    "symmetry_index": 0.81,
    "fibonacci_alignment": "alta",
}

@pytest.mark.asyncio
async def test_scan_returns_full_result(client, bright_frame_bytes):
    with (
        patch("app.routers.scan.identify_tree", return_value=MOCK_IDENTIFICATION),
        patch("app.routers.scan.get_context", return_value="contexto botánico mock"),
        patch("app.routers.scan.generate_narrative", return_value=MOCK_NARRATIVE),
        patch("app.routers.scan.generate_audio", return_value=b"audio-bytes"),
        patch("app.routers.scan.upload_file", return_value="https://storage.example.com/audio.mp3"),
        patch("app.routers.scan.upload_file", return_value="https://storage.example.com/img.jpg"),
        patch("app.routers.scan.save_scan", return_value="scan-uuid-123"),
    ):
        response = await client.post(
            "/scan",
            files={"image": ("tree.jpg", bright_frame_bytes, "image/jpeg")},
            headers={"Authorization": "Bearer mock-token"},
        )
    assert response.status_code == 200
    data = response.json()
    assert "species" in data
    assert "narrative" in data
    assert "audio_url" in data
    assert "scan_id" in data
```

- [ ] **Step 2: Crear `backend/app/prompts/narrate.py`**

```python
NARRATE_PROMPT = """Eres un intérprete de biosemiótica arbórea. Genera una interpretación del árbol identificado.

DATOS IDENTIFICADOS:
{identification}

CONTEXTO BOTÁNICO:
{rag_context}

Responde SOLO con JSON válido:
{{
  "narrative": "narrativa biosemiótica de 3-4 oraciones, poética pero anclada en los datos reales del contexto",
  "symmetry_index": 0.78,
  "fibonacci_alignment": "alta|media|baja"
}}"""
```

- [ ] **Step 3: Añadir `generate_narrative` a `backend/app/services/vision.py`**

```python
import json
from app.prompts.narrate import NARRATE_PROMPT

async def generate_narrative(identification: dict, rag_context: str) -> dict:
    prompt = NARRATE_PROMPT.format(
        identification=json.dumps(identification, ensure_ascii=False),
        rag_context=rag_context,
    )
    response = await openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_tokens=400,
    )
    return json.loads(response.choices[0].message.content)
```

- [ ] **Step 4: Crear `backend/app/services/tts.py`**

```python
from app.services.vision import openai_client

async def generate_audio(text: str) -> bytes:
    response = await openai_client.audio.speech.create(
        model="tts-1",
        voice="nova",
        input=text,
    )
    return response.content
```

- [ ] **Step 5: Crear `backend/app/services/storage.py`**

```python
from supabase import create_client
from app.config import settings

_supabase = create_client(settings.supabase_url, settings.supabase_service_key)

def upload_file(bucket: str, path: str, data: bytes, content_type: str) -> str:
    _supabase.storage.from_(bucket).upload(
        path, data, {"content-type": content_type, "upsert": "true"}
    )
    return _supabase.storage.from_(bucket).get_public_url(path)
```

- [ ] **Step 6: Crear `backend/app/db.py`**

```python
import uuid
from supabase import create_client
from app.config import settings

_supabase = create_client(settings.supabase_url, settings.supabase_service_key)

def save_scan(user_id: str, data: dict) -> str:
    scan_id = str(uuid.uuid4())
    _supabase.table("scans").insert({
        "id": scan_id,
        "user_id": user_id,
        **data,
    }).execute()
    return scan_id
```

- [ ] **Step 7: Completar `backend/app/routers/scan.py` con el endpoint `/scan`**

```python
from fastapi import APIRouter, UploadFile, File, Depends
from app.services.detector import is_valid_tree_frame
from app.services.vision import identify_tree, generate_narrative
from app.services.tts import generate_audio
from app.services.storage import upload_file
from app.rag.retriever import get_context
from app.middleware.auth import get_current_user
from app.db import save_scan

router = APIRouter()

@router.post("/scan/detect")
async def detect(frame: UploadFile = File(...)):
    image_bytes = await frame.read()
    valid, hint = is_valid_tree_frame(image_bytes)
    return {"valid": valid, "hint": hint}

@router.post("/scan")
async def scan(
    image: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    image_bytes = await image.read()

    # Llamada 1: identificación
    identification = await identify_tree(image_bytes)

    # RAG: contexto botánico
    rag_context = get_context(identification["species"])

    # Llamada 2: narrativa
    narrative_data = await generate_narrative(identification, rag_context)

    # TTS
    audio_bytes = await generate_audio(narrative_data["narrative"])

    # Storage
    scan_id_temp = __import__("uuid").uuid4()
    audio_url = upload_file("audio", f"{scan_id_temp}.mp3", audio_bytes, "audio/mpeg")
    image_url = upload_file("scans", f"{scan_id_temp}.jpg", image_bytes, "image/jpeg")

    # Persistir
    scan_id = save_scan(user_id, {
        "species": identification["species"],
        "symmetry_index": narrative_data["symmetry_index"],
        "fibonacci_alignment": narrative_data["fibonacci_alignment"],
        "narrative": narrative_data["narrative"],
        "audio_url": audio_url,
        "image_url": image_url,
    })

    return {
        "scan_id": scan_id,
        "species": identification["species"],
        "symmetry_index": narrative_data["symmetry_index"],
        "fibonacci_alignment": narrative_data["fibonacci_alignment"],
        "narrative": narrative_data["narrative"],
        "audio_url": audio_url,
        "image_url": image_url,
    }
```

- [ ] **Step 8: Correr todos los tests de backend**

```bash
pytest tests/ -v
```
Expected: `todos PASSED`

- [ ] **Step 9: Commit**

```bash
git add backend/app/prompts/narrate.py backend/app/services/ backend/app/db.py backend/app/routers/scan.py backend/tests/test_scan.py
git commit -m "feat: full scan pipeline (identify + rag + narrate + tts + storage)"
```

---

## Task 11: Endpoint `/history`

**Files:**
- Modify: `backend/app/routers/history.py`
- Create: `backend/tests/test_history.py`

- [ ] **Step 1: Escribir test de history**

```python
# backend/tests/test_history.py
import pytest
from unittest.mock import patch

MOCK_SCANS = [
    {"id": "abc", "species": "Quercus robur", "symmetry_index": 0.8,
     "image_url": "https://...", "scanned_at": "2026-05-05T10:00:00Z"},
]

@pytest.mark.asyncio
async def test_history_returns_user_scans(client):
    with (
        patch("app.routers.history.get_current_user", return_value="user-123"),
        patch("app.routers.history.fetch_history", return_value=MOCK_SCANS),
    ):
        response = await client.get(
            "/history",
            headers={"Authorization": "Bearer mock-token"},
        )
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["species"] == "Quercus robur"
```

- [ ] **Step 2: Correr test para verificar que falla**

```bash
pytest tests/test_history.py -v
```
Expected: `FAILED`

- [ ] **Step 3: Añadir `fetch_history` a `backend/app/db.py`**

```python
def fetch_history(user_id: str) -> list[dict]:
    result = (
        _supabase.table("scans")
        .select("id, species, symmetry_index, image_url, scanned_at")
        .eq("user_id", user_id)
        .order("scanned_at", desc=True)
        .execute()
    )
    return result.data
```

- [ ] **Step 4: Completar `backend/app/routers/history.py`**

```python
from fastapi import APIRouter, Depends
from app.middleware.auth import get_current_user
from app.db import fetch_history

router = APIRouter()

@router.get("/history")
async def get_history(user_id: str = Depends(get_current_user)):
    return fetch_history(user_id)
```

- [ ] **Step 5: Correr todos los tests**

```bash
pytest tests/ -v
```
Expected: `todos PASSED`

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/history.py backend/app/db.py backend/tests/test_history.py
git commit -m "feat: history endpoint with supabase query"
```

---

## Task 12: Docker + Railway config

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/railway.toml`

- [ ] **Step 1: Crear `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Crear `backend/railway.toml`**

```toml
[build]
  builder = "DOCKERFILE"
  dockerfilePath = "Dockerfile"

[deploy]
  startCommand = "uvicorn app.main:app --host 0.0.0.0 --port 8000"
  healthcheckPath = "/health"
  healthcheckTimeout = 300

[[deploy.volumeMounts]]
  mountPath = "/app/chroma_db"
  name = "chroma-volume"
```

- [ ] **Step 3: Build local para verificar imagen**

```bash
cd backend
docker build -t fraktl-backend .
docker run --env-file .env -p 8000:8000 fraktl-backend
```
Expected: `Application startup complete` en logs.

- [ ] **Step 4: Verificar health en local**

```bash
curl http://localhost:8000/health
```
Expected: `{"status":"ok"}`

- [ ] **Step 5: Commit**

```bash
git add backend/Dockerfile backend/railway.toml
git commit -m "chore: docker and railway configuration"
```

---

> **FRONTEND — invocar skill `superpowers:using-git-worktrees`** para el worktree `feature/frontend` si no fue creado antes. Invocar skill `frontend-design` antes de cada tarea de pantalla.

---

## Task 13: Navegación + auth guard (expo-router)

**Files:**
- Create: `app/app/_layout.tsx`
- Create: `app/app/(auth)/index.tsx` (stub)
- Create: `app/app/(app)/_layout.tsx`
- Create: `app/app/(app)/index.tsx` (stub)

- [ ] **Step 1: Configurar `app/app/_layout.tsx` con auth guard**

```typescript
import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const inApp = segments[0] === '(app)'
      if (!session && inApp) router.replace('/(auth)')
      if (session && !inApp) router.replace('/(app)')
    })
    return () => subscription.unsubscribe()
  }, [segments])

  return <Slot />
}
```

- [ ] **Step 2: Crear `app/app/(app)/_layout.tsx`**

```typescript
import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  )
}
```

- [ ] **Step 3: Crear stubs para que el router funcione**

```typescript
// app/app/(auth)/index.tsx
import { View, Text } from 'react-native'
export default function AuthScreen() {
  return <View><Text>Auth</Text></View>
}
```

```typescript
// app/app/(app)/index.tsx
import { View, Text } from 'react-native'
export default function HomeScreen() {
  return <View><Text>Home</Text></View>
}
```

- [ ] **Step 4: Verificar que la app arranca sin errores**

```bash
cd app
npx expo start
```
Expected: app abre en simulador, navegación entre auth/app funciona.

- [ ] **Step 5: Commit**

```bash
git add app/app/
git commit -m "feat: expo-router navigation with supabase auth guard"
```

---

## Task 14: AuthScreen

> Invocar `frontend-design` antes de implementar esta pantalla.

**Files:**
- Modify: `app/app/(auth)/index.tsx`

- [ ] **Step 1: Implementar AuthScreen con Google OAuth**

```typescript
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { supabase } from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

export default function AuthScreen() {
  const [loading, setLoading] = useState(false)

  async function signInWithGoogle() {
    setLoading(true)
    const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'fraktl' })
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    })
    if (data.url) {
      await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
    }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fraktl</Text>
      <Text style={styles.subtitle}>Decodifica el lenguaje de los árboles</Text>
      <TouchableOpacity style={styles.button} onPress={signInWithGoogle} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Continuar con Google</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1c0f', padding: 32 },
  title: { fontSize: 48, fontWeight: '700', color: '#a8e6a0', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b9c6b', textAlign: 'center', marginBottom: 64 },
  button: { backgroundColor: '#2d5a2d', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 12, width: '100%', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
```

- [ ] **Step 2: Añadir scheme en `app/app.json`**

```json
{
  "expo": {
    "scheme": "fraktl"
  }
}
```

- [ ] **Step 3: Probar login en simulador**

```bash
npx expo start
```
Tap "Continuar con Google" → flujo OAuth completa → redirige a HomeScreen.

- [ ] **Step 4: Commit**

```bash
git add app/app/(auth)/index.tsx app/app.json
git commit -m "feat: auth screen with google oauth"
```

---

## Task 15: HomeScreen

> Invocar `frontend-design` antes de implementar esta pantalla.

**Files:**
- Modify: `app/app/(app)/index.tsx`

- [ ] **Step 1: Implementar HomeScreen**

```typescript
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function HomeScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fraktl</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(app)/scan')}>
        <Text style={styles.primaryText}>Escanear árbol</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(app)/history')}>
        <Text style={styles.secondaryText}>Mi historial</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOut}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1c0f', padding: 32, gap: 16 },
  title: { fontSize: 36, fontWeight: '700', color: '#a8e6a0', marginBottom: 32 },
  primaryButton: { backgroundColor: '#2d5a2d', padding: 20, borderRadius: 16, width: '100%', alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderColor: '#2d5a2d', padding: 20, borderRadius: 16, width: '100%', alignItems: 'center' },
  secondaryText: { color: '#a8e6a0', fontSize: 16 },
  signOut: { color: '#6b9c6b', marginTop: 24, fontSize: 14 },
})
```

- [ ] **Step 2: Commit**

```bash
git add app/app/(app)/index.tsx
git commit -m "feat: home screen with scan and history navigation"
```

---

## Task 16: Hook `useFrameDetection`

**Files:**
- Create: `app/hooks/useFrameDetection.ts`

- [ ] **Step 1: Escribir test del hook (Jest)**

```typescript
// app/__tests__/useFrameDetection.test.ts
import { renderHook, act } from '@testing-library/react-native'
import { useFrameDetection } from '@/hooks/useFrameDetection'

jest.useFakeTimers()

global.fetch = jest.fn()

test('calls onValidFrame when API returns valid=true', async () => {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    json: async () => ({ valid: true, hint: 'Árbol detectado' }),
  })

  const onValidFrame = jest.fn()
  const { result } = renderHook(() => useFrameDetection(onValidFrame))

  await act(async () => {
    jest.advanceTimersByTime(1100)
    await Promise.resolve()
  })

  expect(onValidFrame).toHaveBeenCalled()
})
```

- [ ] **Step 2: Correr test para verificar que falla**

```bash
cd app
npx jest __tests__/useFrameDetection.test.ts
```
Expected: `FAILED — Cannot find module`

- [ ] **Step 3: Crear `app/hooks/useFrameDetection.ts`**

```typescript
import { useRef, useState, useCallback } from 'react'
import { CameraView } from 'expo-camera'
import { API_URL } from '@/constants/api'
import { supabase } from '@/lib/supabase'

export function useFrameDetection(onValidFrame: (uri: string) => void) {
  const [hint, setHint] = useState('')
  const cameraRef = useRef<CameraView>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const analyzing = useRef(false)

  const startDetection = useCallback(() => {
    intervalRef.current = setInterval(async () => {
      if (analyzing.current || !cameraRef.current) return
      analyzing.current = true

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.3,
          skipProcessing: true,
        })
        if (!photo) return

        const formData = new FormData()
        formData.append('frame', { uri: photo.uri, type: 'image/jpeg', name: 'frame.jpg' } as any)

        const res = await fetch(`${API_URL}/scan/detect`, { method: 'POST', body: formData })
        const data = await res.json()

        setHint(data.hint)
        if (data.valid) {
          clearInterval(intervalRef.current)
          onValidFrame(photo.uri)
        }
      } finally {
        analyzing.current = false
      }
    }, 1000)
  }, [onValidFrame])

  const stopDetection = useCallback(() => {
    clearInterval(intervalRef.current)
  }, [])

  return { cameraRef, hint, startDetection, stopDetection }
}
```

- [ ] **Step 4: Correr test**

```bash
npx jest __tests__/useFrameDetection.test.ts
```
Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/hooks/useFrameDetection.ts app/__tests__/useFrameDetection.test.ts
git commit -m "feat: frame detection hook with 1s polling"
```

---

## Task 17: ScanScreen

> Invocar `frontend-design` antes de implementar esta pantalla.

**Files:**
- Create: `app/app/(app)/scan.tsx`
- Create: `app/components/ScanOverlay.tsx`

- [ ] **Step 1: Crear `app/components/ScanOverlay.tsx`**

```typescript
import { View, Text, StyleSheet } from 'react-native'

interface Props { hint: string }

export function ScanOverlay({ hint }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.frame} />
      <Text style={styles.hint}>{hint || 'Apunta al árbol'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  frame: { width: 260, height: 400, borderWidth: 2, borderColor: '#a8e6a0', borderRadius: 12 },
  hint: { color: '#a8e6a0', marginTop: 16, fontSize: 14, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 8 },
})
```

- [ ] **Step 2: Crear `app/app/(app)/scan.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { useFrameDetection } from '@/hooks/useFrameDetection'
import { ScanOverlay } from '@/components/ScanOverlay'
import { API_URL } from '@/constants/api'
import { supabase } from '@/lib/supabase'

export default function ScanScreen() {
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const [loading, setLoading] = useState(false)

  async function handleValidFrame(uri: string) {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const formData = new FormData()
      formData.append('image', { uri, type: 'image/jpeg', name: 'tree.jpg' } as any)

      const res = await fetch(`${API_URL}/scan`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const result = await res.json()
      router.push({ pathname: '/(app)/result', params: result })
    } catch {
      Alert.alert('Error', 'No se pudo analizar el árbol. Intenta de nuevo.')
      setLoading(false)
    }
  }

  const { cameraRef, hint, startDetection, stopDetection } = useFrameDetection(handleValidFrame)

  useEffect(() => {
    if (!permission?.granted) requestPermission()
  }, [])

  useEffect(() => {
    if (permission?.granted && !loading) startDetection()
    return stopDetection
  }, [permission?.granted, loading])

  if (!permission?.granted) {
    return <View style={styles.center}><Text style={styles.text}>Permiso de cámara requerido</Text></View>
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      {loading
        ? <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#a8e6a0" /><Text style={styles.loadingText}>Consultando el árbol...</Text></View>
        : <ScanOverlay hint={hint} />
      }
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1c0f' },
  text: { color: '#a8e6a0' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: '#a8e6a0', fontSize: 16 },
})
```

- [ ] **Step 3: Verificar en simulador**

```bash
npx expo start
```
Navegar a ScanScreen → viewfinder activo → overlay visible con hint.

- [ ] **Step 4: Commit**

```bash
git add app/app/(app)/scan.tsx app/components/ScanOverlay.tsx
git commit -m "feat: scan screen with qr-style auto-capture"
```

---

## Task 18: ResultScreen

> Invocar `frontend-design` antes de implementar esta pantalla.

**Files:**
- Create: `app/app/(app)/result.tsx`
- Create: `app/components/AudioPlayer.tsx`

- [ ] **Step 1: Crear `app/components/AudioPlayer.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Audio } from 'expo-av'

interface Props { url: string }

export function AudioPlayer({ url }: Props) {
  const [sound, setSound] = useState<Audio.Sound>()
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Audio.Sound.createAsync({ uri: url }, {}, (status) => {
      if (status.isLoaded) setLoaded(true)
    }).then(({ sound }) => setSound(sound))
    return () => { sound?.unloadAsync() }
  }, [url])

  async function toggle() {
    if (!sound) return
    if (playing) { await sound.pauseAsync(); setPlaying(false) }
    else { await sound.playAsync(); setPlaying(true) }
  }

  return (
    <TouchableOpacity style={styles.button} onPress={toggle} disabled={!loaded}>
      <Text style={styles.icon}>{playing ? '⏸' : '▶'}</Text>
      <Text style={styles.label}>{loaded ? (playing ? 'Pausar' : 'Escuchar') : 'Cargando audio...'}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2d5a2d', padding: 16, borderRadius: 12, gap: 12 },
  icon: { fontSize: 20, color: '#fff' },
  label: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
```

- [ ] **Step 2: Crear `app/app/(app)/result.tsx`**

```typescript
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { AudioPlayer } from '@/components/AudioPlayer'

export default function ResultScreen() {
  const router = useRouter()
  const { species, symmetry_index, fibonacci_alignment, narrative, audio_url } =
    useLocalSearchParams<{
      species: string
      symmetry_index: string
      fibonacci_alignment: string
      narrative: string
      audio_url: string
    }>()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.species}>{species}</Text>
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{Number(symmetry_index).toFixed(2)}</Text>
          <Text style={styles.metricLabel}>Simetría</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{fibonacci_alignment}</Text>
          <Text style={styles.metricLabel}>Fibonacci</Text>
        </View>
      </View>
      <Text style={styles.narrative}>{narrative}</Text>
      {audio_url ? <AudioPlayer url={audio_url} /> : null}
      <TouchableOpacity style={styles.newScan} onPress={() => router.replace('/(app)/scan')}>
        <Text style={styles.newScanText}>Nuevo escaneo</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1c0f' },
  content: { padding: 24, gap: 20 },
  species: { fontSize: 26, fontWeight: '700', color: '#a8e6a0' },
  metricsRow: { flexDirection: 'row', gap: 16 },
  metric: { flex: 1, backgroundColor: '#1a2e1a', padding: 16, borderRadius: 12, alignItems: 'center' },
  metricValue: { fontSize: 22, fontWeight: '700', color: '#a8e6a0' },
  metricLabel: { fontSize: 12, color: '#6b9c6b', marginTop: 4 },
  narrative: { fontSize: 15, color: '#c8dfc8', lineHeight: 24 },
  newScan: { borderWidth: 1, borderColor: '#2d5a2d', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  newScanText: { color: '#a8e6a0', fontSize: 16 },
})
```

- [ ] **Step 3: Commit**

```bash
git add app/app/(app)/result.tsx app/components/AudioPlayer.tsx
git commit -m "feat: result screen with narrative and audio player"
```

---

## Task 19: HistoryScreen

> Invocar `frontend-design` antes de implementar esta pantalla.

**Files:**
- Create: `app/app/(app)/history.tsx`

- [ ] **Step 1: Crear `app/app/(app)/history.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { API_URL } from '@/constants/api'

interface ScanItem {
  id: string
  species: string
  symmetry_index: number
  image_url: string
  scanned_at: string
}

export default function HistoryScreen() {
  const router = useRouter()
  const [scans, setScans] = useState<ScanItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_URL}/history`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      setScans(await res.json())
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#a8e6a0" /></View>
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi historial</Text>
      <FlatList
        data={scans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => router.push({ pathname: '/(app)/result', params: item })}
          >
            {item.image_url
              ? <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
              : <View style={[styles.thumbnail, styles.placeholder]} />
            }
            <View style={styles.info}>
              <Text style={styles.species}>{item.species}</Text>
              <Text style={styles.date}>{new Date(item.scanned_at).toLocaleDateString('es-MX')}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aún no has escaneado ningún árbol.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1c0f', padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1c0f' },
  title: { fontSize: 26, fontWeight: '700', color: '#a8e6a0', marginBottom: 20 },
  item: { flexDirection: 'row', gap: 16, marginBottom: 16, backgroundColor: '#1a2e1a', borderRadius: 12, overflow: 'hidden' },
  thumbnail: { width: 80, height: 80 },
  placeholder: { backgroundColor: '#2d5a2d' },
  info: { justifyContent: 'center', gap: 4 },
  species: { color: '#a8e6a0', fontSize: 16, fontWeight: '600' },
  date: { color: '#6b9c6b', fontSize: 13 },
  empty: { color: '#6b9c6b', textAlign: 'center', marginTop: 48 },
})
```

- [ ] **Step 2: Commit**

```bash
git add app/app/(app)/history.tsx
git commit -m "feat: history screen with scan list"
```

---

## Task 20: Smoke test de integración E2E

- [ ] **Step 1: Correr todos los tests de backend**

```bash
cd backend && pytest tests/ -v
```
Expected: `todos PASSED`

- [ ] **Step 2: Correr tests de app**

```bash
cd app && npx jest
```
Expected: `todos PASSED`

- [ ] **Step 3: Test manual en device/simulador — flujo completo**

1. Abrir app → AuthScreen → login con Google → HomeScreen ✓
2. Tap "Escanear árbol" → ScanScreen → viewfinder activo ✓
3. Apuntar cámara a objeto con textura → hint aparece ✓
4. Cuando detecta → spinner "Consultando el árbol..." ✓
5. ResultScreen → especie + métricas + narrativa ✓
6. Tap "▶ Escuchar" → audio reproduce ✓
7. Tap "Nuevo escaneo" → regresa a ScanScreen ✓
8. Navegar a "Mi historial" → scan aparece en lista ✓
9. Tap en scan del historial → ResultScreen con datos cacheados ✓

- [ ] **Step 4: Commit final de integración**

```bash
git add .
git commit -m "chore: mvp complete — all screens and backend integrated"
```

---

## Resumen de variables de entorno requeridas

```env
# backend/.env
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_JWT_SECRET=

# app/.env.local
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=
```

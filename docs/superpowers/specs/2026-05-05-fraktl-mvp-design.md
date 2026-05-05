# Fraktl — Design Spec

**Fecha:** 2026-05-05  
**Estado:** Aprobado  
**Scope:** MVP + Roadmap de Fases 2-4

---

## 1. Objetivo del MVP

Validar que los usuarios encuentran valor en escanear un árbol con la cámara y recibir una interpretación biosemiótica (texto + audio) basada en análisis VLM real. Sin wearables, sin mapa, sin comunidad.

**Métrica de éxito:** El usuario completa el flujo de escaneo y escucha el audio hasta el final.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Razón |
|---|---|---|
| Frontend | Expo (React Native) | Multiplataforma, ecosistema maduro |
| Backend | FastAPI + Python | Async nativo, ideal para llamadas a APIs de IA |
| Deploy backend | Railway (Docker) | Rápido, dockerizado, soporte de persistent volumes |
| Auth + DB + Storage | Supabase | Google OAuth out-of-the-box, PostgreSQL, S3-compatible storage |
| VLM | GPT-4o Vision (OpenAI) | Mejor relación calidad/costo para análisis visual |
| TTS | OpenAI TTS | Misma API, menor fricción de integración |
| RAG framework | LangChain (langchain-core + langchain-openai + langchain-chroma + langchain-community) | Loaders nativos para Wikipedia, integración directa con ChromaDB y OpenAI Embeddings |
| Vector DB | ChromaDB vía LangChain | Python-native, corre en el mismo contenedor FastAPI |
| Corpus RAG | Wikipedia Botánica + GBIF + base propia Fraktl | Ver sección 5 |

---

## 3. Arquitectura General

```
┌─────────────────────────────────────────┐
│            Expo (React Native)          │
│  Expo AuthSession (Google OAuth)        │
│  Expo Camera (frame stream)             │
│  Supabase JS SDK (auth token)           │
│  Audio player (expo-av)                 │
└────────────┬────────────────────────────┘
             │ HTTPS + JWT (Supabase token)
             ▼
┌─────────────────────────────────────────┐
│        FastAPI (Docker / Railway)       │
│                                         │
│  POST /scan/detect   ← heurístico       │
│  POST /scan          ← análisis completo│
│  GET  /history       ← historial        │
└──────┬──────────────┬───────────────────┘
       │              │
       ▼              ▼
  Supabase        OpenAI API
  ├── Auth        ├── GPT-4o Vision (x2)
  ├── PostgreSQL  └── TTS
  └── Storage
       (audio + imágenes)

  ChromaDB + LangChain
  (volumen persistente Railway)
```

### Contrato de respuesta `/scan`

```json
{
  "scan_id": "uuid",
  "species": "Quercus robur",
  "symmetry_index": 0.78,
  "fibonacci_alignment": "alta",
  "narrative": "Este roble presenta...",
  "audio_url": "https://[project].supabase.co/storage/v1/object/public/audio/[scan_id].mp3",
  "image_url": "https://[project].supabase.co/storage/v1/object/public/scans/[scan_id].jpg"
}
```

---

## 4. Pantallas (MVP)

### 4.1 AuthScreen
- Botón único: **Continuar con Google**
- Implementado con `expo-auth-session` + Supabase Auth (Google OAuth)
- Redirige a HomeScreen tras auth exitosa

### 4.2 HomeScreen
- Dos acciones: **[Escanear]** → ScanScreen | **[Mi Historial]** → HistoryScreen

### 4.3 ScanScreen — Auto-captura tipo QR
- `expo-camera` transmite frames continuamente
- Cada ~1s el cliente envía un frame JPEG reducido a `POST /scan/detect`
- El endpoint responde `{ valid: bool, hint: string }` en <200ms (sin modelo)
- Al recibir `valid: true` → disparo automático del análisis completo
- Overlay en pantalla: guía de encuadre + indicador de calidad ("Buena luz ✓", "Apunta al tronco")
- Estado de carga: "Consultando el árbol..." con animación

### 4.4 ResultScreen
- Texto aparece primero (~3-5s)
- Audio disponible vía URL de Supabase Storage (~8-15s total)
- Player: play/pause + barra de progreso (`expo-av`)
- Botón "Nuevo escaneo"

### 4.5 HistoryScreen
- Lista de escaneos del usuario, ordenados por fecha
- Cada ítem: miniatura + especie + fecha
- Tap → ResultScreen con datos cacheados (sin nueva llamada a IA)

> **Nota de implementación:** Al desarrollar UX/UI invocar el skill `frontend-design` antes de tocar componentes visuales.

---

## 5. Pipeline RAG con LangChain

### Flujo de análisis completo

```
Imagen recibida
      │
      ▼
[LLAMADA 1] GPT-4o Vision
  Prompt: identificación estructural
  Output: { species, age_estimate, bark_type, branching_pattern }
      │
      ▼
[LangChain Retriever — ChromaDB]
  Input: species + características estructurales
  Output: chunks relevantes del corpus botánico
  (propiedades fractales, fitoquímica, rol ecológico, firma Fraktl)
      │
      ▼
[LLAMADA 2] GPT-4o
  Prompt: narrativa biosemiótica enriquecida con contexto RAG
  Output: { narrative, symmetry_index, fibonacci_alignment }
      │
      ▼
[OpenAI TTS]
  Input: narrative
  Output: audio bytes → Supabase Storage → audio_url
```

### Implementación LangChain (retriever)

```python
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma(
    collection_name="fraktl_corpus",
    embedding_function=embeddings,
    persist_directory="/app/chroma_db"
)
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
```

### Seed script con LangChain loaders

```python
# scripts/seed_rag.py
from langchain_community.document_loaders import WikipediaLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

def seed(species_list: list[str]):
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    for species in species_list:
        docs = WikipediaLoader(query=species, load_max_docs=2).load()
        chunks = splitter.split_documents(docs)
        vectorstore.add_documents(chunks)
    # + cargar corpus propio Fraktl desde YAML
```

El seed script corre automáticamente en el startup del contenedor si la colección ChromaDB está vacía:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    if not collection_has_data():
        seed_rag()
    yield
```

### Corpus RAG

| Fuente | Loader LangChain | Prioridad |
|---|---|---|
| Wikipedia Botánica | `WikipediaLoader` | Alta |
| GBIF API | `JSONLoader` (custom HTTP fetch) | Media |
| Base propia Fraktl | `CSVLoader` / `JSONLoader` desde archivo local | Alta — diferenciador del producto |

---

## 6. Schema PostgreSQL (Supabase)

```sql
-- auth.users manejado por Supabase Auth

create table scans (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users not null,
  species             text,
  symmetry_index      float,
  fibonacci_alignment text,
  narrative           text,
  audio_url           text,
  image_url           text,
  resonance_score     int check (resonance_score between 1 and 5), -- Fase 2
  hrv_delta           float,                                        -- Fase 3
  scanned_at          timestamptz default now()
);

create index scans_user_id_idx on scans(user_id);
create index scans_species_idx on scans(species);  -- necesario para Red de Resonancia
```

---

## 7. Manejo de Errores

| Escenario | Comportamiento |
|---|---|
| Frame sin árbol detectable | Overlay: "Apunta al tronco" — flujo continúa sin interrupción |
| Poca luz | Overlay: "Busca mejor iluminación" |
| Error de red | Toast + retry automático x2, luego "Intenta de nuevo" |
| GPT-4o timeout (>20s) | Fallback: narrativa genérica pre-cacheada por especie |
| Token Supabase expirado | Refresh silencioso; si falla → redirect a AuthScreen |

---

## 8. Soluciones a Gotchas de Arquitectura

### G1 — `/scan/detect` sin modelo (costo y latencia)
El endpoint de detección NO llama a ningún modelo de IA. Usa únicamente heurísticas de procesamiento de imagen: detección de bordes (OpenCV) para identificar estructura vertical orgánica + análisis de brillo y contraste mínimos. Respuesta en <200ms, sin costo de API.

Solo `POST /scan` (análisis completo) consume la API de OpenAI.

### G2 — Storage persistente para audio e imágenes
FastAPI **no sirve archivos estáticos** directamente. Todo archivo generado (audio TTS, imagen del scan) se sube a **Supabase Storage** y se almacena la URL pública en PostgreSQL. Persistencia independiente del ciclo de vida del contenedor.

### G3 — ChromaDB persistente en Railway
El volumen ChromaDB se declara explícitamente en `railway.toml`:

```toml
[deploy]
  volumeMounts = [{ mountPath = "/app/chroma_db", name = "chroma-volume" }]
```

El seed script verifica al startup si la colección existe. Si no existe (primer deploy o volumen nuevo), indexa el corpus completo antes de aceptar requests.

### G4 — Verificación JWT de Supabase en FastAPI
FastAPI verifica los tokens de Supabase usando `python-jose` con el JWT secret del proyecto (env var `SUPABASE_JWT_SECRET`). No se implementa ningún sistema de auth propio.

```python
async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"])
    return payload["sub"]  # user_id
```

---

## 9. Testing

| Capa | Herramienta | Cobertura |
|---|---|---|
| Backend endpoints | pytest + httpx | `/scan/detect`, `/scan`, `/history` |
| Prompts VLM | Suite de imágenes de referencia por especie | Validar que JSON estructurado siempre parsea |
| RAG retrieval | pytest | Verificar que ChromaDB retorna chunks relevantes por especie |
| App (lógica) | Jest + Testing Library | Componentes y hooks de auto-captura (cámara mockeada) |
| E2E | Manual en device real | Flujo completo de auto-captura y reproducción de audio |

---

## 10. Estructura de Repositorio

```
fraktl/
├── app/                        # Expo React Native
│   ├── screens/
│   │   ├── AuthScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ScanScreen.tsx
│   │   ├── ResultScreen.tsx
│   │   └── HistoryScreen.tsx
│   ├── components/
│   ├── hooks/
│   │   └── useFrameDetection.ts
│   └── lib/
│       └── supabase.ts
│
├── backend/                    # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   ├── scan.py
│   │   │   └── history.py
│   │   ├── rag/
│   │   │   ├── retriever.py
│   │   │   └── corpus/
│   │   ├── prompts/
│   │   │   ├── identify.py
│   │   │   └── narrate.py
│   │   └── middleware/
│   │       └── auth.py
│   ├── scripts/
│   │   └── seed_rag.py
│   ├── Dockerfile
│   └── railway.toml
│
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-05-05-fraktl-mvp-design.md
```

---

## 11. Variables de Entorno

```env
# Backend
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_JWT_SECRET=

# App
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=
```

---

## 12. Roadmap Post-MVP

### Fase 2 — "La Firma Viva" *(corpus dinámico + geometría sagrada)*

El escaneo entrega además la **imagen del árbol con geometría sagrada superpuesta** — espirales de Fibonacci, ángulos de ramificación y proporción áurea dibujados sobre la foto real (OpenCV + numpy). Al terminar de escuchar el audio, el usuario responde: *"¿Resonó contigo?"* (1-5). Esa respuesta alimenta la base propia de Fraktl en ChromaDB, que LangChain reindexará periódicamente. El corpus deja de ser estático: cada escaneo enriquece el perfil dinámico de cada especie — inteligencia colectiva propietaria imposible de replicar.

**Cambios técnicos:** endpoint `/scan` devuelve `geometry_overlay_url` adicional. Campo `resonance_score` ya existe en el schema. Job periódico de reindexado RAG.

---

### Fase 3 — "Coherencia" *(biometría sin wearable)*

Después del escaneo, la app invita al usuario a quedarse junto al árbol 3 minutos. La **cámara frontal mide HRV via rPPG** (fotopletismografía remota — sin hardware extra). Al terminar, la app compara HRV antes y después. Si hubo coherencia fisiológica real, el árbol queda marcado como **nodo activo** para ese usuario. El mapa personal registra no lugares visitados sino árboles que cambiaron su sistema nervioso, medido.

**Cambios técnicos:** librería rPPG en Python (open source). Campo `hrv_delta` ya existe en el schema. Nueva tabla `active_nodes(user_id, scan_id, tree_location)`.

---

### Fase 4 — "Red de Resonancia" *(el árbol como nodo social)*

Los nodos activos de distintos usuarios empiezan a solaparse. Si dos personas encontraron coherencia con el mismo árbol, Fraktl los conecta a través de él: *"Alguien más encontró coherencia aquí hace 4 días. Esto es lo que el árbol le dijo."* Cada árbol acumula todas las narrativas que ha generado — un **archivo vivo de resonancias humanas**. El árbol como entidad con historia propia dentro de Fraktl.

**Cambios técnicos:** índice `scans_species_idx` ya existe. Nuevo endpoint `/tree/:id/resonances`. Lógica de matching por geolocalización + especie.

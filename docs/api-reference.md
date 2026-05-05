# Fraktl — API Reference

> Related: [Architecture](./architecture.md) | [Deployment](./deployment.md)

Base URL (local): `http://localhost:8000`  
Base URL (production): set via `EXPO_PUBLIC_API_URL`

All protected endpoints require `Authorization: Bearer <supabase_jwt>`.

---

## GET /health

Health check. No auth required.

**Response `200`**
```json
{ "status": "ok" }
```

---

## POST /scan/detect

Validates a camera frame using heuristics (no AI). Called every ~1s from `useFrameDetection` hook.

**Auth:** not required  
**Content-Type:** `multipart/form-data`  
**Latency target:** <200ms

### Request

| Field | Type | Description |
|---|---|---|
| `frame` | file (JPEG) | Low-quality camera frame (~30KB, quality=0.3) |

### Response `200`

```json
{
  "valid": true,
  "hint": "Árbol detectado"
}
```

```json
{
  "valid": false,
  "hint": "Busca mejor iluminación"
}
```

### Hint values

| Condition | Hint |
|---|---|
| Brightness < 40 | `"Busca mejor iluminación"` |
| Blur variance < 50 | `"Imagen borrosa, mantén la cámara estable"` |
| Edge ratio < 5% | `"Apunta al tronco del árbol"` |
| All checks pass | `"Árbol detectado"` |
| Image unreadable | `"No se pudo leer la imagen"` |

---

## POST /scan

Full analysis pipeline. Triggered once when `/scan/detect` returns `valid: true`.

**Auth:** required  
**Content-Type:** `multipart/form-data`  
**Typical latency:** 8–15s

### Request

| Field | Type | Description |
|---|---|---|
| `image` | file (JPEG) | Full-quality tree image captured by the app |

### Response `200`

```json
{
  "scan_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "species": "Quercus robur",
  "symmetry_index": 0.78,
  "fibonacci_alignment": "alta",
  "narrative": "Este roble milenario porta en su corteza la memoria del bosque...",
  "audio_url": "https://<project>.supabase.co/storage/v1/object/public/audio/<scan_id>.mp3",
  "image_url": "https://<project>.supabase.co/storage/v1/object/public/scans/<scan_id>.jpg"
}
```

### Field descriptions

| Field | Type | Description |
|---|---|---|
| `scan_id` | UUID | Persisted scan ID in PostgreSQL |
| `species` | string | Scientific name identified by GPT-4o Vision |
| `symmetry_index` | float 0–1 | Structural symmetry score |
| `fibonacci_alignment` | string | `"alta"` \| `"media"` \| `"baja"` |
| `narrative` | string | Biosemiotic interpretation (3–4 sentences) |
| `audio_url` | string | Public URL of TTS audio in Supabase Storage |
| `image_url` | string | Public URL of uploaded tree image |

### Error responses

| Status | Body | Cause |
|---|---|---|
| `401` | `{"detail": "Not authenticated"}` | Missing or invalid JWT |
| `422` | validation error | Missing `image` field |
| `504` | `{"detail": "Analysis timeout"}` | GPT-4o took >20s (fallback activates client-side) |

### Internal pipeline

```
image → identify_tree() [GPT-4o call 1]
      → get_context(species) [ChromaDB RAG]
      → generate_narrative(id, context) [GPT-4o call 2]
      → generate_audio(narrative) [OpenAI TTS]
      → upload_file() x2 [Supabase Storage]
      → save_scan() [PostgreSQL]
      → return JSON
```

---

## GET /history

Returns the authenticated user's past scans, ordered by date descending.

**Auth:** required

### Response `200`

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "species": "Quercus robur",
    "symmetry_index": 0.78,
    "image_url": "https://<project>.supabase.co/storage/v1/object/public/scans/...",
    "scanned_at": "2026-05-05T14:32:00Z"
  }
]
```

Returns `[]` if the user has no scans.

### Error responses

| Status | Cause |
|---|---|
| `401` | Missing or invalid JWT |

---

## Authentication

All protected endpoints use Supabase JWTs.

**Header format:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token acquisition (client):**
```typescript
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token
```

**Token verification (backend):**
```python
# middleware/auth.py
jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
```

Token refresh is automatic via Supabase client (`autoRefreshToken: true`).

---

## Future Endpoints (Post-MVP)

| Endpoint | Phase | Description |
|---|---|---|
| `PATCH /scan/:id/resonance` | 2 | Store resonance feedback (1–5) for a scan |
| `GET /scan/:id/geometry` | 2 | Return sacred geometry overlay image URL |
| `POST /hrv/measure` | 3 | Receive rPPG data, compute HRV delta, update scan |
| `GET /tree/:species/resonances` | 4 | Return community resonances for a species/location |

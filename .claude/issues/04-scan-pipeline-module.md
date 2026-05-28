# Issue 04 — `ScanPipeline` module with degradation policy

**Type:** AFK  
**Blocked by:** Issues 02 and 03  
**User stories:** #1, #3, #4, #8, #9, #12, #13, #14

---

## What to build

Extract the scan orchestration from the route handler into a dedicated `ScanPipeline` module (e.g., `services/scan_pipeline.py`). This module owns the pipeline step ordering, degradation policy, and error propagation decisions. The route handler becomes trivially thin in Issue 05.

**Interface:**

```python
async def run(image_bytes: bytes, user_id: str) -> ScanResult:
    ...
```

`ScanResult` is a dataclass that holds all output fields plus per-step status. It exposes a `to_response()` method that serializes to the HTTP response dict.

**Degradation policy (must be implemented exactly as specified — panel-validated):**

| Step | On failure | HTTP effect |
|---|---|---|
| `identify_tree` | Use `_FALLBACK_IDENTIFICATION`; continue | 200, species = "Árbol desconocido" |
| `get_context` | Continue with empty string | 200, narrative uses empty context |
| `generate_narrative` | Use `_FALLBACK_NARRATIVE`; continue | 200, generic narrative |
| `generate_audio` | `audio_url = null`; continue | 200, `audio_url: null` |
| `upload_file` (audio or image) | Corresponding URL = null; continue | 200, null URL |
| `save_scan` | Raise `HTTPException(503, headers={"Retry-After": "30"})` | **503, not 500** |

**Why 503 for DB failure, not 500:** Railway's health-check restarts the pod on consecutive 500s; a transient Supabase blip would cause a restart loop. 503 `Retry-After` tells the client to retry and does not trigger Railway's restart behavior. 500 is reserved for code errors (assertion failures, type errors).

**`audio_status` field:** `ScanResult` must include `audio_status: Literal["ok", "failed"]` alongside `audio_url`. If TTS fails, `audio_status = "failed"` and `audio_url = null`. If TTS succeeds but storage upload fails, `audio_status = "ok"` but `audio_url = null`. This distinguishes failure modes for the frontend copy and for Railway log filtering.

**Top-level exception guard:** `ScanPipeline.run` must have a top-level `try/except Exception` that catches any uncaught exception from any step, logs it with structured context (step name, error), and converts it to a `StepResult(None, "internal_error")`. Services returning `StepResult` is the contract, but implementation bugs can raise exceptions outside it.

**Dependency injection:** Each step (identify, get_context, generate_narrative, generate_audio, upload_file, save_scan) should be callable from outside the class or via injectable parameters so that tests can pass mock callables directly. Do not use `unittest.mock.patch` at the pipeline-test level.

## Acceptance criteria

- [ ] `ScanPipeline.run(image_bytes, user_id)` returns `ScanResult` with all fields: `scan_id`, `species`, `symmetry_index`, `fibonacci_alignment`, `narrative`, `audio_url`, `image_url`, `audio_status`
- [ ] TTS failure → `audio_url: null`, `audio_status: "failed"`, HTTP 200
- [ ] Storage failure (audio) → `audio_url: null`, HTTP 200; scan is still persisted
- [ ] DB failure → `HTTPException(503, Retry-After: 30)`; no `scan_id` in response
- [ ] Vision fallback → `species: "Árbol desconocido"`, HTTP 200
- [ ] Unhandled exception inside any step → structured log entry + `StepResult(None, "internal_error")`, does not propagate as unhandled
- [ ] Pipeline tests use injected mock callables (no `patch()` targeting internal module paths)
- [ ] All four failure mode tests exist: TTS, storage, DB, vision fallback
- [ ] `ScanResult.to_response()` produces the exact field set specified in the API contract

## Blocked by

- Issue 02 — `StepResult[T]` in `app/types.py`
- Issue 03 — `identification.py`, `interpretation.py`, and `tts.py` (updated signatures)

# PRD: Backend Architecture Deepening

**Date:** 2026-05-27
**Status:** Draft — pending implementation

---

## Problem Statement

The Fraktl backend handles a complex, multi-step pipeline (identify tree → retrieve botanical context → generate narrative → synthesize audio → persist scan) but that pipeline is invisible in the code. All six steps live inline inside a single route handler, every service failure is swallowed silently and returned as a zero value, and two unrelated concerns (image identification and narrative interpretation) are bundled into the same module which also leaks its internal OpenAI client to an unrelated service.

As a developer adding a new step to the scan pipeline (e.g., a Pl@ntNet fallback, cost tracking, retry logic), I have to read a route handler to understand the pipeline order, and I have no way to test pipeline error modes because all failures look like success from the outside.

As a user, I receive a successful scan result (HTTP 200) that may silently contain an empty audio URL, an empty image URL, a phantom scan ID (pointing to a DB record that was never written), or a generic fallback narrative — with no indication that anything went wrong.

---

## Solution

Introduce three architectural improvements that deepen the backend's module structure:

1. **Typed pipeline results** — every service that can fail returns an explicit `StepResult[T]` instead of a zero value. The pipeline can now distinguish success from partial failure and make informed degradation decisions.

2. **`ScanPipeline` module** — extract the scan orchestration from the router into a dedicated module. The router handles only HTTP concerns (request parsing, auth injection, response serialization). The pipeline module owns step ordering, error handling, and degradation strategy.

3. **Service module split** — separate `vision.py` into two focused modules (`identification` and `interpretation`) and eliminate the cross-module client import that currently couples `tts.py` to `vision.py`.

---

## User Stories

1. As a developer, I want the scan pipeline steps (identify → retrieve → narrate → synthesize → persist) to be defined in one place, so that I can understand the full flow by reading a single module.

2. As a developer, I want each pipeline step to return a typed result (value or error), so that I can write tests for individual failure modes without mocking the entire pipeline.

3. As a developer, I want to add a new step to the scan pipeline (e.g., a Pl@ntNet species fallback), so that I only need to modify the pipeline module — not the route handler.

4. As a developer, I want the scan router to contain only HTTP concerns (parsing, auth, response shape), so that I can test pipeline logic without spinning up an HTTP server.

5. As a developer, I want the tree identification logic to live in its own module, separate from the narrative generation logic, so that I can change the identification model (GPT-4o → Pl@ntNet) without touching the narrative module.

6. As a developer, I want the narrative interpretation module to depend only on its own inputs (identification result + RAG context), so that I can test it without constructing multimodal vision fixtures.

7. As a developer, I want `tts.py` to own its own OpenAI client, so that replacing the TTS provider (e.g., switching to ElevenLabs) requires touching only the TTS module.

8. As a developer, I want `save_scan` to return an explicit error signal when the DB write fails, so that I can test the "scan processed but not persisted" failure mode and surface it correctly to the client.

9. As a developer, I want `upload_file` to return an explicit error signal when the Supabase upload fails, so that the client receives a `null` audio/image URL rather than an empty string it can't distinguish from a valid URL.

10. As a developer, I want `generate_audio` to return an explicit error signal when TTS fails, so that the scan pipeline can choose to degrade gracefully (return text without audio) rather than return empty bytes silently.

11. As a user, I want to receive a clear signal when a scan partially fails (e.g., audio unavailable), so that I know whether the result is complete or degraded.

12. As a developer, I want to test the scan pipeline's degradation behavior (TTS failure → audio_url null, DB failure → 500), so that I have confidence in production error handling before deploying.

13. As a developer, I want each module's interface to match its responsibility precisely, so that reading a module's public functions tells me what it does without reading its implementation.

14. As a developer, I want the pipeline module to be testable by injecting mock implementations of each service, so that I can verify step ordering and error propagation without real API calls.

15. As a developer, I want the existing integration tests for `/scan` and `/history` to continue passing after the refactor, so that I have confidence no behavior was changed.

---

## Implementation Decisions

### 1. `StepResult[T]` — typed result wrapper

A lightweight generic wrapper replacing zero-value error patterns:

```python
# Prototype shape (decision-rich part only)
@dataclass
class StepResult(Generic[T]):
    value: T | None
    error: str | None

    @property
    def ok(self) -> bool:
        return self.error is None
```

Every fallible service returns `StepResult[T]` instead of a zero value. Services that currently return `""`, `b""`, or silently `pass` will return `StepResult(None, reason)` on failure.

This is a backend-internal type — it does NOT appear in the API response shape. The pipeline module decides what to do with a failed step (degrade, abort, or surface to client).

### 2. `ScanPipeline` — extracted orchestration module

A new module (e.g., `services/scan_pipeline.py`) that encapsulates the full scan flow:

- Accepts: `image_bytes: bytes`, `user_id: str`
- Returns: a `ScanResult` dataclass with all output fields, plus per-step error information
- All 6 steps are called in sequence inside this module
- Step failure policy defined here: TTS failure → degrade (no audio), DB failure → surface error, storage failure → surface error

The router becomes trivially thin: read image bytes → call `scan_pipeline.run()` → serialize `ScanResult` to JSON response.

### 3. `identification.py` and `interpretation.py` — split from `vision.py`

`vision.py` is split into two modules:

- **`identification.py`**: owns `identify_tree(image_bytes) -> StepResult[dict]`. Uses GPT-4o Vision (multimodal). Imports only its own prompt template.
- **`interpretation.py`**: owns `generate_narrative(identification, rag_context) -> StepResult[dict]`. Uses GPT-4o-mini (text only). Imports only its own prompt template.

Each module initializes its own `AsyncOpenAI` client. No cross-module client imports.

### 4. `tts.py` — owns its own OpenAI client

Remove the `from app.services.vision import openai_client` import. `tts.py` initializes `AsyncOpenAI(api_key=settings.openai_api_key)` directly. This eliminates the only cross-service seam leak in the backend.

### 5. API response shape for partial failures

Two degradation levels:

- **TTS failure**: return 200 with `audio_url: null`. Client already handles missing audio gracefully (text is still shown).
- **Storage failure** (audio or image): return 200 with `audio_url: null` / `image_url: null`. Scan is still persisted.
- **DB failure**: return 500. The scan was not persisted; returning a scan_id would be misleading.
- **Vision failure**: return 200 with fallback identification. Current behavior preserved.

This is a behavior change for DB failures (currently returns 200 with a phantom scan_id).

### 6. No changes to existing public API contract

- The fields in the `/scan` 200 response remain identical: `scan_id`, `species`, `symmetry_index`, `fibonacci_alignment`, `narrative`, `audio_url`, `image_url`.
- `audio_url` and `image_url` change type from `string` to `string | null` to represent upload failures.
- `/history` and `/scan/detect` are untouched.

### 7. No changes to the RAG pipeline or frontend

`rag/retriever.py` is out of scope. The `useFrameDetection` hook auth-coupling (Candidate 4 from the review) is explicitly deferred.

---

## Testing Decisions

**What makes a good test here:** tests should verify external behavior through module interfaces — what goes in and what comes out — not how the module calls its dependencies internally. A test that patches `openai_client.chat.completions.create` directly is testing the implementation; a test that injects a fake `identification` service into `ScanPipeline` is testing behavior.

### Modules to test

**`StepResult[T]`**
- Unit tests: `ok` property, `value` and `error` fields, generic behavior with different types.
- Prior art: none currently — this is a new type.

**`identification.py`**
- Unit tests: happy path returns structured species dict; bad JSON from model returns `StepResult(None, reason)`; API exception returns `StepResult(None, reason)`.
- Prior art: `test_scan.py::test_identify_tree_returns_structured_json` and `test_identify_tree_falls_back_on_bad_json` — these migrate directly.

**`interpretation.py`**
- Unit tests: happy path returns narrative dict; API exception returns `StepResult(None, reason)`.
- Prior art: `test_scan.py::test_scan_endpoint_returns_full_result` (narrative portion).

**`ScanPipeline`**
- Integration tests (no HTTP): inject mocked step functions, verify pipeline runs all steps; verify TTS failure → `audio_url: null`; verify DB failure → raises / returns error; verify storage failure → `image_url: null`.
- Prior art: `test_scan.py::test_scan_endpoint_returns_full_result` — the pipeline test replaces the mock-heavy route test for the happy path.

**`/scan` route handler (updated)**
- Integration tests via HTTP: thin — verify 200 with full result (mocking `scan_pipeline.run`); verify 500 on DB failure propagation; verify 401 on missing JWT.
- Prior art: `test_scan.py::test_scan_endpoint_returns_full_result` — stays but mocks only `scan_pipeline.run` (one seam vs. six).

**`tts.py`**
- Unit test: `generate_audio` returns `StepResult(bytes, None)` on success; `StepResult(None, reason)` on API exception.
- Prior art: no current TTS unit test — this is new coverage.

---

## Out of Scope

- `rag/retriever.py` — no changes; the ChromaDB/LangChain pipeline is a separate concern and has its own tests.
- `useFrameDetection` auth coupling (Candidate 4 from the architecture review) — deferred.
- Frontend changes — no UI changes required; the frontend already handles `null` audio gracefully.
- Model selection or prompt changes — not part of this refactor.
- Pl@ntNet fallback integration — `ScanPipeline` creates the seam, but wiring a second adapter is post-MVP.
- `db.py` full refactor — only `save_scan`'s return type changes to `StepResult[str]`; `fetch_history` is untouched.

---

## Further Notes

- The `vision.py` file should be deleted (not renamed) after its contents are split. Any import of `vision.py` in tests must be updated to import from `identification` or `interpretation`.
- `StepResult` should live in a shared location (e.g., `app/types.py`) since it is used by multiple service modules.
- The `_FALLBACK_IDENTIFICATION` and `_FALLBACK_NARRATIVE` dicts in the current `vision.py` should move to their respective new modules. The identification fallback becomes the `StepResult.value` when GPT-4o returns parseable-but-empty output; the narrative fallback remains as a last-resort sentinel only.
- The existing Supabase duplicate-client pattern (`_client = None` / `_get_client()` in both `db.py` and `storage.py`) is left as-is — it's an optimization concern, not a correctness issue.

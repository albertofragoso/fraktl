# Fraktl — Style Guide

> Applies to both `backend/` (Python) and `app/` (TypeScript/React Native).

---

## General

- No comments explaining WHAT code does — name things well instead
- Comments only for non-obvious WHY: hidden constraints, workarounds, invariants
- No dead code, no commented-out blocks
- No half-finished implementations — finish or don't add
- Prefer explicit over clever

---

## Python (Backend)

### Formatting & Linting

```bash
# Install (once)
pip install ruff

# Check
ruff check backend/

# Format
ruff format backend/
```

Config (`backend/pyproject.toml`):
```toml
[tool.ruff]
line-length = 100
target-version = "py312"
```

### Type Annotations

All functions must have type hints:

```python
# ✅
async def identify_tree(image_bytes: bytes) -> dict:

# ❌
async def identify_tree(image_bytes):
```

Return `dict` for JSON responses from OpenAI. Use `TypedDict` or dataclasses for internal data with fixed shape.

### Async

All route handlers and service functions that call external APIs must be `async`:

```python
# ✅
async def generate_audio(text: str) -> bytes:
    response = await openai_client.audio.speech.create(...)

# ❌ — blocks the event loop
def generate_audio(text: str) -> bytes:
    response = openai_client.audio.speech.create(...)
```

### Error Handling

Only validate at system boundaries (incoming request data, external API responses). Don't wrap internal function calls in try/except unless there's a specific recovery strategy.

```python
# ✅ — specific recovery
async def identify_tree(image_bytes: bytes) -> dict:
    try:
        response = await openai_client.chat.completions.create(...)
        return json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        return {"species": "Árbol desconocido", "confidence": 0.0, ...}

# ❌ — swallows errors silently
try:
    result = do_something()
except Exception:
    pass
```

### Imports

Group in order: stdlib → third-party → local. One blank line between groups.

```python
import json
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends
from openai import AsyncOpenAI

from app.config import settings
from app.middleware.auth import get_current_user
```

### Naming

| Item | Convention | Example |
|---|---|---|
| Functions | `snake_case` | `identify_tree`, `get_current_user` |
| Classes | `PascalCase` | `Settings` |
| Constants | `UPPER_SNAKE` | `IDENTIFY_PROMPT` |
| Files | `snake_case` | `vision.py`, `seed_rag.py` |

### Testing

- Write the failing test first (TDD)
- Use `patch` to mock all external services (OpenAI, Supabase)
- Never hit real APIs in tests
- Test file mirrors source path: `app/services/vision.py` → `tests/test_vision.py`
- Test names describe behavior: `test_dark_frame_returns_invalid_with_hint`

```python
# ✅ — descriptive, isolated
@pytest.mark.asyncio
async def test_identify_tree_falls_back_on_json_parse_error(bright_frame_bytes):
    mock_response = AsyncMock()
    mock_response.choices[0].message.content = "not valid json"
    with patch("app.services.vision.openai_client.chat.completions.create",
               return_value=mock_response):
        result = await identify_tree(bright_frame_bytes)
    assert result["species"] == "Árbol desconocido"
```

---

## TypeScript / React Native (Frontend)

### Formatting

```bash
cd app/
npx prettier --write .
```

### Component Structure

Functional components only. Props interface defined above the component:

```typescript
interface Props {
  hint: string
  onCapture: (uri: string) => void
}

export function ScanOverlay({ hint, onCapture }: Props) {
  // ...
}
```

### Naming

| Item | Convention | Example |
|---|---|---|
| Components | `PascalCase` | `AudioPlayer`, `ScanOverlay` |
| Hooks | `camelCase` with `use` prefix | `useFrameDetection` |
| Files (components) | `PascalCase.tsx` | `AudioPlayer.tsx` |
| Files (screens) | `kebab-case.tsx` (expo-router) | `result.tsx` |
| Constants | `UPPER_SNAKE` | `API_URL` |

### Styles

Use `StyleSheet.create()` — never inline style objects (causes re-renders):

```typescript
// ✅
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1c0f' }
})
<View style={styles.container} />

// ❌
<View style={{ flex: 1, backgroundColor: '#0f1c0f' }} />
```

### Color Palette

Defined once here — do not hardcode in components:

| Token | Hex | Usage |
|---|---|---|
| `background` | `#0f1c0f` | Screen backgrounds |
| `surface` | `#1a2e1a` | Cards, metric boxes |
| `primary` | `#2d5a2d` | Buttons, interactive elements |
| `accent` | `#a8e6a0` | Titles, highlighted text |
| `muted` | `#6b9c6b` | Secondary text, labels |
| `white` | `#ffffff` | Button text on primary |

> All screens are designed with the `frontend-design` skill before implementation. Do not deviate from its output.

### API Calls

Always get the session token before calls. Handle missing session:

```typescript
const { data: { session } } = await supabase.auth.getSession()
if (!session) { router.replace('/(auth)'); return }

const res = await fetch(`${API_URL}/endpoint`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: formData,
})
```

### Hooks

Clean up side effects on unmount:

```typescript
useEffect(() => {
  startDetection()
  return stopDetection  // cleanup
}, [])
```

### Testing

```typescript
// Mock fetch
global.fetch = jest.fn()
;(global.fetch as jest.Mock).mockResolvedValueOnce({
  json: async () => ({ valid: true, hint: 'Árbol detectado' }),
})

// Fake timers for polling hooks
jest.useFakeTimers()
jest.advanceTimersByTime(1100)
```

---

## Git

### Commit messages

Format: `type: description` (imperative, lowercase)

| Type | When |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Setup, config, dependencies |
| `docs` | Documentation only |
| `refactor` | Code change without behavior change |
| `test` | Tests only |

Examples:
```
feat: add heuristic tree frame detector
fix: handle json parse error in identify_tree
chore: add railway.toml with chromadb volume
docs: add api-reference for /scan endpoint
```

### Branch naming

```
feature/backend-scan-endpoint
feature/frontend-scan-screen
fix/chroma-seed-on-cold-start
```

### Worktrees

Use `superpowers:using-git-worktrees` skill for parallel backend/frontend work. See root `CLAUDE.md`.

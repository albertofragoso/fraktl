# Issue 02 — `StepResult[T]` shared type in `app/types.py`

**Type:** AFK  
**Blocked by:** None — can start in parallel with Issue 01  
**User stories:** #2, #8, #9, #10

---

## What to build

Introduce `StepResult[T]` as a shared generic type in `app/types.py`. This type replaces the zero-value error pattern used throughout the backend (`""`, `b""`, silent `pass`) with an explicit result that distinguishes success from failure. Every fallible service function will return `StepResult[T]` instead of a naked value.

This issue is a pure addition with no behavior changes — it defines the type and its tests, but does not yet migrate any service to use it. Migration happens in Issues 03 and 04.

The shape (from the PRD prototype, decision-rich part only):

```python
@dataclass
class StepResult(Generic[T]):
    value: T | None
    error: str | None

    @property
    def ok(self) -> bool:
        return self.error is None
```

## Acceptance criteria

- [ ] `app/types.py` exists and exports `StepResult`
- [ ] `StepResult` is generic: `StepResult[str]`, `StepResult[bytes]`, `StepResult[dict]` all work
- [ ] `.ok` returns `True` when `error is None`, `False` otherwise
- [ ] Unit tests cover: happy path (`ok=True`, value accessible), failure path (`ok=False`, error accessible), generic behavior with at least two concrete types
- [ ] No existing tests broken

## Blocked by

None — can start immediately

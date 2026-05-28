# Issue 01 — Frontend null safety for audio_url / image_url

**Type:** AFK  
**Blocked by:** None — must merge before any backend change  
**User stories:** #11

---

## What to build

Add null safety to `AudioPlayer` and the result screen so the frontend handles `audio_url: null` and `image_url: null` without crashing. The backend currently returns empty strings on failure, but the architecture refactor will change these to explicit `null`. This issue goes first so the backend changes are safe to deploy.

The behavioral expectation: when a scan succeeds but audio synthesis failed, the user sees the narrative text and a visible "Audio no disponible" fallback — not a blank screen or a JS crash.

## Acceptance criteria

- [ ] `AudioPlayer` component renders nothing (or a visible fallback message) when `audioUrl` is `null` or empty — no call to `Audio.Sound.createAsync(null)`
- [ ] `result.tsx` does not pass a null/empty URL to `AudioPlayer`; guard: `const hasAudio = audio_url != null && audio_url.length > 0`
- [ ] A test fixture with `{ audio_url: null, image_url: null }` in the Expo test suite confirms the result screen renders without error
- [ ] No regressions in the happy path (valid `audio_url` string still plays audio)

## Blocked by

None — can start immediately

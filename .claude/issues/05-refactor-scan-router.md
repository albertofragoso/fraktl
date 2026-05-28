# Issue 05 — Refactor scan router to use `ScanPipeline`

**Type:** AFK  
**Blocked by:** Issue 04  
**User stories:** #1, #3, #4, #15

---

## What to build

Replace the inline 6-step orchestration in `routers/scan.py` with a single call to `ScanPipeline.run()`. The router becomes responsible only for HTTP concerns: reading the uploaded image, injecting `user_id` from auth, calling the pipeline, and serializing the response.

The route handler after this change should be ~5 lines of meaningful code. If it is longer, something that belongs in the pipeline has leaked back into the router.

Update the router's test suite to mock only `scan_pipeline.run` (one seam) instead of the current 6 independent service mocks. The existing `test_scan_endpoint_returns_full_result` test patches six different services; after this issue it should patch one.

Existing behavior that must be preserved end-to-end:
- `POST /scan` returns all 7 response fields (adding `audio_status`)
- `POST /scan/detect` is untouched
- `GET /history` is untouched
- 401 on missing JWT still works

## Acceptance criteria

- [ ] `routers/scan.py::scan()` contains no direct calls to `identify_tree`, `get_context`, `generate_narrative`, `generate_audio`, `upload_file`, or `save_scan`
- [ ] Router test for `POST /scan` mocks `scan_pipeline.run` only — not individual services
- [ ] `test_scan_endpoint_returns_full_result` passes with the new one-seam mock
- [ ] `test_scan_endpoint_503_on_db_failure` test exists and passes (mock `scan_pipeline.run` to raise 503)
- [ ] `test_scan_endpoint_401` passes (no change needed, just confirm regression-free)
- [ ] Full test suite green: `pytest tests/ -v`
- [ ] `POST /scan` response shape is identical to pre-refactor (plus the new `audio_status` field)

## Blocked by

- Issue 04 — `ScanPipeline` module must be implemented and tested

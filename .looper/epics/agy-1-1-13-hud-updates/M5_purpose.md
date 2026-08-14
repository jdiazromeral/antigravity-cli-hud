---
validator: "npm run lint && npm test && npm run build"
max_iterations: 8
branch: epic/agy-1-1-13-hud-updates/M5
status: DONE
---

# Purpose
Fix step counting in `src/parser.ts` using a fast stat-cached counter on `transcript_path`:
1. Extraction hierarchy:
   - If `typeof parsed.step_count === 'number'`, use `parsed.step_count`.
   - Else if `typeof parsed.step_index === 'number'`, use `parsed.step_index`.
   - Else if `resolvedTranscriptPath` exists on disk:
     - Check `fs.statSync(transcript_path).mtimeMs`.
     - If mtime matches cached value, return cached `stepCount` instantly (<0.02ms).
     - If mtime changed (or on first read), count total step lines in `transcript_path` and cache `mtimeMs` + `stepCount`.
   - Else fallback to 0.
2. Follow strict TDD: write failing unit tests in `src/parser.test.ts` verifying that when `step_count` is absent but `transcript_path` exists, `stepCount` is accurately computed and cached. Commit failing tests separately.
3. Keep execution fast (<10ms, well within the 500ms budget) and robust against missing/corrupt transcript files.

# Acceptance criteria (hard — validator-checked)
- `step_count` in telemetry takes precedence over transcript reads.
- `step_index` in telemetry takes second precedence over transcript reads.
- When `step_count` and `step_index` are absent, `stepCount` is accurately computed from `transcript_path` (or resolved transcript path via `conversation_id`).
- When `transcript_path` mtime is unchanged, cached `stepCount` is returned instantly without re-reading file content.
- When `transcript_path` mtime changes, `stepCount` is recomputed and cache updated.
- Empty or corrupted transcript files fallback safely to 0 without throwing.
- `npm run lint && npm test && npm run build` passes cleanly.

# Acceptance criteria (soft — reviewer-checked)
- Follows strict TDD with failing unit tests committed separately in git history.
- Upholds Rule 8 (<2ms statusline latency with stat-cached zero-re-read I/O).
- Strict TypeScript conformance.

# Method
- TDD: Write failing unit tests in `src/parser.test.ts`, commit the failing tests separately, implement the stat-cached transcript counter in `src/parser.ts`, and verify all tests pass.

# Constraints
- Maintain <2ms statusline latency budget via stat mtime caching.

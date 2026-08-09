---
validator: npx vitest run src/parser.test.ts && npm test && npm run build
max_iterations: 5
branch: epic/melon-hud-streamline/M2
status: DONE
---

# Purpose
Eliminate blocking transcript.jsonl disk reads and memory line-splitting in `src/parser.ts` by reading `step_count` directly from telemetry payload (`parsed.step_count ?? parsed.step_index ?? 0`), and simplify `hooks/status-line.sh` to remove the recursive process-tree walking `ps` loop (invoke node directly with input piped). Ensure `src/parser.test.ts` verifies `step_count` parsing from payload without requiring transcript file reads.

# Acceptance criteria (hard — validator-checked)
- `src/parser.ts` resolves `stepCount` directly from `parsed.step_count ?? parsed.step_index ?? 0` without reading `transcript.jsonl` from disk or splitting lines in memory.
- `hooks/status-line.sh` is simplified to pipe input directly to `node "$DIR/../dist/index.js"` without walking the process tree with `ps`.
- `src/parser.test.ts` verifies `step_count` and `step_index` parsing from payload without disk transcript dependencies.
- `npx vitest run src/parser.test.ts && npm test && npm run build` passes cleanly.

# Acceptance criteria (soft — reviewer-checked)
- No unhandled runtime errors or regressions in statusline generation.

# Method
- Update `src/parser.ts` to assign `stepCount` directly from payload.
- Update `hooks/status-line.sh` to remove `ps` loop and pipe directly to node.
- Add test coverage in `src/parser.test.ts` for `step_count` / `step_index` extraction and absence of transcript disk reads.
- Run validator and build.

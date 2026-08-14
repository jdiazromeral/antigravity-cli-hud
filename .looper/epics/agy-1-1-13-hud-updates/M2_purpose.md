---
validator: "npm run lint && npm test"
max_iterations: 8
branch: epic/agy-1-1-13-hud-updates/M2
status: IN_PROGRESS
---

# Purpose
Enhance ActiveToolInfo parsing and formatting in `src/parser.ts` and `src/formatter.ts` to cleanly display live tool summaries and progressive in-flight queries (such as live `search_web` queries and task actions like "Killed task X", "Checked task X" from agy 1.1.13) with appropriate styling and responsive truncation.

# Acceptance criteria (hard — validator-checked)
- `src/parser.ts` extracts `activeTool` with live query, action, and summary synthesis (e.g. synthesizes "Killed task X" / "Checked task X" from task actions, streams `query` into `summary` for `search_web`, and handles status).
- `src/formatter.ts` formats `tool` telemetry with clean styling, status badges when failed/killed, and responsive truncation for long queries on narrow and wide terminals.
- `npm run lint && npm test` passes cleanly.

# Acceptance criteria (soft — reviewer-checked)
- Follows strict TDD with separate test and implementation commits.
- Strict TypeScript with no `any` leaks.
- Zero-Disk I/O on render path maintained (<2ms latency).

# Method
- TDD: Write failing unit tests in `src/parser.test.ts` and `src/formatter.test.ts`, commit the failing tests separately, implement the enhancements in `src/parser.ts` and `src/formatter.ts`, and verify all tests pass.
- Update `ActiveToolInfo` and `AntigravityPayload` interfaces and mock payloads across tests.

# Constraints
- Maintain <2ms statusline latency without blocking disk I/O.

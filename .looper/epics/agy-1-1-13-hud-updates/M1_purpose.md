---
validator: "npm run lint && npm test"
max_iterations: 8
branch: epic/agy-1-1-13-hud-updates/M1
status: DONE
---

# Purpose
Add robust parsing and formatting for direct GEMINI_API_KEY setups (where standard quota objects are absent or null, or plan_tier / email indicates API key mode) in src/parser.ts and src/formatter.ts, rendering an [API Key] badge / omitting broken 0% quota bars.

# Acceptance criteria (hard — validator-checked)
- `src/parser.ts` extracts `isApiKey` correctly when `is_api_key`, `api_key_mode`, `plan_tier`, `email`, or absent/null quota indicate API key mode.
- `src/formatter.ts` renders a styled `[API Key]` badge and omits broken 0% quota bars (`5h` and `weekly`) when `isApiKey` is true.
- `npm run lint && npm test` passes cleanly.

# Acceptance criteria (soft — reviewer-checked)
- Follows TDD with separate test and implementation commits.
- Strict TypeScript with no `any` leaks.
- Zero-Disk I/O on render path maintained.

# Method
- TDD: Write failing unit tests in `src/parser.test.ts` and `src/formatter.test.ts`, commit the failing tests separately, implement the changes, and verify all tests pass.
- Update `ParsedMetrics` interface and mock payloads across tests.

# Constraints
- Maintain <2ms statusline latency without blocking disk I/O.

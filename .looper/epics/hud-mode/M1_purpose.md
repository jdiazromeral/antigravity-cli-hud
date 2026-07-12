---
validator: "npm run test"
max_iterations: 8
branch: feature/hud-mode
status: DONE
---

# Purpose
Extract the active execution mode (`request-review`, `accept-edits`, or `plan`) from the CLI's `~/.gemini/antigravity-cli/settings.json`, parse it into the telemetry metrics in `src/parser.ts`, and render it dynamically on the HUD matrix via `src/formatter.ts`.

# Acceptance criteria (hard — validator-checked)
- `src/parser.test.ts` contains tests that verify `executionMode` is parsed correctly from a mocked `settings.json` (falling back to `request-review` when omitted).
- `src/formatter.test.ts` contains tests verifying that the mode is formatted with the correct visual string and color-coding (e.g., 🟡 `request-review`, 🟢 `accept-edits`, 🔵 `plan`).
- All tests pass when running `npm run test`.

# Acceptance criteria (soft — reviewer-checked)
- The `'mode'` block is explicitly added to the global `HUD_CONFIG.layouts` matrix so it automatically renders on the user's terminal.
- Missing or malformed configurations fall back safely without throwing unhandled exceptions that could crash the hook.

# Method
- Follow strict Test-Driven Development (TDD): write the failing test before implementing the logic.

# Constraints
- Do not edit any files outside of the `src/` or `tests/` directories.
- Do not globally mock `fs` in a way that breaks existing `hud_width.cache` reading logic; safely mock the directory or file paths specifically for `settings.json`.

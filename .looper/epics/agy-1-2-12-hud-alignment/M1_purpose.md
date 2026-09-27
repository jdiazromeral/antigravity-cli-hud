---
validator: "npm run typecheck && npm run lint && npm test && npm run build"
max_iterations: 8
branch: feat/agy-1-2-12-alignment
status: DONE
---

# Purpose
Align `antigravity-cli-hud` with Antigravity CLI (`agy`) v1.2.12:
1. Fix the symlink directory traversal bug in `src/audit.ts` (`auditMissingSkillIcons`) so symlinked plugins (e.g. `~/.gemini/config/plugins/tars`) are discovered.
2. Register the 16 missing skill icons in `SKILL_ICONS` (`src/formatter.ts`):
   - Built-ins: `automation` (⏱️), `plugin` (🔌), `ui-extension` (🧩), `ui-plugin-navigation` (🧭).
   - TARS suite: `ask` (💡), `capture` (📥), `digest` (📰), `end-of-day` (🌅), `gardener` (🌿), `promote` (💎), `sync-all` (🔄), `sync-gmail` (✉️), `sync-granola` (🥣), `sync-jira` (🎯), `sync-slack` (💬), `tasks` (📋).
3. Expand `AntigravityPayload` and `ParsedMetrics` (`src/parser.ts`) to parse:
   - `tool_confirmation_pending` (`bool`)
   - `pending_input_count` (`number`)
   - `cycle_mode` (`string`)
   - `battle` (`{ status: string; focused_arm?: string }`)
   - `model.effort` (`string`)
   - `vcs.client` (`string`)
4. Render:
   - `[⚠️ Tool Confirmation]` pulse badge when `tool_confirmation_pending` is true.
   - Model reasoning effort tag (e.g. `Gemini 3.8 Flash (medium)`) in the model block.
   - Battle mode arm display when `battle` telemetry is active.
5. Upgrade `src/audit.ts` to dynamically verify `types.StatusLineData` Go struct fields from `agy` binary strings and type tables.

# Acceptance criteria (hard — validator-checked)
- `npm run typecheck` exits 0 with zero TypeScript errors across all interfaces.
- `npm run lint` exits 0 with zero oxlint warnings/errors.
- `npm test` passes 100% of test suites, including new unit tests covering:
  - Symlink directory traversal in `auditMissingSkillIcons()`.
  - All 16 newly mapped skill icons in `SKILL_ICONS`.
  - Parsing and rendering of `tool_confirmation_pending` action badge.
  - Parsing and rendering of `model.effort` reasoning badge.
  - Parsing and rendering of `battle` telemetry block.
  - Dynamic Go struct extraction in `auditAgy()`.
- `npm run build` cleanly bundles all entry points into `dist/`.

# Acceptance criteria (soft — reviewer-checked)
- Adheres to TDD per AGENTS.md (failing tests committed first).
- Strict TypeScript: no `any` types introduced.
- Zero synchronous multi-megabyte disk I/O on the live statusline render path (<2ms latency maintained).

# Method
- Work in a clean git worktree at `worktrees/hud-v1.5.4`.
- TDD: write failing unit tests first in `src/audit.test.ts`, `src/formatter.test.ts`, and `src/parser.test.ts`.
- Implement changes in `src/audit.ts`, `src/formatter.ts`, and `src/parser.ts`.
- Rebuild dist and run `npm run sync`.

# Constraints
- Do not edit files outside `lab/antigravity-cli-hud` during worker iterations.

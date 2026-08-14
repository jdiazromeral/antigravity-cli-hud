---
validator: "npm run lint && npm test && npm run build"
max_iterations: 8
branch: epic/agy-1-1-13-hud-updates/M4
status: DONE
---

# Purpose
Refactor the Looper block formatting in `src/formatter.ts` to eliminate redundant strings and render a clean hierarchical tree:
1. Eliminate redundant repository / epic names:
   - When repo name equals epic name (e.g. in worktrees or single-repo checkouts), do NOT render `repo - Epic: epic`. Render as `🎯 Epic: ${epic}` (or `🎯 [${repo}] ${epic}` only when repo and epic names are distinct).
2. Render hierarchical tree formatting:
   - When missions belong to an active epic, nest them underneath the epic header:
     `🎯 ${epic} ${epicBar} [${done}/${total} DONE]`
     `   ↳ [${mission}] [${status}${suffix}]`
   - Standalone missions (not matched to an epic) render cleanly as `• [${mission}] [${status}${suffix}]`.
3. Follow strict TDD: write failing unit tests in `src/formatter.test.ts`, commit the failing tests separately, then implement the formatting changes and verify tests pass.
4. Uphold Rule 8 (Zero-Disk I/O on render path, <2ms render budget).

# Acceptance criteria (hard — validator-checked)
- When repo name equals epic name, epic header renders as `🎯 Epic: ${epic}` without redundant `repo - Epic:` prefixes.
- When repo name differs from epic name, epic header renders as `🎯 [${repo}] ${epic}`.
- Active missions matching an epic are nested hierarchically as `   ↳ [${mission}] [${status}${suffix}]`.
- Standalone missions render cleanly as `• [${mission}] [${status}${suffix}]`.
- `npm run lint && npm test && npm run build` passes cleanly.

# Acceptance criteria (soft — reviewer-checked)
- Follows strict TDD with failing unit tests committed separately in git history.
- Upholds Rule 8 (<2ms statusline latency without blocking disk I/O on render path).
- Strict TypeScript conformance.

# Method
- TDD: Write failing unit tests in `src/formatter.test.ts`, commit the failing tests separately, implement the formatting changes in `src/formatter.ts`, and verify all tests pass.

# Constraints
- Maintain <2ms statusline latency with Zero-Disk I/O on render path.

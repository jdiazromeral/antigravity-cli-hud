---
validator: "npm run lint && npm test && npm run build"
max_iterations: 8
branch: epic/agy-1-1-13-hud-updates/M3
status: DONE
---

# Purpose
Implement the generic Custom Executable Blocks engine as specified in ideas/antigravity-cli-hud/custom_blocks.md:
1. Allow `hud_config.json` to define custom blocks under `customBlocks` (e.g., `{ "custom_1": { "title": "Project", "command": "./script.sh", "intervalMs": 3000 } }`).
2. Allow matrix layouts (in small, medium, large) to place `custom_1`, `custom_2`, etc.
3. The HUD engine asynchronously executes the command in the background (or unref'd subprocess) and reads cached output in memory, ensuring render loop latency is strictly <1-2ms (upholding Rule 8).
4. Render custom blocks with clean styling and title headers matching the rest of the HUD.

# Acceptance criteria (hard — validator-checked)
- `loadHudConfig` loads `customBlocks` dictionary from `hud_config.json` and supports custom blocks placement in small, medium, and large layouts.
- `src/parser.ts` handles custom block execution asynchronously with caching in `~/.gemini/hud_custom_<blockId>.cache` and populates `ParsedMetrics.customBlocks`.
- `src/formatter.ts` renders custom blocks with styled headers/titles or standalone values, respecting `autoHideEmptyBlocks`.
- `npm run lint && npm test && npm run build` passes cleanly.

# Acceptance criteria (soft — reviewer-checked)
- Follows strict TDD with failing tests committed before implementation.
- Upholds Rule 8 (<2ms statusline latency without blocking disk I/O on render path).
- Strict TypeScript with no `any` leaks.

# Method
- TDD: Write failing unit tests in `src/parser.test.ts` and `src/formatter.test.ts`, commit the failing tests separately, implement the changes, and verify all tests pass.
- Update `ParsedMetrics` interface and mock payloads across tests.

# Constraints
- Maintain <2ms statusline latency without blocking disk I/O.

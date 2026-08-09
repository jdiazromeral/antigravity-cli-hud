---
validator: npx vitest run src/formatter.test.ts && npm test && npm run build
max_iterations: 5
branch: epic/melon-hud-streamline/M3
status: DONE
---

# Purpose
Decouple HUD matrix configuration from TypeScript source editing and esbuild recompilation by enabling `src/formatter.ts` to load user overrides from `~/.gemini/hud_config.json` at runtime (merging with `DEFAULT_HUD_CONFIG` / `HUD_CONFIG`), and update `skills/hud-config/SKILL.md` to instruct agents to edit `~/.gemini/hud_config.json` directly without needing esbuild compilation. Add unit test coverage in `src/formatter.test.ts` verifying custom runtime layout loading.

# Acceptance criteria (hard — validator-checked)
- `src/formatter.ts` exports `DEFAULT_HUD_CONFIG`, `HUD_CONFIG`, and `loadHudConfig(customPath?: string)` which merges `~/.gemini/hud_config.json` (or specified customPath) with default layout, budget, and breakpoint configurations.
- `formatMetrics` in `src/formatter.ts` applies the merged configuration dynamically at runtime (or accepts an optional config override).
- `skills/hud-config/SKILL.md` is updated to instruct editing `~/.gemini/hud_config.json` directly and eliminates obsolete instructions to edit `src/formatter.ts` and run `npm run build`.
- `src/formatter.test.ts` includes unit tests verifying loading custom configuration from JSON files, merged overrides, and custom layout rendering.
- `npx vitest run src/formatter.test.ts && npm test && npm run build` passes cleanly.

# Acceptance criteria (soft — reviewer-checked)
- Configuration loading is fault-tolerant: corrupted or missing JSON files safely fall back to `DEFAULT_HUD_CONFIG` without throwing.

# Method
- Implement `loadHudConfig` in `src/formatter.ts` with safe JSON parsing and deep property merging.
- Update `formatMetrics` to use `loadHudConfig()` by default or accept a custom config.
- Update `skills/hud-config/SKILL.md`.
- Add test coverage in `src/formatter.test.ts`.
- Run validator and build.

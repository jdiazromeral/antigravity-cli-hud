# Mission M3 — declarative-runtime-layout-config
- base_commit: d9717303941cca5726413b31a938fd60b7486c03
- contract_hash: 0096ba2b2f1efdba46b3c27a95956555ae682657

## Preflight
- Validator: `npx vitest run src/formatter.test.ts && npm test && npm run build` → PASS

## Iteration 1
- Worker did: Enabled declarative runtime HUD layout and budget overrides by implementing `loadHudConfig` in `src/formatter.ts` that safely parses `~/.gemini/hud_config.json` and deeply merges with `DEFAULT_HUD_CONFIG`. Updated `skills/hud-config/SKILL.md` to instruct writing directly to `~/.gemini/hud_config.json` without requiring source edits or esbuild recompilation. Added unit and integration tests in `src/formatter.test.ts` covering runtime layout loading, fallback on invalid JSON, and custom layout rendering.
- Worker learned: Loading configuration dynamically from a lightweight JSON file at runtime decouples user customizations from the plugin build pipeline, avoiding build errors, TypeScript recompilation delays, and code divergence across plugin updates.
- Commits: deb447e
- Verdict: DONE
- Validator: PASS
- Reviewer: APPROVE

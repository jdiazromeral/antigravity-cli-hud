# Epic: melon-hud-streamline

Streamline the Antigravity HUD plugin based on adversarial Melon review: prune ghost subsystems and dead code, eliminate runtime I/O bottlenecks (blocking disk transcript parsing and process tree walking), and decouple matrix configuration from code recompilation.

## [M1] dead-code-and-clutter-purge
- **Purpose**: Permanently delete ghost subsystems (`src/quota.ts`, `src/subagents.ts`, `src/doctor.ts` and their tests), remove dead exports from `src/index.ts`, delete root repository junk (`diff.txt`, `log.txt`, `payload.json`, `scripts/demo.js`), and update knowledge base maps.
- **Dependencies**: None
- **Validator**: `npm test && npm run build && ! test -f src/quota.ts && ! test -f src/subagents.ts && ! test -f src/doctor.ts && ! test -f diff.txt && ! test -f log.txt`
- **Status**: DONE

## [M2] latency-optimization-and-parser-streamline
- **Purpose**: Eliminate blocking `transcript.jsonl` disk reads and memory line-splitting in `src/parser.ts` by reading `step_count` directly from telemetry payload, and simplify `hooks/status-line.sh` to remove process-tree walking `ps` loop.
- **Dependencies**: [M1]
- **Validator**: `npx vitest run src/parser.test.ts && npm test && npm run build`
- **Status**: DONE

## [M3] declarative-runtime-layout-config
- **Purpose**: Decouple HUD matrix configuration from TypeScript source editing and `esbuild` recompilation by enabling `src/formatter.ts` to load user overrides from `~/.gemini/hud_config.json` at runtime, and update `skills/hud-config/SKILL.md`.
- **Dependencies**: [M2]
- **Validator**: `npx vitest run src/formatter.test.ts && npm test && npm run build`
- **Status**: PENDING

# Epic: agy-future-readiness

Future readiness, plugin sync automation, telemetry schema fuzzing, and diagnostic healthchecks for the Antigravity HUD CLI plugin.

## [M1] auto-sync-plugin-hook
- **Purpose**: Implement an automated build & sync utility that compiles dist/ and syncs files directly to ~/.gemini/config/plugins/hud/ to keep live CLI statuslines 100% in sync with workspace code.
- **Dependencies**: None
- **Validator**: `npm run build && node scripts/sync_installed_plugin.js --test`
- **Status**: PENDING

## [M2] telemetry-fuzzing-guard-rails
- **Purpose**: Expand parser test fixtures with fuzzed and experimental telemetry JSON payloads to guarantee 100% crash-free parser resilience against future agy CLI updates.
- **Dependencies**: None
- **Validator**: `npx vitest run src/parser.test.ts`
- **Status**: PENDING

## [M3] hud-doctor-diagnostic
- **Purpose**: Build a diagnostic healthcheck utility (src/doctor.ts & /hud-config doctor) to verify settings.json bindings, file permissions, and active plugin path alignment.
- **Dependencies**: [M1]
- **Validator**: `npx vitest run src/doctor.test.ts`
- **Status**: PENDING

## [M4] subagent-tree-visualizer-polish
- **Purpose**: Enhance subagent tree hierarchy formatting in src/formatter.ts for deep nesting levels (> 2) and narrow terminals with responsive truncation.
- **Dependencies**: [M2]
- **Validator**: `npx vitest run src/formatter.test.ts`
- **Status**: PENDING

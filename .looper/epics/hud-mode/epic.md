# Epic: hud-mode

Upgrade the HUD to fully support Antigravity v1.1.1 features, optimizing performance and exposing new agent telemetry to the terminal matrix.

## [M1] Extract Active Execution Mode
- **Purpose**: Parse mode from settings.json and add mode block to formatter matrix.
- **Dependencies**: None
- **Validator**: `npm run test`
- **Status**: DONE

## [M2] Optimize Git Polling
- **Purpose**: Leverage the new `vcs` payload from v1.1.1 telemetry to instantly extract branch/dirty state without OS blocking (cp.execSync), keeping the legacy caching as a fallback for older clients.
- **Dependencies**: [M1]
- **Validator**: `npm run test`
- **Status**: IN_PROGRESS

## [M3] Display Transcript Log
- **Purpose**: Parse `transcript_path` from the v1.1.1 payload and add a new `'transcript'` block to `src/formatter.ts` that displays an indicator or a shortened path so the user knows exactly where to `tail -f` their agent's logs.
- **Dependencies**: [M1]
- **Validator**: `npm run test`
- **Status**: IN_PROGRESS

## [M4] Context Limit Warning
- **Purpose**: Parse `exceeds_200k_tokens` from the payload. If true, dynamically alter the `ctx` (Context) formatting block to turn critical/red, warning the user that the agent may start degrading.
- **Dependencies**: [M1]
- **Validator**: `npm run test`
- **Status**: DONE (Skipped formal artifacts)

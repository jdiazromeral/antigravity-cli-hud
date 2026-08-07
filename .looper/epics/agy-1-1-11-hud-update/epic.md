# Epic: agy 1.1.11 HUD Updates

Integrate the new UI-facing features from the `agy` 1.1.11 update into the Antigravity CLI HUD. This involves adding support for the Vim Editor Mode badge and checking/implementing the AI Credits display.

## [M1] Vim Mode Badge
- **Purpose**: Parse the Vim editing mode state from the telemetry payload in `src/parser.ts` and display a styled mode badge (e.g., `[N]`, `[I]`, `[V]`) in `src/formatter.ts`.
- **Dependencies**: None
- **Validator**: `npm run lint && npm run test`
- **Status**: BLOCKED

## [M2] AI Credits Block
- **Purpose**: Investigate the telemetry payload for AI credit balances (addressed in `agy` 1.1.11 fixes) in `src/parser.ts` and add a new visual layout block for credits in `src/formatter.ts` alongside or instead of the quota bars.
- **Dependencies**: [M1]
- **Validator**: `npm run lint && npm run test`
- **Status**: PENDING

# Epic: agy 1.1.13 HUD Updates & Custom Blocks

Integrate the new telemetry and engine capabilities from `agy` 1.1.13 into `antigravity-cli-hud`, while implementing declarative Custom Executable Blocks so workspace-level telemetry can be displayed without polluting core plugin logic.

## [M1] API Key Mode & Quota Null-Safety
- **Purpose**: Add robust parsing and formatting for direct `GEMINI_API_KEY` setups (where standard quota objects are absent) in `src/parser.ts` and `src/formatter.ts`, rendering an `[API Key]` badge and avoiding broken 0% quota bars.
- **Dependencies**: None
- **Validator**: `npm run lint && npm test`
- **Status**: DONE

## [M2] In-Flight Tool Summary Streaming
- **Purpose**: Enhance `ActiveToolInfo` formatting in `src/formatter.ts` to cleanly display live tool summaries and progressive queries (e.g. streaming web searches and task lifecycle actions introduced in 1.1.13).
- **Dependencies**: [M1]
- **Validator**: `npm run lint && npm test`
- **Status**: DONE

## [M3] Declarative Custom Executable Blocks Engine
- **Purpose**: Implement the generic Custom Executable Blocks feature in `src/formatter.ts` and `src/parser.ts` as specified in `ideas/antigravity-cli-hud/custom_blocks.md`, executing external shell commands asynchronously with caching to adhere to Rule 8 (<2ms render path budget).
- **Dependencies**: [M2]
- **Validator**: `npm run lint && npm test && npm run build`
- **Status**: DONE

## [M4] Looper Block Hierarchy & De-duplication
- **Purpose**: Refactor Looper block formatting in `src/formatter.ts` into a clean hierarchical tree (grouping active missions under their parent epic) and eliminating redundant repository/epic name echoes.
- **Dependencies**: [M3]
- **Validator**: `npm run lint && npm test && npm run build`
- **Status**: PENDING

## [M5] Ultra-Fast Incremental Step Counter
- **Purpose**: Fix step counting in `src/parser.ts` by using a stat-cached incremental counter on `transcript_path` when `step_count` is absent in telemetry payload, upholding Rule 8 (<2ms render path budget).
- **Dependencies**: [M4]
- **Validator**: `npm run lint && npm test && npm run build`
- **Status**: PENDING

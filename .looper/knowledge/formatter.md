# Subsystem: formatter

## Purpose
The Dynamic Matrix Engine format logic. Calculates the physical UI grid based on real-time terminal width, maps the parsed metrics into visual blocks, applies layout logic, and outputs the final string.

## Key Files and Entry Points
- `src/formatter.ts` — Houses `HUD_CONFIG` for breakpoints, progress bar / quota styling helpers, and `formatMetrics()` which takes `ParsedMetrics` and terminal width to generate the UI string.

## Flow
1. Receives `ParsedMetrics` and terminal width.
2. Selects appropriate layout array based on width breakpoints.
3. Maps each configured block key to its corresponding formatted string.
4. Prepends matrix brackets (`┌─`, `├─`, `└─`) and calculates strict padding to absorb micro-fluctuations (hysteresis filtering).
5. Returns a single string representing the rendered layout.

## Gotchas
- **Dynamic Culling**: Empty arrays for tasks or subagents collapse completely unless `autoHideEmptyBlocks: false` is configured.
- **Hysteresis Filtering**: Do not change layout padding without testing hysteresis. Small width oscillations should not cause the UI to "bounce".
- **Subagents Caveat**: `'subagents'` must be the LAST item inside its respective array to accommodate its horizontal overflow logic.

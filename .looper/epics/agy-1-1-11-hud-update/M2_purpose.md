---
validator: "grep -q 'credits' src/parser.ts && npm run lint && npm run test"
max_iterations: 8
branch: epic/agy-1-1-11-hud-update/M2
status: DONE
---

# Purpose
Investigate the telemetry payload for AI credit balances (addressed in agy 1.1.11 fixes) in src/parser.ts and add a new visual layout block for credits in src/formatter.ts alongside or instead of the quota bars.

# Acceptance criteria (hard — validator-checked)
- `src/parser.ts` contains the string 'credits'.
- Linter passes without errors.
- Vitest suite (`npm run test`) passes.

# Acceptance criteria (soft — reviewer-checked)
- A new visual layout block for AI credit balances is present in `src/formatter.ts` alongside or instead of the quota bars.
- Terminal HUD output strings for the credit block are visually styled and utilize Nerd Font icons.

# Method
- **Test-Driven Development (TDD)**: You MUST write failing tests first, verify they fail, write the minimum code to make them pass, and then refactor. Commit the failing test separately from the implementation so the commit trail proves TDD was followed.
- When updating core interfaces like ParsedMetrics, you must update the corresponding mock data payloads across the entire test suite.

# Constraints
- Strict TypeScript: Avoid using `any` and explicitly type all payloads and interfaces.
- Mocking: Never hardcode paths like os.homedir() in Vitest mocks. Use `path.join(os.homedir(), ...)` to prevent cross-environment test fragility. Do not use hardcoded literal string placeholders like `/tmp/mock-homedir`.

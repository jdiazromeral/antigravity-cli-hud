---
validator: "grep -q 'editor_mode' src/parser.ts && npm run lint && npm run test"
max_iterations: 8
branch: hud-m1
status: FAILED
---

# Purpose
Parse the Vim editing mode state from the telemetry payload in src/parser.ts and display a styled mode badge (e.g., [N], [I], [V]) in src/formatter.ts.

# Acceptance criteria (hard — validator-checked)
- The telemetry parser extracts the Vim editing mode.
- The formatter returns a styled mode badge for the Vim mode.
- Tests in `npm run test` confirm parsing and formatting of the new badge.

# Acceptance criteria (soft — reviewer-checked)
- Follows the codebase styling conventions.
- Smallest vertical slice of the new behavior.

# Method
- TDD: write a failing test first, verify they fail, write minimum code to make them pass, then refactor. You must commit the failing test separately from the implementation.
- Strict TypeScript: Avoid using `any` and explicitly type all payloads and interfaces.
- Mocking: Dynamically insert the homedir into test cases using `path.join(os.homedir(), ...)` to prevent cross-environment test fragility. Do not use hardcoded literal string placeholders like `/tmp/mock-homedir`.
- Interface Updates: When updating core interfaces like ParsedMetrics, update the corresponding mock data payloads across the entire test suite.

# Constraints
- NEVER write a custom Node.js validator script (e.g. `node -e "import(...)"`) that imports the plugin's main entry points.

---
validator: "npm run lint && npm run test"
max_iterations: 8
branch: epic/agy-1-1-11-hud-update/M1
status: BLOCKED
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
- TDD: write a failing test first.
- Documentation: Update relevant README or documentation files when changing public APIs.

# Constraints
- (none)

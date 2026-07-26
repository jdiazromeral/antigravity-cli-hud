---
validator: "npm run test"
max_iterations: 5
branch: feature/hud-nested-agents
status: IN_PROGRESS
deliverable: draft-pr
worker_model: inherit
---

# Purpose
Refactor the subagents telemetry parser and HUD matrix formatter to correctly process and visually nest grandchild (and deeper) subagents introduced in Antigravity CLI 1.1.1. Assume the JSON payload now streams an optional `depth` property (number, default 0) on each subagent. Parse this `depth` and render nested agents with visual indentation (e.g., prefixing them with spaces and a `↳` Nerd Font icon relative to their depth) to clearly represent the agent tree hierarchy in the terminal block.

# Acceptance criteria (hard — validator-checked)
- The test suite remains green (`npm run test` exits 0).

# Acceptance criteria (soft — reviewer-checked)
- Nested agents (depth > 0) are visually indented in the output string using Nerd Font tree characters (e.g., `  ↳ `).
- Payload interfaces are explicitly typed and avoid `any`.
- Mock payloads in the test suite are fully updated to include the `depth` field.

# Method
- TDD: Write the failing test before the implementation. **You must commit the failing test separately from the implementation so the commit trail proves TDD was followed.**
- Mocking: Never hardcode paths like os.homedir() in Vitest mocks. Dynamically insert the homedir into test cases using `path.join(os.homedir(), ...)` to prevent cross-environment test fragility. **Do not use hardcoded literal string placeholders like `/tmp/mock-homedir`.**

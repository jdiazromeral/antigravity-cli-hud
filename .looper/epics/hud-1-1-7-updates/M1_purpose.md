---
validator: "npm run test"
max_iterations: 8
branch: feature/hud-effort-block
status: IN_PROGRESS
deliverable: draft-pr
worker_model: inherit
---

# Purpose
Update the HUD telemetry parser and display matrix to support the new features introduced up to Antigravity CLI 1.1.7. Specifically, parse and render the `effort` tier (introduced in 1.1.5) as a colored badge or matrix block. Additionally, if the execution `mode` or custom `agent` name are now streamed natively in the JSON payload, parse them directly from the stream to eliminate disk-read latency.

# Acceptance criteria (hard — validator-checked)
- The test suite remains green (`npm run test` exits 0).

# Acceptance criteria (soft — reviewer-checked)
- Output strings for the new `effort` block/badge are visually styled and utilize Nerd Font icons.
- Payload interfaces are explicitly typed without using `any`.
- Mock data payloads across the test suite are fully updated to match the modified `ParsedMetrics` interface.

# Method
- TDD: Write the failing test before the implementation. Verify it fails, implement the minimum code, then refactor.
- Ensure mock paths dynamically use `os.homedir()` rather than hardcoding paths.

# Constraints
- Do not introduce any new third-party dependencies.

---
validator: "test -f AGENTS.md && ! test -f LOOPER.md && grep -q \"/looper:tdd\" AGENTS.md"
max_iterations: 8
branch: update-looper-config-M1
status: DONE
---

# Purpose
Rename `LOOPER.md` to `AGENTS.md` and update its contents to reference the new namespaced `looper` plugin paths (e.g., `/looper:tdd`).

# Acceptance criteria (hard — validator-checked)
- `AGENTS.md` exists and `LOOPER.md` does not.
- `AGENTS.md` contains the string "/looper:tdd".

# Acceptance criteria (soft — reviewer-checked)

# Method

# Constraints
- Do not make changes outside of this scope.

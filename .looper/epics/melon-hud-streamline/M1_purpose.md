---
validator: npm test && npm run build && ! test -f src/quota.ts && ! test -f src/subagents.ts && ! test -f src/doctor.ts && ! test -f diff.txt && ! test -f log.txt
max_iterations: 5
branch: epic/melon-hud-streamline/M1
status: DONE
---

# Purpose
Permanently delete ghost subsystems (`src/quota.ts`, `src/subagents.ts`, `src/doctor.ts` and their unit tests `src/quota.test.ts`, `src/subagents.test.ts`, `src/doctor.test.ts`), remove dead exports from `src/index.ts`, delete root repository junk (`diff.txt`, `log.txt`, `payload.json`, `scripts/demo.js`), and update `.looper/knowledge/MAP.md`.

# Acceptance criteria (hard — validator-checked)
- `src/quota.ts`, `src/subagents.ts`, and `src/doctor.ts` are removed.
- `src/quota.test.ts`, `src/subagents.test.ts`, and `src/doctor.test.ts` are removed.
- `diff.txt`, `log.txt`, and `scripts/demo.js` are deleted.
- Dead `runDoctor` export is removed from `src/index.ts`.
- `npm test` and `npm run build` pass cleanly.

# Acceptance criteria (soft — reviewer-checked)
- `.looper/knowledge/MAP.md` and `.looper/knowledge/` are updated to remove citations to deleted files.

# Method
- Remove ghost files, delete repo junk, remove unused exports in `src/index.ts`, and update knowledge map.

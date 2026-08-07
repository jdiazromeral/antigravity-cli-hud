# Mission M1 — Vim Mode Badge
- base_commit: 03ea4af4e94e13ee61ec5c653ee09fdded5ce49a
- contract_hash: e9d02c453938971169c4c6a72c61be76ee45c4bd

## Preflight
- Validator: `npm run lint && npm run test` → FAIL (the gap to close)
The validator fails on pre-existing lint errors (70 errors) and test failures (src/parser.test.ts) that are unrelated to the mission's scope. In epic mode, the contract cannot be re-pinned to a narrower validator without user approval, so the mission is blocked.

# Mission M1 — Parse Vim editing mode
- base_commit: 09ec0e6b45cc3d5d46f42644015081a24140257e
- contract_hash: 7e13b510f400f58d334e51918a058578cf09477d

## Preflight
- Validator: `grep -q 'editor_mode' src/parser.ts && npm run lint && npm run test` → FAIL (the gap to close)
Validator failed with exit code 1.

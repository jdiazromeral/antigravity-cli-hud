# Mission M1 — Extract Active Execution Mode
- base_commit: 2c8b58ad61fa2c6057f33f93172b790b60b8e42b
- contract_hash: 038a712189c75ca588619b4bb807315865345631

## Preflight
- Validator: `npm run test` → FAIL (the gap to close)
```
 FAIL  src/parser.test.ts > parseStream > executionMode parsing > should parse executionMode from settings.json
 FAIL  src/parser.test.ts > parseStream > executionMode parsing > should default to request-review if mode is missing in settings.json

Test Files  1 failed | 3 passed (4)
Tests  3 failed | 10 passed (13)
```

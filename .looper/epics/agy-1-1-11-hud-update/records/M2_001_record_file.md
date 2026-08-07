# Mission M2 — Investigate the telemetry payload for AI credit balances
- base_commit: 72b368435dcb30ae947162e6a0582f50d7a780fb
- contract_hash: 95382132032455b673de511cd2707d3b83016c5d

## Preflight
- Validator: `grep -q 'credits' src/parser.ts && npm run lint && npm run test` → FAIL (the gap to close)

# Mission M2 — Investigate the telemetry payload for AI credit balances
- base_commit: 72b368435dcb30ae947162e6a0582f50d7a780fb
- contract_hash: 95382132032455b673de511cd2707d3b83016c5d

## Preflight
- Validator: `grep -q 'credits' src/parser.ts && npm run lint && npm run test` → FAIL (the gap to close)

## Iteration 1
- Worker did: Updated `src/parser.ts` to parse `credits: { balance: number }` from telemetry payload into `ParsedMetrics.credits`. Updated `src/formatter.ts` to conditionally display a styled AI credits block using Nerd Font icons, hiding quota bars when credits are present. Followed TDD by committing failing tests first.
- Worker learned: The `activeLayout` matrix in `HUD_CONFIG` dynamically handles row rendering; to conditionally swap blocks like quotas for credits, dynamically swapping keys during the row map iteration works cleanly without altering the base layout config structure.
- Commits: f78f6b4, 7c5df75
- Verdict: DONE
- Validator: PASS
- Steering for next: You left `package-lock.json` uncommitted, violating the "never leave the tree dirty" rule. Please investigate if this change is intentional, commit it if so, or restore it, and then report DONE again.

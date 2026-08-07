# Mission M1 — Vim Mode Badge
- base_commit: 69926e7bb2b5cb1d8b3b821011426e175f13fc79
- contract_hash: e9d02c453938971169c4c6a72c61be76ee45c4bd

## Preflight
- Validator: `npm run lint && npm run test` → PASS
The validator is already green against base_commit. In epic mode, the protocol mandates setting status to BLOCKED and returning BLOCKED(validator green at preflight) because a green validator cannot prove the work was done.

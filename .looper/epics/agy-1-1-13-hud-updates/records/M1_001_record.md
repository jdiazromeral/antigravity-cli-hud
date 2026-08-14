# Mission M1 — API Key Mode & Quota Null-Safety
- base_commit: 37cb47f4f099844b0f49709d7f770f5f058b05e6
- contract_hash: 7e13b510f400f58d334e51918a058578cf09477d

## Preflight
- Validator: `npm run lint && npm test` → FAIL (7 tests failed)
Validator failed with exit code 1.

## Iteration 1
- Worker did: Followed strict TDD by first writing failing unit tests in `src/parser.test.ts` and `src/formatter.test.ts` and committing them in `6d8b3101e9c3a2f69d4c786f4113e699b33a611b`. Then implemented `isApiKey` detection in `src/parser.ts` and formatted `[API Key]` badge while omitting broken 0% quota bars in `src/formatter.ts` in `a3c3f81758acee7003328bc2727979b0336ec6eb`.
- Worker learned: In direct API key setups, quotas are null/absent and spawning background quota refreshes is unnecessary. Omitting quota blocks and cleanly substituting `[API Key]` badge across both wide and narrow terminal layouts prevents UI distortion and broken 0% bars.
- Commits: 6d8b3101e9c3a2f69d4c786f4113e699b33a611b, a3c3f81758acee7003328bc2727979b0336ec6eb
- Verdict: DONE
- Validator: PASS

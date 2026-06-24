# Subsystem: parser

## Purpose
Defensively reads and parses the raw JSON payload streamed continuously by the Antigravity CLI into `stdin`. Ensures the HUD never crashes by employing global fallbacks and nullish coalescing.

## Key Files and Entry Points
- `src/index.ts` — `main()` entry point. Calls the parser and formatter, handling critical unhandled exceptions to prevent crashing the Antigravity session.
- `src/parser.ts` — Houses the `parseStream()` function which buffers and parses the continuous `stdin` stream, converting it to the strongly-typed `ParsedMetrics` interface.

## Flow
1. Antigravity CLI pushes JSON pulses into the background script's `stdin`.
2. `src/index.ts` waits on `parseStream(process.stdin)`.
3. `src/parser.ts` buffers chunks and strict-parses the payload.
4. Returns `ParsedMetrics` which contains safely typed values with defaults applied.

## Gotchas
- **Silent Failures**: The parser must wrap `JSON.parse` in a strict `try/catch`. If the CLI hook crashes, the UI will permanently hang. Use nullish coalescing extensively for partial initialization payloads.

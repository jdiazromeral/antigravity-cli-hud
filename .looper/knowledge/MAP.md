---
built_at_commit: e7685deb138dc7dbe394d2d7a3c3a4ff85e1972e
built_at: 2026-08-15T14:40:00Z
---

# Codebase map: antigravity-cli-hud

A production-grade, highly responsive terminal HUD plugin for the Antigravity CLI. It dynamically monitors agent state, token context, quota buckets, and active subagents in real-time, using a dynamically-rendered Matrix Engine with hysteresis filtering to prevent layout bouncing.

## Commands
- build: `npm run build`   test: `npm run test`   run: `/statusline ~/.gemini/config/plugins/hud/hooks/status-line.sh`   lint: `npm run lint`

## Subsystems
- **parser** (`src/`) — Reads JSON telemetry from stdin and safely parses it into typed metrics. Details: `knowledge/parser.md`
- **formatter** (`src/`) — The Matrix Engine that calculates layout based on terminal width and formats telemetry blocks. Details: `knowledge/formatter.md`

## Where to find what
- Defensively parsing the `stdin` JSON payload → `parser`
- Layout algorithms, breakpoints, and UI components → `formatter`
- Antigravity hooks specification → `HOOKS.md`
- Layout configuration manual → `LAYOUT_ENGINE.md`

## Glossary
See `knowledge/glossary.md` for the project's ubiquitous language.

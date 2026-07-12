# `.looper/knowledge/` — codebase knowledge base

**For agents.** This folder is context that looper agents read while working —
the `mapper` skill generates it, and looper missions inject `MAP.md` +
`glossary.md` into worker prompts. You don't write or maintain it by hand.

This README is the one human-facing file here; everything else is agent context.
What's in the folder:

- `MAP.md` — the codebase index (architecture, commands, subsystems) agents read first.
- `<area>.md` — per-subsystem detail agents open on demand.
- `glossary.md` — the project's shared vocabulary.
- `check_kb.sh` — a validator that checks the KB is accurate and current.

## Keeping it useful (what you do)
- **Refresh it** when the code has moved: re-run the mapper.
- **Trust the code, not the KB**, if they disagree — the KB is an accelerator,
  never the source of truth. `MAP.md`'s `built_at_commit` records what it was
  built against; `check_kb.sh` fails when it has drifted too far.
- **Commit it** with your project so every contributor's agents share it.

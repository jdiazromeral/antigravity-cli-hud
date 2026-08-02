# Ubiquitous Language & Terminology Glossary

This file documents the shared domain terms used across `antigravity-cli-hud` missions and worker subagents.

---

## Terminology & Definitions

- **Statusline / Telemetry Hook**: The CLI extension process executed by Antigravity CLI that reads `stdin` telemetry JSON streams and outputs terminal ANSI formatted lines.
- **Soft Limit (`softLimitTokens`)**: The token threshold (defaults to 200,000 / 200k) at which LLM reasoning quality starts degrading. Controls microbar fill scaling.
- **Physical Capacity (`limitTokens`)**: The maximum physical token capacity supported by the model architecture (e.g. 1,048,576 / 1M tokens for Gemini 3.6).
- **Plugin Workspace Sync**: The process of building local workspace code in `lab/antigravity-cli-hud` and updating the active installed plugin at `~/.gemini/config/plugins/hud/`.
- **Telemetry Fuzzing**: Testing the JSON parser against random, missing, or malformed JSON keys to guarantee zero runtime crashes.
- **HUD Doctor**: The diagnostic utility that inspects `~/.gemini/antigravity-cli/settings.json` to verify statusline command bindings and file permissions (`0600`/`0700`).
- **Subagent Tree Depth**: The visual nesting hierarchy level (`depth: 0`, `depth: 1`, `depth: 2`) representing parent-child subagent executions in the statusline.

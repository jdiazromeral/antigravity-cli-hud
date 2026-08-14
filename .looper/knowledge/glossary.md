# Glossary

- **Vim Mode Badge**: A visual indicator (e.g., `[N]`, `[I]`, `[V]`) in the HUD status line that displays the user's current Vim editor mode, introduced in `agy` 1.1.11.
- **AI Credits**: An alternative to standard API quotas (gemini-weekly, gemini-5h) representing a pay-as-you-go balance.
- **API Key Mode**: Direct Gemini API execution mode (`GEMINI_API_KEY`) where standard quota structures are omitted or null, requiring graceful status display.
- **Tool Step Summary**: Live action descriptions and progressive in-flight queries streamed into `tool_info.summary` (e.g. active `search_web` query strings).
- **Custom Executable Block**: An extensible HUD layout block configured in `hud_config.json` that renders the cached output of an external shell command without blocking the <2ms render loop.
- **Telemetry Payload**: The JSON stream of metrics emitted by the `agy` CLI that the HUD parses in `src/parser.ts` to drive the visual blocks.
- **HUD Config (`hud_config.json`)**: Declarative JSON file located at `~/.gemini/hud_config.json` defining runtime user matrix layouts, responsive breakpoints, and budget ceilings without requiring TypeScript recompilation.

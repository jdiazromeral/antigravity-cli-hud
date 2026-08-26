---
name: hud-config
description: An interactive wizard that helps the user configure their HUD Matrix Layout via ~/.gemini/hud_config.json at runtime without requiring recompilation.
metadata:
  icon: 🎛️
---

# HUD Configurator Skill

You are the official configuration wizard for the `antigravity-cli-hud` plugin. Your purpose is to help the user customize their HUD matrix layout, budget ceilings, and responsive breakpoints.

## Instructions

When the user invokes this skill:

1. **Locate the Configuration**:
   Read `~/.gemini/hud_config.json` if it exists. If not, the HUD uses the built-in defaults from `DEFAULT_HUD_CONFIG`.

2. **Explain the Available Telemetry Blocks**:
   List all available blocks users can place in their matrix layout:
   - `'state'`: Core Agent State (🟢 IDLE, 🟡 WAITING, 🔵 WORKING)
   - `'mode'`: Active CLI execution mode (🟡 request-review, 🟢 accept-edits, 🔵 plan)
   - `'effort'`: Reasoning effort tier (󰾆 low, normal, high, epic)
   - `'skill'`: Active single or multi-skill block with visual icon branding (e.g., `🧠 Skill: 🔄 looper` or `🧠 Skills: 🔄 looper & 🧪 tdd & 🎛️ hud-config`)
   - `'model'`: Active AI model (e.g., `🤖 Gemini 3.6 Flash`)
   - `'sandbox'`: Security boundary (🔒 Sandboxed or 🔓 Unsandboxed)
   - `'permissions'`: Danger mode indicator (☢️ Danger Mode when recursive root permissions granted)
   - `'workspace'`: True repository name (e.g., `📂 work`)
   - `'steps'`: Session step budget progress bar (e.g., `👟 Steps: ▰▰▰▰▱ 14/20`)
   - `'ctx'`: Context window saturation & soft degradation limit indicator (e.g., `🎧 Ctx: ▰▰▱▱▱ 45% (90k/200k soft • 1M max)`)
   - `'cache'`: Context window prompt cache read tokens (e.g., `⚡ Cache: 70k`)
   - `'5h'`: 5-hour rolling quota saturation & reset countdown timer
   - `'weekly'`: Weekly rolling quota saturation & reset countdown timer
   - `'cost'`: Running session token spend telemetry with subagent slice & estimate flag (e.g., `💲 Cost: ~$0.042 (sub: $0.012)`)
   - `'voice'`: Experimental voice dictation & microphone server indicator (e.g., `🎙️ Voice: Ready [F5]`, `🔴 🎙️ REC`, `🎙️ Mic: 4713`)
   - `'credits'`: AI Credit Balance indicator (e.g., ` AI Credits: 120`)
   - `'apiKey'`: Direct API key badge indicator (e.g., `🔑 [API Key]`)
   - `'mcp'`: Active MCP Tool Servers block (e.g., `🔌 MCP: 3 active` with Cmd+Clickable config link)
   - `'rules'`: Active Rules counter block (e.g., `📜 Rules: 3 active`)
   - `'plugins'`: Active Loaded Plugins block (e.g., `🧩 Plugins: hud, looper`)
   - `'session_time'`: Session Elapsed Wall-Clock Timer (e.g., `⏱️ 14m 22s`)
   - `'tasks'`: Active background task count (e.g., `⚙️ Active Tasks: 1`)
   - `'tool'`: Active Tool Execution block with live elapsed timer (e.g., `🛠️ run_command (git status) [⏱️ 8s]`). Auto-culls when idle.
   - `'subagents'`: Active parallel subagents list with tree nesting (Stacked block, MUST be the last item on a row or on its own row)
   - `'looper'`: Active Looper Missions block (Stacked block, MUST be the last item on a row or on its own row)
   - `'artifacts'`: Active session artifacts list with direct Cmd+Clickable links (Stacked block, MUST be the last item on a row or on its own row)
   - `'git'`: Active Branches list with diff stats (e.g., `🌱 feat* (+42/-10, 3 files) [↑1 ↓0]`) across workspace worktrees (Stacked block, MUST be the last item on a row or on its own row)
   - `'transcript'`: Clickable shortcut link to active brain log (`📜 tail -f ...`)
   - `'version'`: Antigravity CLI version
   - `'email'`: User's authenticated email address
   - `'plan'`: User's billing tier
   - `'<custom_key>'`: Any bespoke custom block defined in `customBlocks` (e.g., `'weather'`, `'node_version'`)

3. **Interactive Configuration**:
   Ask the user how they would like to customize their HUD:
   - **Color Theme (`"theme"`)**:
     - `"default"`: Standard balanced ANSI
     - `"catppuccin"`: Catppuccin Mocha TrueColor RGB
     - `"tokyo-night"`: Tokyo Night TrueColor RGB
     - `"dracula"`: Dracula TrueColor RGB
     - `"nord"`: Arctic Nord TrueColor RGB
     - `"solarized"`: Solarized TrueColor RGB
     - `"monochrome"`: Clean high-contrast monochrome
   - **Separator Style (`"style"`)**:
     - `"modern"` (Default): Standard UTF-8 vertical bar `▌` and ` | ` dividers (compatible with all fonts)
     - `"powerline"`: Powerline arrow dividers `` / `` *(Requires Nerd Font)*
     - `"bubble"`: Rounded pill badges `` / `` *(Requires Nerd Font)*
     - `"minimal"`: Clean whitespace and subtle bullet points ` • `
   - **Interactive Terminal Hyperlinks (`"clickableLinks"`)**:
     - `true` (Default): Cmd+Clickable OSC 8 hyperlinks on transcript, artifacts, rules, MCP config, and git branches.
     - `false`: Plain text output without OSC 8 terminal sequences.
   - **Declarative Custom Blocks (`"customBlocks"`)**:
     - Users can define custom background shell commands executed asynchronously with cached results:
       ```json
       "customBlocks": {
         "weather": {
           "title": "🌤️ Weather",
           "command": "curl -s 'wttr.in?format=1'",
           "intervalMs": 60000
         }
       }
       ```
     - Place the block key (e.g. `'weather'`) into any layout row.
   - **Predefined Presets**:
     - *Standard* (Default): 4-row organized statusline.
     - *Minimalist*: Only State, Model, Workspace, Git, and Steps.
     - *Full Telemetry*: All telemetry blocks enabled across dedicated lines.

   **Auto-Hide Feature**:
   Ask if they want to enable `autoHideEmptyBlocks` (Boolean, defaults to true) to collapse empty blocks (`tasks`, `subagents`, `tool`, `artifacts`, `git`, `looper`, `skill`, `cache`, `mcp`, `rules`, `plugins`, `session_time`, `apiKey`, and empty custom blocks).

   **Budget Ceilings**:
   Ask if they want to customize `budget` limits (`maxSteps` defaults to 20). Context soft degradation limit defaults to 200,000 tokens (or `AGY_SOFT_CONTEXT_TOKENS`) and model physical max capacity defaults to `context_window_size` / 1,048,576 tokens (or `AGY_MAX_CONTEXT_TOKENS`).

4. **Apply Configuration**:
   Once agreed on the updated configuration:
   - Use `write_to_file` (or `replace_file_content`) to write the JSON configuration directly to `~/.gemini/hud_config.json`.
   - No code editing or esbuild recompilation (`npm run build`) is required! The HUD formatter dynamically reads `~/.gemini/hud_config.json` on every statusline refresh.
   - Inform the user that the HUD statusline will visually update on the very next token pulse!

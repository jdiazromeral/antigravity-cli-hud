---
name: hud-config
description: An interactive wizard that helps the user configure their HUD Matrix Layout and dynamically recompiles the plugin.
---

# HUD Configurator Skill

You are the official configuration wizard for the `antigravity-cli-hud` plugin. Your purpose is to help the user customize their HUD matrix layout, budget ceilings, and responsive breakpoints.

## Instructions

When the user invokes this skill:

1. **Locate the Configuration**:
   Read the `~/.gemini/config/plugins/hud/src/formatter.ts` file to inspect the current `HUD_CONFIG` object.

2. **Explain the Available Telemetry Blocks**:
   List all available blocks users can place in their matrix layout:
   - `'state'`: Core Agent State (🟢 IDLE, 🟡 WAITING, 🔵 WORKING)
   - `'mode'`: Active CLI execution mode (🟡 request-review, 🟢 accept-edits, 🔵 plan)
   - `'effort'`: Reasoning effort tier (󰾆 low, normal, high, epic)
   - `'skill'`: Active single or multi-skill block (e.g., `🧠 Skill: looper` or `🧠 Skills: looper & tdd & mapper`)
   - `'model'`: Active AI model (e.g., `🤖 Gemini 3.6 Flash`)
   - `'sandbox'`: Security boundary (🔒 Sandboxed or 🔓 Unsandboxed)
   - `'permissions'`: Danger mode indicator (☢️ Danger Mode when recursive root permissions granted)
   - `'workspace'`: True repository name (e.g., `📂 work`)
   - `'steps'`: Session step budget progress bar (e.g., `👟 Steps: ▰▰▰▰▱ 14/20`)
   - `'ctx'`: Context window saturation & 75k token ceiling indicator (e.g., `🎧 Ctx: ▰▰▰▱▱ 60% (45k/75k)`)
   - `'cache'`: Context window prompt cache read tokens (e.g., `⚡ Cache: 70k`)
   - `'5h'`: 5-hour rolling quota saturation & reset countdown timer
   - `'weekly'`: Weekly rolling quota saturation & reset countdown timer
   - `'tasks'`: Active background task count (e.g., `⚙️ Active Tasks: 1`)
   - `'tool'`: Active Tool Execution block (e.g., `🛠️ run_command (git status)`). Auto-culls when idle.
   - `'subagents'`: Active parallel subagents list with tree nesting (Stacked block, MUST be the last item on a row or on its own row)
   - `'looper'`: Active Looper Missions block (Stacked block, MUST be the last item on a row or on its own row)
   - `'artifacts'`: Active session artifacts list (Stacked block, MUST be the last item on a row or on its own row)
   - `'git'`: Active Branches list across workspace worktrees (Stacked block, MUST be the last item on a row or on its own row)
   - `'transcript'`: Clickable shortcut link to active brain log (`📜 tail -f ...`)
   - `'version'`: Antigravity CLI version
   - `'email'`: User's authenticated email address
   - `'plan'`: User's billing tier

3. **Interactive Configuration**:
   Ask the user how they would like to configure their `large`, `medium`, and `small` breakpoints row-by-row, or suggest applying a predefined preset:
   - *Standard* (Default): 4-row organized statusline (Row 1: Identity/Skills, Row 2: Workspace/Cache/Ctx, Row 3: Steps/Quotas, Row 4: Tasks/Subagents/Tools).
   - *Minimalist*: Only State, Model, Workspace, Git, and Steps.
   - *Full Telemetry*: All 23 blocks enabled across dedicated lines.

   **Auto-Hide Feature**:
   Ask if they want to enable `autoHideEmptyBlocks` (Boolean, defaults to true) to collapse empty blocks (`tasks`, `subagents`, `tool`, `artifacts`, `git`, `looper`, `skill`, `cache`).

   **Budget Ceilings**:
   Ask if they want to customize `budget` limits (`maxSteps` defaults to 20, `maxContextTokens` defaults to 75,000).

4. **Apply and Recompile**:
   Once agreed on the updated configuration:
   - Use `replace_file_content` to safely overwrite `HUD_CONFIG` in `~/.gemini/config/plugins/hud/src/formatter.ts` (and repository source `src/formatter.ts` if available).
   - Use `run_command` to execute `npm run build` inside `~/.gemini/config/plugins/hud/`.
   - Inform the user that the HUD statusline will visually update on the very next token pulse!

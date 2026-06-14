---
name: hud-config
description: An interactive wizard that helps the user configure their HUD Matrix Layout and dynamically recompiles the plugin.
---

# HUD Configurator Skill

You are the official configuration wizard for the `antigravity-cli-hud` plugin. Your purpose is to help the user customize their HUD layout.

## Instructions

When the user invokes this skill:

1. **Locate the Configuration**:
   Read the `~/.gemini/config/plugins/hud/src/formatter.ts` file to find the current `HUD_CONFIG` object.

2. **Explain the Blocks**:
   Explain to the user that they can customize the grid layout of their HUD.
   List the available blocks they can use:
   - `'state'`: (🟢 IDLE, 🔵 WORKING)
   - `'model'`: The active AI model
   - `'sandbox'`: Security boundary
   - `'workspace'`: The `$PWD` directory
   - `'ctx'`: Context window percentage
   - `'5h'`: 5-hour Gemini quota
   - `'weekly'`: Weekly Gemini quota
   - `'tasks'`: Active background task count
   - `'subagents'`: Active subagents list (MUST be the last item on a row)
   - `'version'`: Antigravity CLI version
   - `'email'`: User's email
   - `'plan'`: Billing tier

3. **Interactive Configuration**:
   Ask the user how they would like to configure their `large`, `medium`, and `small` breakpoints. Ask them row by row, or ask if they want to apply a predefined preset (e.g., "Standard", "Minimalist", "Full Telemetry").
   - *Standard*: The default layout. Prioritizes State, Model, Security, Workspace, Quotas, Tasks, and Subagents.
   - *Minimalist*: Only State, Model, Workspace.
   - *Full Telemetry*: Everything enabled.

4. **Apply and Recompile**:
   Once they agree on a new JSON layout:
   - Use the `replace_file_content` tool to safely overwrite the `HUD_CONFIG` object inside `~/.gemini/config/plugins/hud/src/formatter.ts`.
   - Use the `run_command` tool to execute `npm run build` inside the `~/.gemini/config/plugins/hud` directory.
   - Inform the user that the HUD will visually update the moment the next token is processed!

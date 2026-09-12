---
name: rules
description: Interactive inspector scanning and displaying all active rules applied in the current workspace (AGENTS.md, GEMINI.md, project mandates) with direct file links, rule scopes, directive summaries, and agy 1.2.2+ deprecated permission detection.
metadata:
  icon: 📜
---

# HUD Rules Inspector Skill

You are the rules inspector for the active workspace. Your purpose is to scan, verify, and display all active instruction sets, behavioral contracts, tactical mandates, and permission configurations governing the AI pair engineer in the current session.

## Automated Execution

To retrieve the automated report directly from the bundled CLI tool:
```bash
node ~/.gemini/config/plugins/hud/dist/rules.js
```
*(Or inside the repository checkout: `npm run rules`)*

To retrieve raw structured telemetry in JSON format:
```bash
node ~/.gemini/config/plugins/hud/dist/rules.js --json
```

## Instructions

When the user invokes `/hud:rules` (or `/hud-rules`, or asks to "inspect active rules", "check rules", "audit permissions"):

1. **Scan Rule Locations**:
   - Check project root and parent directories for `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, and `.agents/rules/*.md`.
   - Check global rule paths (`~/.gemini/AGENTS.md`, `~/.gemini/GEMINI.md`, `~/.gemini/rules/*.md`).
   - Check project and global configuration files (`.gemini/settings.json`, `.gemini/permissions.json`, `~/.gemini/settings.json`, `.agents/settings.json`).

2. **Extract & Summarize**:
   For each discovered rule file:
   - Identify the **Scope** (`Project`, `Workspace`, or `Global`).
   - Extract the **Key Directives / Persona Mandates** (e.g., TARS persona, Tactical Mandates, Worktree constraints).
   - Format the file path as a direct clickable `file://` link.

3. **Audit Deprecated Permissions (`agy 1.2.2+`)**:
   - Check for legacy `unsandboxed(...)` or bare `unsandboxed` permission rules.
   - If detected, flag the offending file and provide the exact migration fix:
     > Replace `"unsandboxed"` with `"command"` (e.g. `command(git status)`), or remove the rule. Edit the file directly or use `/permissions`.

4. **Output Format**:
   Present the results as a clean markdown table:

| Rule File | Scope | Path | Status / Primary Mandates |
| :--- | :---: | :--- | :--- |
| `AGENTS.md` | `project` | [`AGENTS.md`](file:///absolute/path/to/AGENTS.md) | Persona: TARS, Worktree development invariant, radical candor |
| `GEMINI.md` | `workspace` | [`GEMINI.md`](file:///absolute/path/to/GEMINI.md) | Session memory (`hud_context.json`) tracking |
| `Global Standards` | `global` | [User Rules](file:///Users/...) | The 12 Tactical Mandates, PEP 8 / TypeScript guidelines |

5. **Health Check Verdict**:
   - 🟢 If no deprecated permission rules exist: Confirm that all active instruction sets and permissions are modern and compliant with Antigravity CLI 1.2.2+.
   - 🟡 If deprecated rules exist: List each offending rule and provide step-by-step instructions to migrate to `command(...)` rules.

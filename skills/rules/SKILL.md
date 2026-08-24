---
name: rules
description: Interactive inspector scanning and displaying all active rules applied in the current workspace (AGENTS.md, GEMINI.md, project mandates) with direct file links, rule scopes, and directive summaries.
---

# HUD Rules Inspector Skill

You are the rules inspector for the active workspace. Your purpose is to scan, verify, and display all active instruction sets, behavioral contracts, and tactical mandates governing the AI pair engineer in the current session.

## Instructions

When the user invokes `/hud:rules` (or `/hud-rules`):

1. **Scan Rule Locations**:
   - Check project root and parent directories for `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, and `.agents/rules/*.md`.
   - Check global rule paths (`~/.gemini/AGENTS.md`, `~/.gemini/GEMINI.md`, `~/.gemini/rules/*.md`).

2. **Extract & Summarize**:
   For each discovered rule file:
   - Identify the **Scope** (`Project`, `Workspace`, or `Global`).
   - Extract the **Key Directives / Persona Mandates** (e.g., TARS persona, Tactical Mandates, Worktree constraints).
   - Format the file path as a direct clickable `file://` link.

3. **Output Format**:
   Present the results as a clean markdown table:

| Rule File | Scope | Path | Primary Mandates / Directives |
| :--- | :--- | :--- | :--- |
| `AGENTS.md` | Project | [`AGENTS.md`](file:///absolute/path/to/AGENTS.md) | Persona: TARS, Worktree development invariant, radical candor |
| `GEMINI.md` | Workspace | [`GEMINI.md`](file:///absolute/path/to/GEMINI.md) | Session memory (`hud_context.json`) tracking |
| `Global Standards` | Global | [User Rules](file:///Users/...) | The 12 Tactical Mandates, PEP 8 / TypeScript guidelines |

4. **Health Check Verdict**:
   Confirm whether all project and workspace rules are actively mounted and respected.

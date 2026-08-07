# Changelog

All notable changes to the **Antigravity HUD Plugin** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.11] - 2026-08-07

### Added
- **Vim Mode Badge**: Parses the Vim editing mode state from the telemetry payload and displays a styled mode badge (e.g., `[N]`, `[I]`, `[V]`) alongside the execution mode.
- **AI Credits Block**: Dynamically parses AI credit balances from the telemetry payload and adds a new visual layout block with Nerd Font icons, overriding quota bars when credits are present.

---

## [1.1.10] - 2026-08-04

### Added
- **Default Large Layout Update**: Added `version` and `plan` blocks to the default `large` matrix layout in `src/formatter.ts`.

---

## [1.1.9] - 2026-08-01

### Added
- **3-Tier Hybrid Ceiling Resolution Order:** Implemented ceiling resolution priority for context window and step budgets: Environment Variables (`AGY_MAX_CONTEXT_TOKENS`, `AGY_MAX_STEPS`) > `/hud-config` settings (`HUD_CONFIG.budget`) > Physical Telemetry (`context_window_size`).
- **Session Step Budget Block (`steps`):** Visual 5-character step progress bar (`👟 Steps: ▰▰▰▰▱ 14/20`) tracking session step ceilings.
- **Bundled Token Evaluation Hook:** Included `scripts/token_eval_hook.py` executable script for session token ledger tracking and 20-step / 75k token budget ceiling enforcement.
- **Multi-Skill Telemetry Block (`skill`):** Real-time tracking of single (`🧠 Skill: looper`) or multiple (`🧠 Skills: looper & tdd & mapper`) active skills aggregated across main agent tool usage, subagent roles, and looper missions. Auto-culls when no skills are active.
- **Micro Progress Bars:** Integrated 5-character micro progress bars (`▰▰▱▱▱`) with Traffic Light color coding for `Ctx`, `5h`, `Weekly` quotas, and Looper Epics.
- **Active Tool Telemetry Block (`tool`):** Displays real-time tool execution status (e.g. `🛠️ run_command (git status)`), powered by `agy` 1.1.8/1.1.9 `tool_info` telemetry stream. Auto-culls when no tool is active.
- **Subagent Conversation ID Display:** Subagent entries now surface truncated conversation IDs (`[id:sub-88]`), parsed from enriched `subagents` telemetry.

### Fixed
- **Physical Model Capacity Formatting:** `Ctx` block now parses physical model context window capacity (`context_window_size`) from telemetry (e.g. `128k/1M`) using `formatTokenCount` helper.
- **Real-Time Step Count Resolution:** Resolved active `transcript.jsonl` log file path via `conversation_id` (`~/.gemini/antigravity-cli/brain/<conversationId>/.system_generated/logs/transcript.jsonl`) when `transcript_path` is omitted in heartbeat telemetry, ensuring live step count updates.

### Changed
- **Cache Before Context:** Positioned `cache` token read block before `ctx` saturation block across all statusline layouts.
- **Dedicated Quotas & Steps Row:** Organized `steps`, `5h`, and `weekly` quota blocks onto a dedicated line directly below workspace and context saturation.
- **Modern Accent Bar UI:** Replaced repetitive `┌─`, `├─`, `└─` comb brackets with a state-colored accent bar (`▌`) and clean guide line (`│`).
- **Strict Session Memory Scoping:** Removed greedy auto-scan of `lab/` and `worktrees/` when `hud_context.json` is missing or empty. Git branches are now strictly scoped to `hud_context.json` or direct `cwd` git repos.
- **Contextual Terminal Window Titles:** Window titles now explicitly include repository name prefixes (`repo:branch`) when multiple repos or root workspace paths are active.

---

## [1.1.8] - 2026-07-28

### Added
- **Cache Token Reads Block (`cache`):** Displays context cache token hits (`⚡ Cache: 70k`).
- **3-Tier Traffic Light Color Coding:** Color codes percentage-based metrics (`Ctx`, `5h`, `Weekly`) as Green (<60%), Yellow (60-84%), and Red (>=85%).

---

## [1.1.7] - 2026-07-15

### Added
- **Grandchild Subagent Nesting:** Visually nests deep subagents using tree hierarchy indentation (`↳`).
- **Looper Epic Progress Tracking:** Integrates `.looper/epics/` progress bars directly into statusline.

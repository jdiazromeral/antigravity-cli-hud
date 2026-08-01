# Changelog

All notable changes to the **Antigravity HUD Plugin** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.9] - 2026-08-01

### Added
- **Active Tool Telemetry Block (`tool`):** Displays real-time tool execution status (e.g. `🛠️ run_command (git status)`), powered by `agy` 1.1.8/1.1.9 `tool_info` telemetry stream. Auto-culls when no tool is active.
- **Subagent Conversation ID Display:** Subagent entries now surface truncated conversation IDs (`[id:sub-88]`), parsed from enriched `subagents` telemetry.

### Changed
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

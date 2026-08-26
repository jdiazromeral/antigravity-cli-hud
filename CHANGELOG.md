# Changelog

All notable changes to the **Antigravity HUD Plugin** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-08-26

### Added
- **Running Session Cost Telemetry (`'cost'` Block):** Full support for Antigravity CLI 1.1.21's new `cost` telemetry model (`types.StatusLineCost`), displaying unrounded real-time spend (`total_usd`, `subagent_usd`, `estimated`) with adaptive micro-cent precision (`$0.0042`, `~$0.042`, `(sub: $0.012)`).
- **Subagent Cost Attribution:** Parses and renders individual subagent cost spend badges directly within the subagents hierarchy tree view.
- **Hierarchical & Multi-Directory Rules Discovery:** Scans standard project-level `.agents/rules/*.md` and `.agent/rules/*.md`, walks ancestor directories to repository roots, and scans global rules (`~/.gemini/config/rules/*.md`).
- **Expanded Skill Branding:** Added comprehensive icon mappings across modern official and plugin skills (`melon 🍉`, `agy-customizations ⚙️`, `antigravity-guide 🪐`, `address-review 💬`, `code-review 🧐`, `codebase-design 🏗️`, `diagnosing-bugs 🩺`, `domain-modeling 🏛️`, `grilling 🔥`, `prototype 🛠️`, `research 📚`, `wizard 🧙`, `writing-for-agents ✍️`, `migrate-to-shoehorn 👞`, `setup-pre-commit 🪝`, `git-guardrails-claude-code 🛡️`, `scaffold-exercises 📋`, `resolving-merge-conflicts ⚔️`).
- **Dynamic Cost Culling:** Automatically hides empty or zero-value cost telemetry when `autoHideEmptyBlocks: true` without leaving orphaned whitespace.

---

## [1.4.1] - 2026-08-25

### Added
- **Antigravity CLI 1.1.20 Skill Icon Visual Branding:** Added `metadata.icon` frontmatter declarations (`🎛️` and `📜`) to bundled skills (`hud-config` and `rules`) for visual branding in the `/skills` catalog list.
- **Skill Visual Branding in HUD Statusline:** Enriched `skill` telemetry block with iconic badges mapped across ecosystem skills (`looper 🔄`, `tdd 🧪`, `mapper 🗺️`, `hud-config 🎛️`, `rules 📜`, `code-review 🧐`, etc.) with namespace-aware fallback.
- **Windows PowerShell Title Hook Parity:** Added `hooks/title.ps1` for native UTF-8 dynamic window title progress on Windows environments.
- **Extended Subagent & Task Action Streaming:** Synthesizes `manage_subagents` lifecycle actions (`kill`, `kill_all`, `list`) and `manage_task` (`kill_all`) in the in-flight tool telemetry block.

### Tooling
- **Oxlint Script Standardization:** Updated `npm run lint` in `package.json` to `npx oxlint --deny-warnings` for environment resilience.

---

## [1.4.0] - 2026-08-24

### Added
- **TrueColor 24-Bit Theming Engine:** 7 built-in themes (`default`, `catppuccin`, `tokyo-night`, `dracula`, `nord`, `solarized`, `monochrome`) configured via `"theme"` in `~/.gemini/hud_config.json`.
- **Nerd Font Separator Styles:** 4 interchangeable layout styles (`modern` UTF-8 bar, `powerline` chevron arrows ``, `bubble` rounded pills ``/``, and `minimal` whitespace/bullets) configured via `"style"` in `~/.gemini/hud_config.json`.
- **Interactive OSC 8 Terminal Hyperlinks:** Cmd+Clickable terminal hyperlinks on transcript paths, artifacts, MCP config, rules, and git branches, with zero-width regex strip ANSI hardening.
- **Stateful In-Flight Tool Execution Timer:** Caches tool execution start timestamps across ephemeral hook process ticks via `~/.gemini/hud_tool_${conversationId}.json` to display live elapsed seconds (`🛠️ run_command (npm test) [⏱️ 8s]`).
- **Extended Developer Telemetry Blocks:** Added `mcp` (active tool servers), `rules` (active behavioral mandates), `plugins` (loaded CLI plugins), `session_time` (wall-clock elapsed timer), and enriched `git` diff statistics (`+42/-10, 3 files ↑1 ↓0`).
- **Windows PowerShell Support:** Added native UTF-8 PowerShell hook wrapper `hooks/status-line.ps1`.
- **Dynamic Terminal Title Progress:** Terminal window title dynamically displays active tool name and step progress (`[🛠️ run_command] agy - work (main) [Gemini 3.6 Flash] [👟 14/20] 🔵 WORKING`).
- **Rules Inspector Skill:** Added `/hud:rules` for scanning and summarizing active behavioral mandates.

### Fixed
- **OSC 8 Regex Width Bug:** Extended `stripAnsi` in `src/formatter.ts` to strip both SGR and OSC 8 sequences, preventing skewed column width calculations and unintended line wrapping.
- **Hyperlink URI Encoding:** Encoded path segments with `encodeURIComponent` to prevent broken `file://` hyperlinks when workspace directories contain spaces or `#` characters.
- **Accurate Branch Hyperlinks & Plain-Text Fallback:** Tracks verified absolute filesystem paths for git branches, opening the exact directory on Cmd+Click when present on disk and falling back cleanly to plain text with zero broken links.

### Tooling & Build Engine
- **TypeScript 7.0 in Go:** Upgraded core compiler to native multi-threaded Go (`typescript@7.0.2`), adding `npm run typecheck` (`tsc --noEmit` runs in ~0.3s).
- **Native Rust Linter (`oxlint`):** Migrated from Node-bound ESLint to `oxlint` (runs in 5ms across the entire test & source tree with 0 errors).
- **Strict Typing & Module Syntax:** Enforced `verbatimModuleSyntax`, `exactOptionalPropertyTypes`, and `noUncheckedIndexedAccess`.

---

## [1.3.1] - 2026-08-15

### Security & Privacy Hardening
- **Identifier Validation & Path Traversal Protections:** Added strict alphanumeric validation (`isSafeIdentifier`) on `conversation_id`, `session_id`, and `blockKey` to prevent directory traversal outside `~/.gemini/antigravity-cli/brain/`.
- **Restricted Custom Block Permissions:** Pre-creates temporary cache files with `0o600` (user-only read/write) permissions, preventing sensitive command outputs from leaking via permissive shell umask redirection.
- **Zero-Disk DoS Prevention:** Enforces a 2MB maximum read ceiling (`MAX_READ_BYTES`) in `countTranscriptSteps` to eliminate Node event-loop blocking and memory allocation crashes during real-time rendering on multi-megabyte agent logs.
- **Precise Flag Detection:** Replaced naive substring matching in `hooks/status-line.sh` with word-bounded regex (`(^|[[:space:]])--dangerously-skip-permissions([[:space:]]|$)`) to prevent false-positive Danger Mode display when the flag name appears in prompts or arguments.
- **Symlink Containment:** Disabled link dereferencing (`dereference: false`) in `scripts/sync_installed_plugin.js` to prevent accidental copying of external files.

### Fixed
- **Session-Scoped Caching & Context Isolation:** Scoped `hud_looper.cache` and `hud_git.cache` per session (`hud_looper_${conversationId}.cache`), preventing telemetry from leaking across concurrent or past sessions sharing the same root workspace `cwd`.
- **Strict Repository Discovery:** Restricts Looper mission and epic discovery at root `cwd` strictly to repositories declared in the active session's `hud_context.json`.

---

## [1.3.0] - 2026-08-14

### Added
- **Declarative Custom Executable Blocks Engine:** Define `customBlocks` in `~/.gemini/hud_config.json` with background execution and caching to display bespoke workspace scripts without modifying core plugin code.
- **Direct GEMINI_API_KEY & Null Quota Safety:** Automatically renders a styled `🔑 [API Key]` badge and omits broken 0% quota bars for API key execution modes.
- **In-Flight Tool Summary Streaming:** Captures progressive query strings (such as streaming `search_web` queries) and synthesized lifecycle actions (`Killed task X`, `Checked task X`) with responsive truncation.
- **Looper Block Hierarchy & De-duplication:** Renders autonomous Looper missions hierarchically nested under their matching epics with tree indicators (`↳ [M1] [IN_PROGRESS]`), removing redundant repo/epic echoes.

### Fixed
- **Incremental Stat-Cached Step Counter:** Fixed the `Steps: 0/20` bug by using an ultra-fast `mtimeMs` (<0.02ms) stat-cached incremental counter on `transcript_path` when `step_count` is absent in telemetry payload streams.

---

## [1.2.1] - 2026-08-09

### Fixed
- **Danger Mode Detection:** Restored fast 1-hop parent PID check (`ps -o args= -p $PPID`) in `hooks/status-line.sh` and payload property extraction (`dangerously_skip_permissions`, `skip_permissions`) in `src/parser.ts`, ensuring the `☢️ Danger Mode` badge displays whenever Antigravity CLI is launched with recursive permissions.
- **Process Optimization:** Converted `hooks/status-line.sh` and `hooks/title.sh` to use `exec node` to eliminate lingering subshell processes.

---

## [1.2.0] - 2026-08-09

### Added
- **Declarative Runtime Configuration (`hud_config.json`):** Matrix layouts, responsive breakpoints, and step/context budget ceilings can now be customized at runtime via `~/.gemini/hud_config.json` with safe fallbacks, eliminating the need for TypeScript source edits and esbuild recompilations.
- **Modernized Config Wizard Skill (`/hud-config`):** Interactive AI wizard now directly generates and validates `~/.gemini/hud_config.json`.

### Performance & Optimization
- **Zero Disk I/O Statusline Engine:** Completely eliminated synchronous multi-megabyte `transcript.jsonl` disk reads and in-memory line-splitting on the render path, extracting `stepCount` directly from real-time telemetry payload streams.
- **Streamlined Shell Execution:** Removed process-tree walking `while ps` subshell loops from `hooks/status-line.sh`, achieving consistent `<2ms` hook render latency.

### Removed
- **Dead & Ghost Subsystems:** Purged unused legacy mock modules (`quota.ts`, `subagents.ts`, `doctor.ts`) and repository clutter (`diff.txt`, `log.txt`), reducing bundle size and maintenance overhead.

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

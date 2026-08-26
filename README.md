# Antigravity HUD Plugin

![Antigravity HUD Demo](assets/hud-demo.png)

A production-grade, highly responsive terminal HUD for the Antigravity CLI. It dynamically monitors your agent state, token context, quota buckets, and active subagents in real-time.

```text
▌ 🔵 [TARS] WORKING  |  🔵 plan  |  🎙️ Voice: Ready [F5]  |  🤖 Gemini 3.6 Flash  |  Effort: 󰾆 high  |  🧠 Skills: 🔄 looper & 🧪 tdd & 📜 rules  |  📦 v1.5.0  |  💎 Pro
│ 📂 acme-corp/work  |  🔓 Unsandboxed  |  ⚡ Cache: 120k  |  🎧 Ctx: ▰▰▰▰▱ 72% (54k/75k max)
│ 👟 Steps: ▰▰▰▰▱ 14/20  |  💲 Cost: ~$0.042 (sub: $0.013)  |  🕒 5h: ▰▰▱▱▱ 45% (01:00)  |  🕒 Weekly: ▰▰▰▰▱ 85% (2d 0h)
│ ⚙️  Active Tasks: 3  |  👥 Subagents:  |  🛠️  run_command (npm test) [⏱️ 8s]
│                             orchestrator [id:abc123] [working] (Epic Runner)
│                               ↳ worker-1 [id:def678] [working] (Feature Dev) [$0.0080]
│                                 ↳ researcher [id:ghi112] [completed] (Context Finder)
│                             ...and 1 more hidden
│ 📄 Artifacts (open ~/.gemini/antigravity-cli/brain/ad266f1f*):
│     v1.4_hud_implementation_plan.md
│     walkthrough.md
│ 🔄 Active Looper Missions:
│     🎯 [acme-corp/work] hud-v1.4.0 ▰▰▰▰▱ [3/4 DONE]
│        ↳ [theming_engine] [IN_PROGRESS Iteration 2/5]
│ 🌱 Active Branches:
│     acme-corp/work (feat/hud-v1.4.0*) (+42/-10, 3 files ↑1 ↓0)
│     acme-corp/service-b (main) (+42/-10, 3 files ↑1 ↓0)
│ 📜 tail -f ~/.gemini/antigravity-cli/brain/ad266f1f-75f3-44dd-b073-c93a1bedc277/.system_generated/logs/transcript.jsonl
```

To run this demo in your terminal (with optional theme/style flags):
```bash
npm run demo
# Or test specific themes and separator styles:
node scripts/demo.js --theme=catppuccin --style=powerline
node scripts/demo.js --theme=tokyo-night --style=bubble
node scripts/demo.js --theme=monochrome --style=minimal
```

## Architecture & Features

This plugin was engineered with strict defensive paradigms and advanced layout algorithms to guarantee zero-crash execution and a flawless visual experience:

- **Running Session Cost Telemetry (`'cost'` Block)**: Native support for Antigravity CLI 1.1.21's unrounded spend telemetry (`types.StatusLineCost`), displaying real-time session cost (`total_usd`, `subagent_usd`, `estimated`) with micro-cent precision.
- **Subagent Cost Attribution**: Parses and renders individual subagent cost spend badges directly within the subagents hierarchy tree view.
- **Hierarchical & Multi-Directory Rules Discovery**: Scans standard project-level `.agents/rules/*.md` and `.agent/rules/*.md`, walks ancestor directories to repository roots, and scans global rules (`~/.gemini/config/rules/*.md`).
- **Comprehensive Skill Visual Branding**: Displays emoji icons mapped across official, community, and plugin skills (`melon 🍉`, `looper 🔄`, `tdd 🧪`, `agy-customizations ⚙️`, `antigravity-guide 🪐`, `rules 📜`, `code-review 🧐`, etc.).
- **TrueColor 24-Bit Theming Engine**: Choose from 7 built-in theme presets (`default`, `catppuccin`, `tokyo-night`, `dracula`, `nord`, `solarized`, `monochrome`) via `~/.gemini/hud_config.json`.
- **Nerd Font Separator Styles**: 4 interchangeable layout styles (`modern` UTF-8 bar, `powerline` chevron arrows ``, `bubble` rounded pills ``/``, and `minimal` whitespace/bullets).
- **Hardened OSC 8 Terminal Hyperlinks**: Cmd+Clickable hyperlinks on transcript paths, artifacts, MCP configs, rules, and git branches, with zero-width regex strip ANSI hardening.
- **Stateful In-Flight Tool Execution Timer**: Tracks live elapsed wall-clock seconds for active tools (`🛠️ run_command (npm test) [⏱️ 8s]`) persisted across ephemeral hook process ticks via `~/.gemini/hud_tool_${conversationId}.json`.
- **Extended Developer Telemetry**: Live status blocks for active MCP servers (`🔌 MCP: 3 active`), active rules (`📜 Rules: 2 active`), loaded plugins (`🧩 Plugins: hud, looper`), session wall-clock timer (`⏱️ 14m 22s`), and git diff weight (`+42/-10, 3 files ↑1 ↓0`).
- **Windows PowerShell Support**: Native UTF-8 PowerShell hook wrapper `hooks/status-line.ps1` for cross-platform support.
- **Dynamic Terminal Title Hook**: Displays active tool, workspace, git branch, model, and turn step budget in your terminal window title (`hooks/title.sh`).
- **Declarative Custom Executable Blocks Engine**: Execute any external script or command directly from `~/.gemini/hud_config.json` with asynchronous background caching (<2ms render loop budget).
- **Dynamic Matrix Engine**: Features a fully configurable JSON-driven grid system. You can freely re-arrange metrics (like Model, Workspace, Context, Quotas, and Custom Blocks) into any row or order based on terminal width. See [LAYOUT_ENGINE.md](LAYOUT_ENGINE.md) for full configuration specs.
- **Session Context Isolation & Memory Scoping**: Completely isolates Looper missions and git telemetry per conversation ID (`~/.gemini/hud_looper_${conversationId}.cache`). When operating in a root multi-repo container, discovery is strictly bounded to the active session's `hud_context.json`.
- **Security & Privacy Hardening**: Enforces identifier sanitization against path traversal, restricts custom block caches to `0o600` permissions, protects against symlink traversal, and caps synchronous transcript parsing to 2MB to prevent DoS latency.
- **Looper Hierarchical Tree**: Groups autonomous Looper missions hierarchically under their parent epic, eliminating redundant repository and epic echoes.
- **Hysteresis Filtering & Strict Padding**: Mathematically absorbs micro-fluctuations in UI layout padding. By combining a 5-column hysteresis cache with strict 7-character string padding, it completely eliminates both horizontal and vertical UI bouncing during rapid state transitions.
- **Autonomous SQLite Spend Ledger**: Automatically tracks session spend, subagent costs, prompt cache token reads, and turn counts into a high-performance SQLite database (`~/.gemini/hud_ledger.db`) via asynchronous WAL-mode ingestion (<2ms zero-latency overhead).
- **Experimental Voice & Audio Dictation (`'voice'` Block)**: Real-time visual status for `/voice`, `[F5]` dictation, and `agy mic-serve` audio streaming (`🎙️ Voice: Ready [F5]`, `🔴 🎙️ REC`, `🎙️ Mic: 4713`), with configurable keybindings and automatic culling.
- **Automated CLI Reverse-Engineering & Telemetry Auditor (`/hud:audit-agy`)**: Programmatically reverse-engineers the local `agy` Go binary, extracts internal `StatusLine*` structs, compares telemetry schemas against `src/parser.ts`, scans for unbranded ecosystem skills, and drafts instant upgrade roadmaps (`npm run audit:agy`).
- **Interactive Config & Analytics Skills**: Ships with built-in AI skills: `/hud:hud-config` (runtime layout & theme wizard), `/hud:rules` (active workspace rules inspector), `/hud:stats` (token financial & cache efficiency dashboard), `/hud:voice` (microphone setup & audio streamer assistant), and `/hud:audit-agy` (platform telemetry gap auditor).
- **High-Performance Build**: Hand-written in TypeScript and bundled via `esbuild` into single ECMAScript Modules (`dist/index.js`, `dist/title.js`, `dist/stats.js`, `dist/audit.js`) that execute in **~1ms**.

## Installation

To install the plugin, clone the repository, build it, and install it locally via the Antigravity CLI:

```bash
git clone https://github.com/jdiazromeral/antigravity-cli-hud.git
cd antigravity-cli-hud
npm install
npm run build
agy plugin install .
```

## Configuration

To customize your HUD theme, separator style, matrix layout, or budget ceilings, invoke the configuration skill directly inside an active Antigravity chat session:

> `/hud:hud-config`

The AI will interactively guide you through selecting a theme (e.g. Catppuccin, Tokyo Night, Dracula, Nord), choosing a separator style (Modern, Powerline, Bubble, Minimal), and arranging your statusline rows without requiring recompilation!

To inspect active workspace rules and tactical mandates:

> `/hud:rules`

To analyze historical AI spend, prompt cache hit rate, and per-model ROI:

> `/hud:stats`

To configure or diagnose microphone setup and experimental voice streaming:

> `/hud:voice`

To audit new Antigravity CLI versions, discover new telemetry structs, and detect missing skill icons:

> `/hud:audit-agy`

## Usage

To activate the HUD inside an active Antigravity chat session, run the following slash command:

```bash
/statusline ~/.gemini/config/plugins/hud/hooks/status-line.sh
```

*(On Windows PowerShell)*:
```powershell
/statusline ~/.gemini/config/plugins/hud/hooks/status-line.ps1
```

To activate the dynamic Terminal Title hook:

```bash
/title ~/.gemini/config/plugins/hud/hooks/title.sh
```

To revert back to the default minimal status line:

```bash
/statusline delete
```

## Development & Testing

This project maintains a high-velocity, strictly typed test and verification pipeline powered by **TypeScript 7 (Go)**, **Oxlint (Rust)**, and **Vitest**:

```bash
# Run unit & E2E invariant test suite
npm run test

# Run instant type-checking via native Go TypeScript 7
npm run typecheck

# Run instant native linting via Oxlint
npm run lint

# Generate a fully-populated mock HUD UI in your terminal
npm run demo

# Build production bundle and sync directly to ~/.gemini/config/plugins/hud
npm run sync
```

## 🚀 What's New

For full release history and version details, see the **[CHANGELOG.md](CHANGELOG.md)**.

### Latest Updates (v1.5.0)
- **Running Session Cost Telemetry (`'cost'` Block):** Native support for Antigravity CLI 1.1.21's unrounded spend telemetry (`types.StatusLineCost`), displaying real-time session cost (`total_usd`, `subagent_usd`, `estimated`) with adaptive micro-cent precision (`$0.0042`, `~$0.042`, `(sub: $0.012)`).
- **Subagent Cost Attribution:** Parses and renders individual subagent cost spend badges directly within the subagents hierarchy tree view (`[$0.0080]`).
- **Autonomous SQLite Spend Ledger (`~/.gemini/hud_ledger.db`):** High-performance WAL-mode historical spend ledger automatically tracking session costs, subagent slices, prompt cache tokens, and turn step counts asynchronously with zero latency impact on the statusline render loop.
- **Interactive Spend Analytics Skill (`/hud:stats`):** Built-in financial inspector and token analytics dashboard providing daily/weekly spend summaries, prompt cache savings percentages, and breakdowns by model and workspace.
- **Experimental Voice Dictation (`'voice'` Block):** Added support for `/voice` prompt dictation, `[F5]` keybinding badge, and `agy mic-serve` remote microphone status (`🎙️ Voice: Ready [F5]`, `🔴 🎙️ REC`, `🎙️ Mic: 4713`), accompanied by the `/hud:voice` assistant skill.
- **Automated CLI Telemetry Auditor (`/hud:audit-agy`):** Programmatically inspects the local `agy` binary to extract internal `StatusLine*` Go structs, flags missing schema tags in `src/parser.ts`, scans for unbranded ecosystem skills, and drafts instant upgrade roadmaps (`npm run audit:agy`).
- **Hierarchical & Multi-Directory Rules Discovery:** Scans standard project-level `.agents/rules/*.md` and `.agent/rules/*.md`, walks ancestor directories to repository roots, and scans global rules (`~/.gemini/config/rules/*.md`).
- **Expanded Skill Branding:** Added comprehensive icon mappings across modern official and plugin skills (`melon 🍉`, `agy-customizations ⚙️`, `antigravity-guide 🪐`, `address-review 💬`, `code-review 🧐`, `codebase-design 🏗️`, `diagnosing-bugs 🩺`, `domain-modeling 🏛️`, `grilling 🔥`, `prototype 🛠️`, `research 📚`, `wizard 🧙`, `writing-for-agents ✍️`, `migrate-to-shoehorn 👞`, `setup-pre-commit 🪝`, `git-guardrails-claude-code 🛡️`).

### Previous Updates (v1.4.0)
- **TypeScript 7 in Go & Oxlint Tooling:** Upgraded compiler toolchain to native multi-threaded TypeScript 7 (`tsc --noEmit` in ~0.3s) and Rust-based `oxlint` (5ms).
- **TrueColor 24-Bit Theming Engine:** 7 built-in color themes (`default`, `catppuccin`, `tokyo-night`, `dracula`, `nord`, `solarized`, `monochrome`).
- **Nerd Font Separator Styles:** 4 styling presets (`modern`, `powerline` arrows ``, `bubble` pills ``/``, and `minimal` ` • `).
- **Interactive OSC 8 Terminal Hyperlinks:** Hardened terminal hyperlinks with verified absolute path resolution and plain-text fallback on transcripts, artifacts, MCP configs, rules, and git branches.
- **Stateful In-Flight Tool Execution Timer:** Solved ephemeral hook state loss by caching start timestamps in `~/.gemini/hud_tool_${conversationId}.json` (`🛠️ run_command (npm test) [⏱️ 8s]`).
- **Extended Telemetry Blocks:** Active MCP servers (`🔌 MCP: 3 active`), active rules (`📜 Rules: 2 active`), plugins (`🧩 Plugins`), session elapsed time (`⏱️ 14m 22s`), and git diff weight (`+42/-10, 3 files ↑1 ↓0`).
- **Windows PowerShell Support:** Added `hooks/status-line.ps1` with native UTF-8 console output encoding.
- **Dynamic Terminal Title Progress:** Terminal window title displays in-flight tool and step counter (`[🛠️ run_command] agy - work (main) [Gemini 3.6 Flash] [👟 14/20] 🔵 WORKING`).
- **Rules Inspector Skill:** Added `/hud:rules` for scanning and summarizing active behavioral mandates.

## Understanding Telemetry Blocks

The HUD dynamically parses the CLI's internal JSON telemetry stream. It receives continuous heartbeat pulses and instant triggers on any state change, meaning every metric updates with zero latency. 

Here are all the available blocks you can slot into your matrix:

- **`state`**: The core Antigravity Agent state (🟢 IDLE, 🟡 WAITING, 🔵 WORKING).
- **`mode`**: The active execution mode of the CLI (🟡 request-review, 🟢 accept-edits, 🔵 plan).
- **`effort`**: The effort tier of the model (e.g. 󰾆 High, Low) introduced in v1.1.5.
- **`model`**: The underlying AI model currently driving the agent (e.g. Gemini 3.1 Pro). If a custom `agent` name is streamed, it natively overrides the state label.
- **`sandbox`**: The file-system security boundary (🔒 Sandboxed or 🔓 Unsandboxed).
- **`permissions`**: The Danger Mode indicator. Visually flags if the agent was granted recursive `AGY_SKIP_PERMISSIONS=1` access across the process tree.
- **`workspace`**: The true repository name. Natively tracks AI session context via `hud_context.json` to ensure explicitly targeted directories are visible without polluting the view with unrelated subfolders!
- **`cost`**: Running Session Cost Telemetry (`💲 Cost: ~$0.042 (sub: $0.012)`). Displays real-time session token spend, subagent cost slices, and estimated markers. Automatically hidden when $0.00 or absent.
- **`looper`**: The Active Looper Missions block. Dynamically scans `.looper/epics/` in active repositories and nests missions hierarchically under their parent epic (e.g., `🎯 Epic: auth-v2` -> `↳ [M1] [IN_PROGRESS]`). Automatically hides itself if no missions are active.
- **`git`**: The Active Branches block. Dynamically stacks line-by-line (`🌱 Active Branches:`) to cleanly display multi-repo worktrees alongside their active branches.
- **`artifacts`**: The Active Artifacts block. Dynamically stacks line-by-line (`📄 Artifacts:`) to list the `.md` files generated during the active AI session. Automatically hides itself if no artifacts exist.
- **`transcript`**: A clickable shortcut link directly to your agent's active `transcript.jsonl` log file, making it easy to `tail -f` the brain logs.
- **`mcp`**: Active MCP Tool Servers block (e.g., `🔌 MCP: 3 active`). Renders with a clickable shortcut link to your `~/.gemini/config/mcp_config.json`.
- **`rules`**: Active Rules counter block (e.g., `📜 Rules: 2 active`). Scans workspace and global behavioral instructions.
- **`plugins`**: Active Plugins block (e.g., `🧩 Plugins: hud, looper`). Lists currently mounted CLI plugins.
- **`session_time`**: Session Elapsed Wall-Clock Timer (e.g., `⏱️ 14m 22s`). Displays the duration of the current session.
- **`tool`**: Active Tool Execution block with live elapsed timer (e.g. `🛠️ run_command (npm test) [⏱️ 8s]`). Displays real-time tool calls and in-flight queries streamed in telemetry; automatically culled when no tool is running.
- **`apiKey`**: Direct Gemini API key badge (`🔑 [API Key]`). Appears automatically when running with `GEMINI_API_KEY`.
- **`custom_<id>`**: Custom Executable Block defined in `hud_config.json` under `customBlocks`. Executes shell scripts asynchronously and displays cached output.
- **`ctx`**: Context window saturation limit. Shows percentage used and raw token count.
- **`cache`**: Context window caching telemetry (`⚡ Cache: 70k`). Displays how many tokens were read from cache, allowing you to instantly visualize your cost savings. Automatically hides if 0.
- **`credits`**: AI Credits block. Renders the active credit balance with a distinct Nerd Font icon. Automatically replaces `5h` and `weekly` quotas when pay-as-you-go models are active.
- **`5h` / `weekly`**: Rolling quota buckets. Shows percentage used and the countdown timer until the quota bucket resets.
- **`tasks`**: Active asynchronous background processes (shell commands, cron jobs, active timers, or background scripts) spawned by the CLI.
- **`subagents`**: Active parallel AI subagents with cost spend attribution (`[id:abc123] [$0.0080]`). Grandchild subagents (depth > 0) are visually nested in a tree hierarchy using `↳` characters. The list dynamically truncates to 3 lines with a hidden counter to preserve vertical layout stability.
- **`version`**: The installed version of the Antigravity CLI.
- **`email`**: The authenticated user's email address.
- **`plan`**: The active billing tier of the user account.

### Traffic Light Color Coding

To help you monitor your resource consumption at a glance, all percentage-based telemetry blocks (`Ctx`, `5h`, `Weekly`) employ a dynamic 3-tier "Traffic Light" thresholding system:
- 🟢 **Safe (< 60%)**: Renders in Green, indicating you have plenty of room.
- 🟡 **Warning (60% - 84%)**: Renders in Yellow, indicating you are eating into your limits and should be mindful.
- 🔴 **Critical (>= 85%)**: Renders in Red, indicating you are in the danger zone and about to hit your maximum limit.
*(Note: If your Context ever exceeds 200k tokens, the HUD will immediately override to Red and display an explicit 🚨 >200k! warning).*

### Dynamic Culling

By default, the HUD Engine utilizes "Dynamic Culling". This means that if your `Active Tasks` or `Subagents` counts are zero, those blocks are completely removed from the visual layout to prevent terminal clutter. If they are the only elements on their respective row, the entire empty row is safely collapsed. 

You can disable this behavior to always show the blocks (e.g. `Active Tasks: 0`) by changing the flag in your config:
```typescript
export const HUD_CONFIG = {
  autoHideEmptyBlocks: false, // Set to false to always render empty blocks
  // ...
};
```

## ⚙️ Configuration & Environment Variables

The HUD supports a priority resolution engine for context window and step budget ceilings:

```
Priority 1: Environment Variables (AGY_MAX_CONTEXT_TOKENS / AGY_SOFT_CONTEXT_TOKENS / AGY_MAX_STEPS)
    ↓ (If undefined)
Priority 2: Physical Model Telemetry & Defaults (context_window_size / 1M max, 200k soft limit)
```

### Environment Variables

| Variable | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `AGY_AGENT_NAME` | Custom agent identity label displayed in statusline header. | `TARS` | `export AGY_AGENT_NAME="TARS"` |
| `AGY_MAX_CONTEXT_TOKENS` | Custom context window physical capacity ceiling limit. | `1048576` (1M) | `export AGY_MAX_CONTEXT_TOKENS=1000000` |
| `AGY_SOFT_CONTEXT_TOKENS` | Custom soft degradation context limit (scales 5-segment microbar). | `200000` (200k) | `export AGY_SOFT_CONTEXT_TOKENS=150000` |
| `AGY_MAX_STEPS` | Custom session step ceiling for turn budget tracking. | `20` | `export AGY_MAX_STEPS=30` |
| `AGY_SKIP_PERMISSIONS` | Toggles Danger Mode indicator in HUD statusline (`☢️ Danger Mode`). | `false` | `export AGY_SKIP_PERMISSIONS=true` |

### 🤖 Why "TARS"?

The default agent label in the statusline header (`[TARS]`) pays homage to **TARS** ("*TARS Answers from Raw Sources*") — our local-first second brain project and autonomous pairing agent persona.

Inspired by the direct, high-honesty robotic companion in *Interstellar*, TARS embodies radical candor, surgical precision, and high-standard pair engineering:

* **Radical Candor & High Standards:** Critical, direct pair-programming that pushes back on fragile or over-engineered solutions.
* **Options Over Prescriptions:** Always evaluates 2–3 viable design options with trade-offs before executing.
* **Clarity First:** Simple, explicit, maintainable code (*"Simple is better than complex — done is better than perfect"*).

*You can customize your HUD's agent tag anytime by setting `export AGY_AGENT_NAME="YourName"` in your shell!*

### Bundled Token Ledger & Evaluation Hook

Included in `scripts/token_eval_hook.py` is a security-hardened token evaluation hook:
* **Zero Content Disclosure:** Evaluates prompt turn steps and character lengths without storing raw text or code.
* **Strict Permissions (`0600`):** Enforces user-only read/write permissions on ledger log files.
* **Path Containment:** Verifies `transcriptPath` is rooted inside `~/.gemini/antigravity-cli/brain/`.
* **Token Ledger:** Appends session token metrics to `~/.gemini/antigravity-cli/token_ledger.jsonl`.

## Documentation

- **[LAYOUT_ENGINE.md](LAYOUT_ENGINE.md)**: Technical spec for the HUD Matrix JSON engine.
- **[HOOKS.md](HOOKS.md)**: Official documentation reverse-engineering the Antigravity CLI's telemetry JSON stream and `stdin` event loop.
- **[docs/token_usage_hooks_guide.md](docs/token_usage_hooks_guide.md)**: Guide to telemetry hooks, privacy-preserving character counting, and configuring `token_eval_hook.py`.
- **[docs/token_usage_audit.md](docs/token_usage_audit.md)**: Comprehensive auditing guide covering soft vs physical limits, prompt caching, and subagent context management.

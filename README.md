# Antigravity HUD Plugin

A production-grade, highly responsive terminal HUD for the Antigravity CLI. It dynamically monitors your agent state, token context, quota buckets, and active subagents in real-time.

## Architecture & Features

This plugin was engineered with strict defensive paradigms and advanced layout algorithms to guarantee zero-crash execution and a flawless visual experience:

- **Dynamic Matrix Engine**: Features a fully configurable JSON-driven grid system. You can freely re-arrange metrics (like Model, Workspace, Context, and Quotas) into any row or order based on terminal width. See [LAYOUT_ENGINE.md](LAYOUT_ENGINE.md) for full configuration specs.
- **Hysteresis Filtering & Strict Padding**: Mathematically absorbs micro-fluctuations in UI layout padding. By combining a 5-column hysteresis cache with strict 7-character string padding, it completely eliminates both horizontal and vertical UI bouncing during rapid state transitions.
- **Interactive Config Wizard**: Ships with a built-in AI skill (`/hud-config`) that allows you to chat with an agent to visually re-arrange your HUD matrix on the fly!
- **Ironclad Execution**: Wrapped in global `try/catch` handlers with hardcoded fallback strings. Even if the incoming telemetry JSON payload is violently malformed, the plugin will NEVER crash the Antigravity session.
- **High-Performance Build**: Hand-written in TypeScript and bundled via `esbuild` into a single, dependency-free ECMAScript Module (`dist/index.js`) that executes in **~1ms**.

## Installation

You can install the plugin directly from GitHub into your Antigravity CLI:

```bash
agy plugin install jdiazromeral/antigravity-cli-hud@main
```

Or install it locally:
```bash
git clone https://github.com/jdiazromeral/antigravity-cli-hud.git
cd antigravity-cli-hud
npm install
npm run build
agy plugin install .
```

## Configuration

To customize exactly what information appears on your HUD (and in what order), simply invoke the built-in configuration skill directly inside an active Antigravity chat session:

> `/hud-config`

The AI will interactively guide you through customizing your layouts for Small, Medium, and Large terminal widths, and automatically recompile the binary for you!

## Usage

To activate the HUD inside an active Antigravity chat session, run the following slash command:

```bash
/statusline ~/.gemini/config/plugins/hud/hooks/status-line.sh
```

To revert back to the default minimal status line:

```bash
/statusline delete
```

## Development & Testing

This project maintains a robust, highly mocked unit test suite powered by `vitest` to ensure the responsive mathematical layout and payload parser never regress.

To run the test suite:
```bash
npm run test
```

## Understanding Telemetry Blocks

The HUD dynamically parses the CLI's internal JSON telemetry stream. It receives continuous heartbeat pulses and instant triggers on any state change, meaning every metric updates with zero latency. 

Here are all the available blocks you can slot into your matrix:

- **`state`**: The core Antigravity Agent state (🟢 IDLE, 🟡 WAITING, 🔵 WORKING).
- **`model`**: The underlying AI model currently driving the agent (e.g. Gemini 3.1 Pro).
- **`sandbox`**: The file-system security boundary (🔒 Sandboxed or 🔓 Unsandboxed).
- **`permissions`**: The Danger Mode indicator. Visually flags if the agent was granted recursive `AGY_SKIP_PERMISSIONS=1` access across the process tree.
- **`workspace`**: The absolute path of the current active working directory.
- **`ctx`**: Context window saturation limit. Shows percentage used and raw token count.
- **`5h` / `weekly`**: Rolling quota buckets. Shows percentage used and the countdown timer until the quota bucket resets.
- **`tasks`**: Active asynchronous background processes (shell commands, cron jobs, active timers, or background scripts) spawned by the CLI.
- **`subagents`**: Active parallel AI subagents. The list dynamically truncates to 3 lines with a hidden counter to preserve vertical layout stability.
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

## Documentation

- **[LAYOUT_ENGINE.md](LAYOUT_ENGINE.md)**: Technical spec for the HUD Matrix JSON engine.
- **[HOOKS.md](HOOKS.md)**: Official documentation reverse-engineering the Antigravity CLI's telemetry JSON stream and `stdin` event loop.

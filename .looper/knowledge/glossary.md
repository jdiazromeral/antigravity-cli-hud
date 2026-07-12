# Ubiquitous Language: Antigravity HUD

- **Antigravity CLI**: The main agentic framework executing tasks. See `HOOKS.md`.
- **HUD (Heads Up Display)**: Our CLI plugin providing the real-time status line.
- **Status-Line Payload**: The JSON data pushed via `stdin` by the Antigravity CLI to our hook. Handled in `src/parser.ts`.
- **Agent State**: The current working status of the agent (e.g., "Idle", "Thinking").
- **Conversation ID**: The unique identifier for the current agent session.
- **Subagent**: Any concurrent agent processes spawned by the main Antigravity agent. Rendered via `src/subagents.ts`.
- **Context Usage**: The fraction/tokens used by the agent in the current context window.
- **Quota**: The user's rate limits and usage for the current AI model. Parsed in `src/quota.ts`.
- **Matrix Engine**: Dynamic JSON-driven grid system for HUD layout based on terminal width. Configured in `src/formatter.ts`.
- **Dynamic Culling**: Automatically hiding empty blocks (like 0 active tasks or subagents) to prevent clutter.
- **Traffic Light Color Coding**: Dynamic 3-tier thresholding system for percentage-based telemetry blocks (Safe, Warning, Critical). See `src/quota.ts`.
- **Hysteresis Filtering**: Mathematically absorbing micro-fluctuations in UI layout padding to prevent terminal bouncing.

*(Note: These terms subsume the legacy definitions originally located at the project root `CONTEXT.md`.)*

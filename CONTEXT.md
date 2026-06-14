# Ubiquitous Language: Antigravity HUD

- **Antigravity CLI**: The main agentic framework executing tasks.
- **HUD (Heads Up Display)**: Our CLI plugin providing the real-time status line.
- **Status-Line Payload**: The JSON data pushed via `stdin` by the Antigravity CLI to our hook.
- **Agent State**: The current working status of the agent (e.g., "Idle", "Thinking").
- **Conversation ID**: The unique identifier for the current agent session.
- **Subagent**: Any concurrent agent processes spawned by the main Antigravity agent.
- **Context Usage**: The fraction/tokens used by the agent in the current context window.
- **Quota**: The user's rate limits and usage for the current AI model.

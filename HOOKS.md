# Antigravity Status Line Hooks

This document serves as the technical specification for how the Antigravity (`agy`) CLI interacts with custom status line plugins like this HUD. Since official documentation is limited, this guide is based on reverse-engineered telemetry data.

## The Architecture

When a user executes the `/statusline <path-to-script>` command inside an active Antigravity session, the following architecture is established:

1. **Child Process**: The Antigravity CLI spawns the target script as a continuous background child process.
2. **Data Stream (`stdin`)**: Every time an event occurs in the CLI (e.g., a token is consumed, a tool is used, or a subagent spawns), the CLI pushes a raw JSON string into the script's `stdin`.
3. **Render Engine (`stdout`)**: The script must continuously parse the incoming JSON stream, format it, and print exactly what it wants to display back to `stdout`. The CLI intercepts this `stdout` and paints it to the bottom of the user's terminal window.

---

## The JSON Payload Structure

The incoming `stdin` payload is a single, unformatted JSON object. Below is a comprehensive reference of the known keys and data structures passed by the CLI:

```json
{
  "cwd": "/Users/path/to/current/directory",
  "session_id": "4aeca1b1-e022-4ce3-8dc8-e770e698ed29",
  "conversation_id": "4aeca1b1-e022-4ce3-8dc8-e770e698ed29",
  "agent_state": "working",
  "model": { 
    "id": "Gemini 3.1 Pro (High)",
    "display_name": "Gemini 3.1 Pro (High)" 
  },
  "context_window": {
    "context_window_size": 1048576,
    "total_input_tokens": 107931,
    "total_output_tokens": 193463,
    "used_percentage": 10.293102264404297,
    "remaining_percentage": 89.7068977355957,
    "current_usage": { 
      "input_tokens": 1836,
      "output_tokens": 829,
      "cache_read_input_tokens": 104352
    }
  },
  "exceeds_200k_tokens": false,
  "quota": {
    "gemini-5h": { 
      "remaining_fraction": 0.0892089, 
      "reset_time": "2026-06-14T02:11:00Z", 
      "reset_in_seconds": 7319 
    },
    "gemini-weekly": { 
      "remaining_fraction": 0.7784311, 
      "reset_time": "2026-06-20T09:13:59Z", 
      "reset_in_seconds": 551098 
    },
    "3p-5h": { 
      "remaining_fraction": 1.0, 
      "reset_in_seconds": 17758 
    },
    "3p-weekly": { 
      "remaining_fraction": 0.6662136, 
      "reset_in_seconds": 62917 
    }
  },
  "subagents": [
    { 
      "name": "self", 
      "role": "Execute tests", 
      "status": "working" 
    }
  ],
  "sandbox": { "enabled": false },
  "terminal_width": 184,
  "task_count": 1,
  "plan_tier": "Google AI Pro",
  "email": "user@example.com",
  "version": "1.1.1",
  "vcs": {
    "branch": "main",
    "dirty": false
  },
  "transcript_path": "/Users/path/to/.gemini/antigravity-cli/brain/transcript.jsonl"
}
```

*Note: The CLI execution mode (`request-review`, `accept-edits`, etc.) is NOT currently streamed in the telemetry payload. It must be read directly from the `~/.gemini/antigravity-cli/settings.json` file.*

## Parsing Strategies & Defensive Coding

Because the `stdin` pipe is continuous and attached directly to the CLI's internal event loop, any unhandled exceptions in your hook parser will silently sever the pipe or cause the Antigravity UI to hang.

### 1. Robust JSON Parsing
Never assume the payload is completely well-formed. Use chunked stream buffering to handle payloads that exceed standard buffer limits, and wrap `JSON.parse` in a strict `try/catch`. 

### 2. Nullish Coalescing
Because certain events (like CLI initialization) may send partial payloads, every single property extraction MUST fall back gracefully using `||` or `?.` operators.
Example: `const taskCount = parsed.task_count || 0;`

### 3. Hysteresis on Window Resize
The `terminal_width` property dynamically updates when the user resizes their window. However, relying purely on this value can cause "UI Bouncing" because redrawing multi-line status blocks can temporarily steal columns from the viewport. To solve this, cache the width and only respond to changes greater than `5` columns.

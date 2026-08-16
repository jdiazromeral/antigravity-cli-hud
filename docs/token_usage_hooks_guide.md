# Antigravity CLI Telemetry & Token Usage Hooks Guide

This guide explains how the Antigravity CLI streams real-time telemetry, how token metrics and prompt cache hits are computed, and how to safely audit session token consumption using bundled hooks.

---

## 📡 1. Telemetry Hooks Overview

The Antigravity CLI exposes lifecycle event hooks (`PreInvocation`, `PostInvocation`, `Stop`) that stream session state as JSON payloads via `stdin` to executable scripts.

The HUD plugin utilizes these hooks to render real-time statuslines without interfering with agent execution or modifying prompt content.

### Payload Schema (`AntigravityPayload`)

When a hook is triggered, Antigravity passes a JSON payload structured as follows:

```json
{
  "agent_state": "WORKING",
  "conversation_id": "b31f191b-48c4-4dd7-ad5b-1dd35a5d4772",
  "context_window": {
    "used_percentage": 19,
    "total_input_tokens": 200000,
    "current_usage": {
      "cache_read_input_tokens": 120000
    }
  },
  "quota": {
    "gemini-5h": { "remaining_fraction": 0.40, "reset_in_seconds": 3600 },
    "gemini-weekly": { "remaining_fraction": 0.79, "reset_in_seconds": 500000 }
  },
  "model": { "display_name": "Gemini 3.6 Flash (Medium)" },
  "transcript_path": "/Users/user/.gemini/antigravity-cli/brain/.../transcript.jsonl"
}
```

---

## 🔒 2. Privacy & Security Architecture

Security and privacy are enforced at the code level in [`scripts/token_eval_hook.py`](../scripts/token_eval_hook.py):

### 🛡️ Zero Content Disclosure
* **No Text Storage**: The hook computes character lengths (`len(content)`, `len(thinking)`) to estimate token counts (`chars / 4`).
* **Zero Output Disclosure**: Prompt text, code snippets, tool calls, and thinking outputs are **never** logged, printed, or transmitted.

### 🔒 Strict File Permissions (`0600` / `0700`)
* The token ledger log file (`~/.gemini/antigravity-cli/token_ledger.jsonl`) is created with `0600` permissions (read/write restricted exclusively to your user account).
* The parent directory enforces `0700` (user-only directory traversal).

### 🛑 Path Traversal Containment (`is_safe_path`)
* Before attempting to inspect any file, the hook resolves `transcriptPath` via `os.path.realpath` and verifies it is strictly contained within `~/.gemini/antigravity-cli/brain/`.
* Any attempt to pass out-of-bounds file paths is immediately rejected.

### 🌐 100% Offline & Stdlib Only
* Uses Python 3 standard libraries only (`json`, `sys`, `os`, `datetime`). Zero third-party packages, zero network calls, zero external tracking.

---

## 🛠️ 3. Installing `token_eval_hook.py`

To attach the token evaluator hook to your Antigravity CLI session:

1. Copy or link `scripts/token_eval_hook.py` to your local bin or config directory:
   ```bash
   chmod +x scripts/token_eval_hook.py
   ```

2. Configure `settings.json` in `~/.gemini/antigravity-cli/settings.json`:
   ```json
   {
     "hooks": {
       "PreInvocation": [
         {
           "type": "command",
           "command": "/path/to/antigravity-cli-hud/scripts/token_eval_hook.py PreInvocation"
         }
       ],
       "PostInvocation": [
         {
           "type": "command",
           "command": "/path/to/antigravity-cli-hud/scripts/token_eval_hook.py PostInvocation"
         }
       ],
       "Stop": [
         {
           "type": "command",
           "command": "/path/to/antigravity-cli-hud/scripts/token_eval_hook.py Stop"
         }
       ]
     }
   }
   ```

3. View your session token log safely at any time:
   ```bash
   cat ~/.gemini/antigravity-cli/token_ledger.jsonl
   ```

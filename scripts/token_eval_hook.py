#!/usr/bin/env python3
"""
Antigravity Token & Step Evaluation Hook
Bundled with Antigravity HUD Plugin

Reads stdin JSON payload from Antigravity, evaluates token metrics from transcript,
and logs metrics or injects warnings if thresholds are exceeded.
"""

import sys
import json
import os
from datetime import datetime

# Default Budget Thresholds
WARN_CONTEXT_TOKENS = 75_000  # Warn model when prompt context > 75k tokens
WARN_STEP_COUNT = 20          # Warn when step count > 20 steps

LEDGER_PATH = os.path.expanduser("~/.gemini/antigravity-cli/token_ledger.jsonl")

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({}))
            return
        payload = json.loads(raw_input)
    except Exception:
        print(json.dumps({}))
        return

    transcript_path = payload.get("transcriptPath", "")
    conv_id = payload.get("conversationId", "unknown")
    event_type = sys.argv[1] if len(sys.argv) > 1 else "PreInvocation"

    if not transcript_path or not os.path.exists(transcript_path):
        print(json.dumps({}))
        return

    # Calculate current session metrics
    step_count = 0
    total_chars = 0
    thinking_chars = 0

    with open(transcript_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            try:
                data = json.loads(line)
                step_count += 1
                content = data.get("content", "") or ""
                thinking = data.get("thinking", "") or ""
                total_chars += len(content)
                thinking_chars += len(thinking)
            except Exception:
                pass

    est_tokens = total_chars // 4
    est_thinking_tokens = thinking_chars // 4

    # 1. PreInvocation: Inject warnings if threshold exceeded
    if event_type == "PreInvocation":
        inject_steps = []
        if est_tokens > WARN_CONTEXT_TOKENS or step_count > WARN_STEP_COUNT:
            msg = (
                f"⚠️ [Token Budget Notice] Session step {step_count} with ~{est_tokens:,} context tokens. "
                f"Thresholds (20 steps / 75k tokens) exceeded. "
                f"Consider summarizing progress and concluding this session to prevent context inflation."
            )
            inject_steps.append({"ephemeralMessage": msg})
        
        output = {"injectSteps": inject_steps}
        print(json.dumps(output))
        return

    # 2. Stop: Append to persistent token ledger
    if event_type == "Stop":
        record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "conversation_id": conv_id,
            "step_count": step_count,
            "est_context_tokens": est_tokens,
            "est_thinking_tokens": est_thinking_tokens,
            "termination_reason": payload.get("terminationReason", "")
        }
        os.makedirs(os.path.dirname(LEDGER_PATH), exist_ok=True)
        with open(LEDGER_PATH, "a") as f:
            f.write(json.dumps(record) + "\n")
        
        print(json.dumps({}))
        return

    print(json.dumps({}))

if __name__ == "__main__":
    main()

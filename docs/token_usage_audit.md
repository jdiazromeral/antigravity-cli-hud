# Token Usage Auditing & Cost Optimization Guide

This guide covers best practices for auditing context window saturation, tracking prompt caching efficiency, monitoring parallel subagent token usage, and preventing context degradation in long-running Antigravity CLI sessions.

---

## 🎧 1. Soft Limit vs. Physical Model Capacity

Modern LLMs (like Gemini 1.5 / 3.6 Pro & Flash) feature physical context windows up to **1,048,576 tokens (`1M`)** or **2,097,152 tokens (`2M`)**. However, practical reasoning performance behaves differently:

### ⚡ The 200k Soft Limit Threshold
* **Context Saturation & Attention Loss**: As context exceeds **200,000 tokens (`200k`)**, models experience attention degradation ("needle in a haystack" precision drop), increased response latency, and higher token consumption per turn.
* **HUD Microbar Scaling**: To give you accurate operational awareness, the HUD scales its 5-segment microbar (`[▰▰▱▱▱]`) and percentage relative to the **200k soft limit**.
* **Visual Ratio**:
  ```text
  🎧 Ctx: [▰▰▱▱▱] 45% (90k/200k soft • 1M max)
  ```

---

## ⚡ 2. Prompt Cache Efficiency (`⚡ Cache`)

Antigravity automatically leverages Gemini Prompt Caching for repeated context structures.

### Reading Cache Telemetry
When prompt caching is active, the HUD displays the cached token count:
```text
│ ⚡ Cache: 120k  |  🎧 Ctx: [▰▰▰▱▱] 60% (120k/200k soft • 1M max)
```
* **Cost Savings**: Tokens read from cache incur significantly lower latency and cost.
* **Automatic Culling**: If 0 tokens are read from cache, the `⚡ Cache` block automatically culls itself to preserve terminal space.

---

## 👥 3. Parallel Subagent Token Auditing

When executing subagents (e.g., via `invoke_subagent` or `/epic-runner`), each subagent runs in its own isolated conversation context:

```text
│ 👥 Subagents:
│     orchestrator [id:abc123] [working] (Epic Runner)
│       ↳ worker-1 [id:def678] [working] (Feature Dev)
│         ↳ researcher [id:ghi112] [completed] (Context Finder)
```

### Subagent Token Rules
* **Isolated Windows**: Subagents do NOT share the main agent's context window. Each subagent starts with a clean context, keeping main session tokens low.
* **Inherited vs Branch Workspaces**: Using branched workspaces prevents redundant file reading in subagents.

---

## 🛠️ 4. Actionable Steps for Context Degradation

When your HUD turns **Red (🔴 >= 85% / >= 170k)** or displays **`🚨 >200k! Agent may start degrading`**:

1. **Summarize & Checkpoint**: Ask the agent to summarize progress and write a task checkpoint (e.g. into `AGENTS.md` or `.looper/`).
2. **Conclude & Fresh Session**: Start a fresh conversation using `agy` to reset the context window back to `0k`.
3. **Customize Thresholds**: Adjust soft limit or step limits for custom workflows via environment variables:
   ```bash
   export AGY_SOFT_CONTEXT_TOKENS=150000
   export AGY_MAX_CONTEXT_TOKENS=1000000
   ```

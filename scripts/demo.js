// src/formatter.ts
import * as os from "os";
var colors = {
  reset: "\x1B[0m",
  bold: "\x1B[1m",
  dim: "\x1B[2m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  cyan: "\x1B[36m",
  red: "\x1B[31m",
  gray: "\x1B[90m"
};
var HUD_CONFIG = {
  // Whether to dynamically hide 'tasks' and 'subagents' blocks from the UI when their count is 0
  autoHideEmptyBlocks: true,
  // Budget ceiling defaults
  budget: {
    maxSteps: 20,
    maxContextTokens: 75e3
  },
  // Breakpoints in column widths
  breakpoints: {
    large: 135,
    medium: 75,
    small: 0
  },
  // Matrix rows map block IDs to visual layout ordering
  layouts: {
    large: [
      ["state", "mode", "model", "effort", "skill", "permissions"],
      ["workspace", "sandbox", "cache", "ctx"],
      ["steps", "5h", "weekly"],
      ["tasks", "subagents", "tool"],
      ["artifacts"],
      ["looper"],
      ["git"],
      ["transcript"]
    ],
    medium: [
      ["state", "mode", "model", "effort", "skill", "permissions"],
      ["workspace", "sandbox", "cache", "ctx"],
      ["steps", "5h", "weekly"],
      ["tasks", "subagents", "tool"],
      ["artifacts"],
      ["looper"],
      ["git"],
      ["transcript"]
    ],
    small: [
      ["state", "mode", "model", "effort", "skill", "permissions"],
      ["workspace", "sandbox"],
      ["cache", "ctx"],
      ["steps", "5h", "weekly"],
      ["tasks", "subagents", "tool"],
      ["artifacts"],
      ["looper"],
      ["git"],
      ["transcript"]
    ]
  }
};
function formatMetrics(metrics, width = 80) {
  const termWidth = metrics.terminalWidth || width || 80;
  const paddedState = metrics.agentState.padEnd(7, " ");
  const agentLabel = metrics.agentName ? `[${metrics.agentName}] ` : "";
  let stateIndicator = `\u{1F916} ${agentLabel}${paddedState}`;
  if (metrics.agentState === "IDLE") stateIndicator = `${colors.green}\u{1F7E2} ${agentLabel}${paddedState}${colors.reset}`;
  else if (metrics.agentState === "WAITING") stateIndicator = `${colors.yellow}\u{1F7E1} ${agentLabel}${paddedState}${colors.reset}`;
  else stateIndicator = `${colors.cyan}\u{1F535} ${agentLabel}${paddedState}${colors.reset}`;
  const getThresholdColor = (percent) => {
    if (percent >= 85) return colors.red;
    if (percent >= 60) return colors.yellow;
    return colors.green;
  };
  const ctxColor = metrics.exceeds200k ? colors.red : getThresholdColor(metrics.contextUsage);
  const exceedWarning = metrics.exceeds200k ? ` ${colors.red}${colors.bold}\u{1F6A8} >200k! Agent may start degrading.${colors.reset}` : "";
  const formatTokenCount = (tokens) => {
    if (!tokens || tokens <= 0) return "0";
    if (tokens >= 1e6) {
      const val = (tokens / 1e6).toFixed(1).replace(".0", "");
      return `${val}M`;
    }
    if (tokens >= 1e3) {
      return `${Math.round(tokens / 1e3)}k`;
    }
    return `${tokens}`;
  };
  const formatTime = (sec) => {
    if (sec <= 0) return "00:00";
    const d = Math.floor(sec / 86400);
    const h = Math.floor(sec % 86400 / 3600);
    const m = Math.floor(sec % 3600 / 60);
    if (d > 0) return `${d}d ${h}h`;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };
  const qWColor = getThresholdColor(metrics.quotaWeekly);
  const q5Color = getThresholdColor(metrics.quota5h);
  const taskColor = metrics.taskCount > 0 ? colors.yellow : colors.gray;
  const renderMicroBar = (percent, color, width2 = 5) => {
    const clamped = Math.max(0, Math.min(100, percent));
    const filledCount = Math.round(clamped / 100 * width2);
    const emptyCount = width2 - filledCount;
    return `${color}${"\u25B0".repeat(filledCount)}${colors.reset}${colors.gray}${"\u25B1".repeat(emptyCount)}${colors.reset}`;
  };
  const ctxBar = renderMicroBar(metrics.contextUsage, ctxColor, 5);
  const q5Bar = renderMicroBar(metrics.quota5h, q5Color, 5);
  const qWBar = renderMicroBar(metrics.quotaWeekly, qWColor, 5);
  const modeColors = {
    "request-review": `${colors.yellow}\u{1F7E1} request-review${colors.reset}`,
    "accept-edits": `${colors.green}\u{1F7E2} accept-edits${colors.reset}`,
    "plan": `${colors.blue}\u{1F535} plan${colors.reset}`
  };
  const modeStr = modeColors[metrics.executionMode] || `${colors.yellow}\u{1F7E1} request-review${colors.reset}`;
  const effortColors = {
    "low": `${colors.green}\u{F0F86} low${colors.reset}`,
    "normal": `${colors.yellow}\u{F0F86} normal${colors.reset}`,
    "high": `${colors.red}\u{F0F86} high${colors.reset}`,
    "epic": `${colors.red}${colors.bold}\u{F0F86} epic${colors.reset}`
  };
  const eff = (metrics.effort || "normal").toLowerCase();
  const effortStr = `Effort: ${effortColors[eff] || effortColors["normal"]}`;
  let skillBlockStr = "";
  if (metrics.activeSkills && metrics.activeSkills.length > 0) {
    const label = metrics.activeSkills.length > 1 ? "\u{1F9E0} Skills:" : "\u{1F9E0} Skill:";
    const names = metrics.activeSkills.map((s) => `${colors.cyan}${s}${colors.reset}`).join(" & ");
    skillBlockStr = `${label} ${names}`;
  }
  const envMaxSteps = process.env.AGY_MAX_STEPS ? parseInt(process.env.AGY_MAX_STEPS, 10) : void 0;
  const maxSteps = envMaxSteps && !isNaN(envMaxSteps) ? envMaxSteps : metrics.maxSteps || HUD_CONFIG.budget?.maxSteps || 20;
  const stepCount = metrics.stepCount || 0;
  const stepPct = Math.round(stepCount / maxSteps * 100);
  const stepColor = getThresholdColor(stepPct);
  const stepBar = renderMicroBar(stepPct, stepColor, 5);
  const stepStr = `\u{1F45F} Steps: ${stepBar} ${stepColor}${stepCount}/${maxSteps}${colors.reset}`;
  const envMaxTokens = process.env.AGY_MAX_CONTEXT_TOKENS ? parseInt(process.env.AGY_MAX_CONTEXT_TOKENS, 10) : void 0;
  const configMaxTokens = HUD_CONFIG.budget?.maxContextTokens;
  const limitTokens = envMaxTokens && !isNaN(envMaxTokens) ? envMaxTokens : metrics.maxContextTokens > 0 ? metrics.maxContextTokens : configMaxTokens || metrics.contextWindowSize || 1048576;
  const usedTokensStr = formatTokenCount(metrics.totalInputTokens);
  const limitTokensStr = formatTokenCount(limitTokens);
  const blocks = {
    state: stateIndicator,
    mode: modeStr,
    effort: effortStr,
    skill: skillBlockStr,
    model: `\u{1F916} ${colors.bold}${metrics.model}${colors.reset}`,
    sandbox: metrics.isSandboxed ? `${colors.gray}\u{1F512} Sandboxed${colors.reset}` : `${colors.yellow}\u{1F513} Unsandboxed${colors.reset}`,
    permissions: metrics.skipPermissions ? `${colors.red}\u2622\uFE0F Danger Mode${colors.reset}` : "",
    workspace: `\u{1F4C2} ${colors.blue}${metrics.workspace}${colors.reset}`,
    steps: stepStr,
    git: metrics.gitBranch ? `\u{1F331} ${colors.cyan}${metrics.gitBranch}${colors.reset}` : "",
    artifacts: metrics.artifactCount > 0 ? `\u{1F4C4} Artifacts: ${colors.yellow}${metrics.artifactCount}${colors.reset}` : "",
    ctx: `\u{1F3A7} Ctx: ${ctxBar} ${ctxColor}${metrics.contextUsage}%${colors.reset} (${usedTokensStr}/${limitTokensStr})${exceedWarning}`,
    cache: metrics.cacheTokens > 0 ? `\u26A1 Cache: ${colors.cyan}${formatTokenCount(metrics.cacheTokens)}${colors.reset}` : "",
    "5h": `\u{1F552} 5h: ${q5Bar} ${q5Color}${metrics.quota5h}%${colors.reset} (${formatTime(metrics.quota5hResetSeconds)})`,
    weekly: `\u{1F552} Weekly: ${qWBar} ${qWColor}${metrics.quotaWeekly}%${colors.reset} (${formatTime(metrics.quotaWeeklyResetSeconds)})`,
    tasks: `\u2699\uFE0F  Active Tasks: ${taskColor}${metrics.taskCount}${colors.reset}`,
    tool: metrics.activeTool ? `\u{1F6E0}\uFE0F  ${colors.cyan}${metrics.activeTool.name}${metrics.activeTool.summary ? ` (${metrics.activeTool.summary})` : ""}${colors.reset}` : "",
    version: `\u{1F4E6} v${metrics.version}`,
    email: `\u{1F4E7} ${colors.dim}${metrics.email}${colors.reset}`,
    plan: `\u{1F48E} ${metrics.planTier}`,
    transcript: metrics.transcriptPath ? `\u{1F4DC} tail -f ${metrics.transcriptPath.replace(os.homedir(), "~")}` : ""
  };
  const calculateStackedChunks = (items, maxVisible) => {
    let chunks = [];
    if (items.length === 0) {
      chunks.push([]);
    } else {
      const displayItems = items.slice(0, maxVisible);
      const hiddenCount = items.length - maxVisible;
      for (const item of displayItems) chunks.push([item]);
      if (hiddenCount > 0) chunks.push([`...and ${hiddenCount} more hidden`]);
    }
    return chunks;
  };
  const subStrs = metrics.subagents.map((s) => {
    const c = s.status === "completed" ? colors.green : s.status === "error" ? colors.red : colors.yellow;
    let shortRole = s.role;
    if (shortRole.length > 25) shortRole = shortRole.substring(0, 22) + "...";
    const depth = s.depth || 0;
    const prefix = depth > 0 ? "  ".repeat(depth) + "\u21B3 " : "";
    const idStr = s.conversationId ? ` ${colors.dim}[id:${s.conversationId.substring(0, 6)}]${colors.reset}` : "";
    return `${prefix}${s.name}${idStr} [${c}${s.status}${colors.reset}] (${shortRole})`;
  });
  const chunkedSubagents = calculateStackedChunks(subStrs, 3);
  const gitStrs = (metrics.gitBranches || []).map((g) => `${g.name} (${colors.cyan}${g.branch}${colors.reset})`);
  const chunkedGit = calculateStackedChunks(gitStrs, 5);
  const artStrs = (metrics.artifacts || []).map((a) => `${colors.yellow}${a}${colors.reset}`);
  const chunkedArtifacts = calculateStackedChunks(artStrs, 5);
  const looperStrs = [];
  if (metrics.looperEpics) {
    for (const e of metrics.looperEpics) {
      const pColor = e.done === e.total ? colors.green : colors.yellow;
      const epicPct = e.total > 0 ? Math.round(e.done / e.total * 100) : 0;
      const epicBar = renderMicroBar(epicPct, pColor, 5);
      looperStrs.push(`\u{1F3AF} ${colors.dim}${e.repo} -${colors.reset} Epic: ${colors.bold}${e.epic}${colors.reset} ${epicBar} [${pColor}${e.done}/${e.total} DONE${colors.reset}]`);
    }
  }
  for (const m of metrics.looperMissions || []) {
    const statusColor = m.status === "IN_PROGRESS" ? colors.cyan : m.status === "FAILED" || m.status === "BLOCKED" ? colors.red : colors.green;
    let suffix = "";
    if (m.iteration && m.maxIterations && (m.status === "IN_PROGRESS" || m.status === "PENDING")) {
      suffix = ` Iteration ${m.iteration}/${m.maxIterations}`;
    } else if (m.reason && (m.status === "FAILED" || m.status === "BLOCKED")) {
      suffix = ` - ${m.reason}`;
    }
    looperStrs.push(`\u2022 ${colors.dim}${m.repo} -${colors.reset} ${colors.bold}${m.epic}/${m.mission}${colors.reset} [${statusColor}${m.status}${suffix}${colors.reset}]`);
  }
  const chunkedLooper = calculateStackedChunks(looperStrs, 5);
  let activeLayout = [];
  if (termWidth >= HUD_CONFIG.breakpoints.large) activeLayout = HUD_CONFIG.layouts.large;
  else if (termWidth >= HUD_CONFIG.breakpoints.medium) activeLayout = HUD_CONFIG.layouts.medium;
  else activeLayout = HUD_CONFIG.layouts.small;
  activeLayout = activeLayout.map((row) => [...row]);
  if (termWidth <= 75) {
    activeLayout = activeLayout.map((row) => row.filter((k) => k !== "weekly"));
  }
  if (termWidth <= 70) {
    activeLayout = activeLayout.map((row) => row.filter((k) => k !== "sandbox"));
  }
  if (HUD_CONFIG.autoHideEmptyBlocks) {
    if (metrics.taskCount === 0) {
      activeLayout = activeLayout.map((row) => row.filter((k) => k !== "tasks"));
    }
    if (metrics.subagents.length === 0) {
      activeLayout = activeLayout.map((row) => row.filter((k) => k !== "subagents"));
    }
    if (!metrics.activeTool) {
      activeLayout = activeLayout.map((row) => row.filter((k) => k !== "tool"));
    }
    if (!metrics.artifacts || metrics.artifacts.length === 0) {
      activeLayout = activeLayout.map((row) => row.filter((k) => k !== "artifacts"));
    }
    if ((!metrics.looperMissions || metrics.looperMissions.length === 0) && (!metrics.looperEpics || metrics.looperEpics.length === 0)) {
      activeLayout = activeLayout.map((row) => row.filter((k) => k !== "looper"));
    }
    if (!metrics.gitBranches || metrics.gitBranches.length === 0) {
      activeLayout = activeLayout.map((row) => row.filter((k) => k !== "git"));
    }
    if (metrics.cacheTokens === 0) {
      activeLayout = activeLayout.map((row) => row.filter((k) => k !== "cache"));
    }
    if (!metrics.activeSkills || metrics.activeSkills.length === 0) {
      activeLayout = activeLayout.map((row) => row.filter((k) => k !== "skill"));
    }
    if (!metrics.transcriptPath) {
      activeLayout = activeLayout.map((row) => row.filter((k) => k !== "transcript"));
    }
  }
  activeLayout = activeLayout.filter((row) => row.length > 0);
  let finalLines = [];
  for (let rowIndex = 0; rowIndex < activeLayout.length; rowIndex++) {
    const rowKeys = activeLayout[rowIndex];
    const stackableKeys = ["subagents", "git", "artifacts", "looper"];
    const stackedKey = stackableKeys.find((k) => rowKeys.includes(k));
    if (stackedKey) {
      const stackedIdx = rowKeys.indexOf(stackedKey);
      let chunks = [];
      let emptyTitle = "";
      let populatedTitle = "";
      if (stackedKey === "subagents") {
        chunks = chunkedSubagents;
        emptyTitle = "\u{1F465} Subagents (0)";
        populatedTitle = "\u{1F465} Subagents:";
      } else if (stackedKey === "git") {
        chunks = chunkedGit;
        emptyTitle = "\u{1F331} Branches (0)";
        populatedTitle = "\u{1F331} Active Branches:";
      } else if (stackedKey === "artifacts") {
        chunks = chunkedArtifacts;
        emptyTitle = "\u{1F4C4} Artifacts (0)";
        const shortId = metrics.conversationId ? metrics.conversationId.substring(0, 8) : "";
        populatedTitle = `\u{1F4C4} Artifacts (open ~/.gemini/antigravity-cli/brain/${shortId}*):`;
      } else if (stackedKey === "looper") {
        chunks = chunkedLooper;
        emptyTitle = "\u{1F504} Looper (0)";
        populatedTitle = "\u{1F504} Active Looper Missions:";
      }
      const beforeStack = rowKeys.slice(0, stackedIdx).map((k) => blocks[k]).filter(Boolean);
      const afterStack = rowKeys.slice(stackedIdx + 1).map((k) => blocks[k]).filter(Boolean);
      const beforeStr = beforeStack.length > 0 ? beforeStack.join("  |  ") + "  |  " : "";
      const afterStr = afterStack.length > 0 ? "  |  " + afterStack.join("  |  ") : "";
      const stripAnsi = (str) => str.replace(/\x1b\[[0-9;]*m/g, "");
      const padLen = stripAnsi(beforeStr).length + 4;
      const padding = " ".repeat(Math.max(0, padLen));
      for (let i = 0; i < chunks.length; i++) {
        const stackItemStr = chunks[i].join("  \u2022  ");
        let rowContent = "";
        if (i === 0) {
          if (chunks[0].length === 0 || !chunks[0][0]) {
            rowContent = `${beforeStr}${emptyTitle}${afterStr}`;
            finalLines.push(rowContent);
          } else {
            rowContent = `${beforeStr}${populatedTitle}${afterStr}`;
            finalLines.push(rowContent);
            rowContent = `${padding}${colors.dim}${colors.reset}${stackItemStr}`;
            finalLines.push(rowContent);
          }
        } else {
          rowContent = `${padding}${colors.dim}${colors.reset}${stackItemStr}`;
          finalLines.push(rowContent);
        }
      }
    } else {
      const renderedItems = rowKeys.map((k) => blocks[k]).filter(Boolean);
      finalLines.push(renderedItems.join("  |  "));
    }
  }
  const accentColor = metrics.agentState === "IDLE" ? colors.green : metrics.agentState === "WAITING" ? colors.yellow : colors.cyan;
  for (let i = 0; i < finalLines.length; i++) {
    if (i === 0) {
      finalLines[0] = `${accentColor}\u258C${colors.reset} ${finalLines[0]}`;
    } else {
      finalLines[i] = `${colors.dim}\u2502${colors.reset} ${finalLines[i]}`;
    }
  }
  return finalLines.join("\n");
}

// scripts/demo.ts
var mockMetrics = {
  agentState: "WORKING",
  agentName: "Antigravity",
  executionMode: "plan",
  effort: "high",
  activeSkills: ["looper", "tdd", "mapper"],
  model: "Gemini 3.6 Flash",
  isSandboxed: false,
  skipPermissions: false,
  workspace: "acme-corp/work",
  stepCount: 14,
  maxSteps: 20,
  contextUsage: 72,
  totalInputTokens: 54e3,
  maxContextTokens: 75e3,
  cacheTokens: 12e4,
  quotaType: "Gemini",
  quotaWeekly: 85,
  quotaWeeklyResetSeconds: 86400 * 2,
  quota5h: 45,
  quota5hResetSeconds: 3600,
  taskCount: 3,
  activeTool: {
    name: "run_command",
    summary: "git status",
    status: "running"
  },
  subagents: [
    { name: "orchestrator", role: "Epic Runner", status: "working", depth: 0, conversationId: "abc12345" },
    { name: "worker-1", role: "Feature Dev", status: "working", depth: 1, conversationId: "def67890" },
    { name: "researcher", role: "Context Finder", status: "completed", depth: 2, conversationId: "ghi11223" },
    { name: "reviewer", role: "Code Review", status: "working", depth: 1, conversationId: "jkl44556" }
  ],
  artifacts: [
    "architecture_review.md",
    "database_schema.md"
  ],
  artifactCount: 2,
  conversationId: "ad266f1f-75f3-44dd-b073-c93a1bedc277",
  looperEpics: [
    { repo: "acme-corp/work", epic: "auth-v2", total: 5, done: 3 }
  ],
  looperMissions: [
    { repo: "sample_faqs", epic: "setup", mission: "M1_setup", status: "IN_PROGRESS", iteration: 2, maxIterations: 5 },
    { repo: "auth-system", epic: "auth", mission: "epic_runner", status: "DONE" }
  ],
  gitBranches: [
    { name: "acme-corp/work", branch: "feature/hud-nested-agents" },
    { name: "acme-corp/service-b", branch: "main" }
  ],
  transcriptPath: `${process.env.HOME || "/Users/user"}/.gemini/antigravity-cli/brain/ad266f1f-75f3-44dd-b073-c93a1bedc277/.system_generated/logs/transcript.jsonl`,
  sessionName: "ad266f1f-75f3-44dd-b073-c93a1bedc277",
  version: "2.4.0",
  email: "developer@example.com",
  planTier: "Pro",
  terminalWidth: 140,
  exceeds200k: false
};
var out = formatMetrics(mockMetrics, process.stdout.columns || 140);
console.log(out);

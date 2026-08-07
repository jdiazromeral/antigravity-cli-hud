import { ParsedMetrics } from './parser.js';
import * as os from 'os';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

// ============================================================================
// HUD LAYOUT CONFIGURATION
// You can dynamically re-arrange the terminal layout here!
// Available blocks: 'state', 'mode', 'effort', 'model', 'sandbox', 'permissions', 'workspace', 'git', 'artifacts', 'ctx', '5h', 'weekly', 'tasks', 'subagents', 'tool', 'transcript'
// Note: To completely disable the Looper integration, simply remove 'looper' from the layout arrays below.
// ============================================================================
export const HUD_CONFIG = {
  // Whether to dynamically hide 'tasks' and 'subagents' blocks from the UI when their count is 0
  autoHideEmptyBlocks: true,
  // Budget ceiling defaults
  budget: {
    maxSteps: 20
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
      ['state', 'mode', 'model', 'effort', 'skill', 'version', 'plan', 'permissions'],
      ['workspace', 'sandbox', 'cache', 'ctx'],
      ['steps', '5h', 'weekly'],
      ['tasks', 'subagents', 'tool'],
      ['artifacts'],
      ['looper'],
      ['git'],
      ['transcript']
    ],
    medium: [
      ['state', 'mode', 'model', 'effort', 'skill', 'permissions'],
      ['workspace', 'sandbox', 'cache', 'ctx'],
      ['steps', '5h', 'weekly'],
      ['tasks', 'subagents', 'tool'],
      ['artifacts'],
      ['looper'],
      ['git'],
      ['transcript']
    ],
    small: [
      ['state', 'mode', 'model', 'effort', 'skill', 'permissions'],
      ['workspace', 'sandbox'],
      ['cache', 'ctx'],
      ['steps', '5h', 'weekly'],
      ['tasks', 'subagents', 'tool'],
      ['artifacts'],
      ['looper'],
      ['git'],
      ['transcript']
    ]
  }
};

export function formatMetrics(metrics: ParsedMetrics, width: number = 80): string {
  const termWidth = metrics.terminalWidth || width || 80;

  // 1. Calculate Blocks Independently
  const paddedState = metrics.agentState.padEnd(7, ' ');
  const agentLabel = metrics.agentName ? `[${metrics.agentName}] ` : '';
  let stateIndicator = `🤖 ${agentLabel}${paddedState}`;
  if (metrics.agentState === 'IDLE') stateIndicator = `${colors.green}🟢 ${agentLabel}${paddedState}${colors.reset}`;
  else if (metrics.agentState === 'WAITING') stateIndicator = `${colors.yellow}🟡 ${agentLabel}${paddedState}${colors.reset}`;
  else stateIndicator = `${colors.cyan}🔵 ${agentLabel}${paddedState}${colors.reset}`;

  // 3-tier traffic light threshold color logic for percentages
  const getThresholdColor = (percent: number) => {
    if (percent >= 85) return colors.red;
    if (percent >= 60) return colors.yellow;
    return colors.green;
  };
  
  const formatTokenCount = (tokens: number): string => {
    if (!tokens || tokens <= 0) return '0';
    if (tokens >= 1_000_000) {
      const val = (tokens / 1_000_000).toFixed(1).replace('.0', '');
      return `${val}M`;
    }
    if (tokens >= 1_000) {
      return `${Math.round(tokens / 1000)}k`;
    }
    return `${tokens}`;
  };

  // Format quota values
  const formatTime = (sec: number) => {
    if (sec <= 0) return '00:00';
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const qWColor = getThresholdColor(metrics.quotaWeekly);
  const q5Color = getThresholdColor(metrics.quota5h);
  const taskColor = metrics.taskCount > 0 ? colors.yellow : colors.gray;

  const renderMicroBar = (percent: number, color: string, width: number = 5) => {
    const clamped = Math.max(0, Math.min(100, percent));
    const filledCount = Math.round((clamped / 100) * width);
    const emptyCount = width - filledCount;
    return `${color}${'▰'.repeat(filledCount)}${colors.reset}${colors.gray}${'▱'.repeat(emptyCount)}${colors.reset}`;
  };

  const q5Bar = renderMicroBar(metrics.quota5h, q5Color, 5);
  const qWBar = renderMicroBar(metrics.quotaWeekly, qWColor, 5);

  const modeColors: Record<string, string> = {
    'request-review': `${colors.yellow}🟡 request-review${colors.reset}`,
    'accept-edits': `${colors.green}🟢 accept-edits${colors.reset}`,
    'plan': `${colors.blue}🔵 plan${colors.reset}`
  };
  
  let vimBadge = '';
  if (metrics.editorMode) {
    const m = metrics.editorMode.toUpperCase().charAt(0);
    let icon = '';
    if (m === 'I') icon = '';
    else if (m === 'V') icon = '';
    
    const color = m === 'I' ? colors.yellow : (m === 'V' ? colors.blue : colors.cyan);
    vimBadge = ` ${color}${icon}${colors.reset}`;
  }
  const modeStr = (modeColors[metrics.executionMode] || `${colors.yellow}🟡 request-review${colors.reset}`) + vimBadge;

  const effortColors: Record<string, string> = {
    'low': `${colors.green}󰾆 low${colors.reset}`,
    'normal': `${colors.yellow}󰾆 normal${colors.reset}`,
    'high': `${colors.red}󰾆 high${colors.reset}`,
    'epic': `${colors.red}${colors.bold}󰾆 epic${colors.reset}`
  };
  const eff = (metrics.effort || 'normal').toLowerCase();
  const effortStr = `Effort: ${effortColors[eff] || effortColors['normal']}`;

  let skillBlockStr = '';
  if (metrics.activeSkills && metrics.activeSkills.length > 0) {
    const label = metrics.activeSkills.length > 1 ? '🧠 Skills:' : '🧠 Skill:';
    const names = metrics.activeSkills.map(s => `${colors.cyan}${s}${colors.reset}`).join(' & ');
    skillBlockStr = `${label} ${names}`;
  }

  const envMaxSteps = process.env.AGY_MAX_STEPS ? parseInt(process.env.AGY_MAX_STEPS, 10) : undefined;
  const maxSteps = (envMaxSteps && !isNaN(envMaxSteps)) ? envMaxSteps : (metrics.maxSteps || HUD_CONFIG.budget?.maxSteps || 20);
  const stepCount = metrics.stepCount || 0;
  const stepPct = Math.round((stepCount / maxSteps) * 100);
  const stepColor = getThresholdColor(stepPct);
  const stepBar = renderMicroBar(stepPct, stepColor, 5);
  const stepStr = `👟 Steps: ${stepBar} ${stepColor}${stepCount}/${maxSteps}${colors.reset}`;

  const envMaxTokens = process.env.AGY_MAX_CONTEXT_TOKENS ? parseInt(process.env.AGY_MAX_CONTEXT_TOKENS, 10) : undefined;
  const configMaxTokens = HUD_CONFIG.budget?.maxContextTokens;
  const limitTokens = (envMaxTokens && !isNaN(envMaxTokens))
    ? envMaxTokens
    : (metrics.maxContextTokens > 0 ? metrics.maxContextTokens : (metrics.contextWindowSize || configMaxTokens || 1048576));

  const envSoftTokens = process.env.AGY_SOFT_CONTEXT_TOKENS ? parseInt(process.env.AGY_SOFT_CONTEXT_TOKENS, 10) : undefined;
  const softLimitTokens = (envSoftTokens && !isNaN(envSoftTokens)) ? envSoftTokens : 200_000;

  let usedTokens = metrics.totalInputTokens;
  if (!usedTokens && metrics.contextUsage > 0 && limitTokens > 0) {
    usedTokens = Math.round((metrics.contextUsage / 100) * limitTokens);
  }

  const isSmallLimit = limitTokens < softLimitTokens;
  const effectiveSoftLimit = isSmallLimit ? limitTokens : softLimitTokens;

  const softPct = Math.round((usedTokens / effectiveSoftLimit) * 100);
  const ctxColor = (metrics.exceeds200k || softPct >= 85) ? colors.red : (softPct >= 60 ? colors.yellow : colors.green);
  const exceedWarning = metrics.exceeds200k ? ` ${colors.red}${colors.bold}🚨 >200k! Agent may start degrading.${colors.reset}` : '';
  const ctxBar = renderMicroBar(softPct, ctxColor, 5);

  const usedTokensStr = formatTokenCount(usedTokens);
  const softLimitTokensStr = formatTokenCount(softLimitTokens);
  const limitTokensStr = formatTokenCount(limitTokens);

  const ratioStr = isSmallLimit
    ? `${usedTokensStr}/${limitTokensStr} max`
    : `${usedTokensStr}/${softLimitTokensStr} soft • ${limitTokensStr} max`;

  const blocks: Record<string, string> = {
    state: stateIndicator,
    mode: modeStr,
    effort: effortStr,
    skill: skillBlockStr,
    model: `🤖 ${colors.bold}${metrics.model}${colors.reset}`,
    sandbox: metrics.isSandboxed ? `${colors.gray}🔒 Sandboxed${colors.reset}` : `${colors.yellow}🔓 Unsandboxed${colors.reset}`,
    permissions: metrics.skipPermissions ? `${colors.red}☢️ Danger Mode${colors.reset}` : '',
    workspace: `📂 ${colors.blue}${metrics.workspace}${colors.reset}`,
    steps: stepStr,
    git: metrics.gitBranch ? `🌱 ${colors.cyan}${metrics.gitBranch}${colors.reset}` : '',
    artifacts: metrics.artifactCount > 0 ? `📄 Artifacts: ${colors.yellow}${metrics.artifactCount}${colors.reset}` : '',
    ctx: `🎧 Ctx: ${ctxBar} ${ctxColor}${softPct}%${colors.reset} (${ratioStr})${exceedWarning}`,
    cache: metrics.cacheTokens > 0 ? `⚡ Cache: ${colors.cyan}${formatTokenCount(metrics.cacheTokens)}${colors.reset}` : '',
    '5h': `🕒 5h: ${q5Bar} ${q5Color}${metrics.quota5h}%${colors.reset} (${formatTime(metrics.quota5hResetSeconds)})`,
    weekly: `🕒 Weekly: ${qWBar} ${qWColor}${metrics.quotaWeekly}%${colors.reset} (${formatTime(metrics.quotaWeeklyResetSeconds)})`,
    credits: metrics.credits !== undefined ? `󰠖 AI Credits: ${colors.yellow}${metrics.credits}${colors.reset}` : '',
    tasks: `⚙️  Active Tasks: ${taskColor}${metrics.taskCount}${colors.reset}`,
    tool: metrics.activeTool ? `🛠️  ${colors.cyan}${metrics.activeTool.name}${metrics.activeTool.summary ? ` (${metrics.activeTool.summary})` : ''}${colors.reset}` : '',
    version: `📦 v${metrics.version}`,
    email: `📧 ${colors.dim}${metrics.email}${colors.reset}`,
    plan: `💎 ${metrics.planTier}`,
    transcript: metrics.transcriptPath ? `📜 tail -f ${metrics.transcriptPath.replace(os.homedir(), '~')}` : ''
  };

  // Generalized pre-calculator for stacked blocks
  const calculateStackedChunks = (items: string[], maxVisible: number) => {
    const chunks: string[][] = [];
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

  const isNarrow = termWidth <= 75;

  const formatSubagentStatus = (status: string, narrow: boolean): { label: string; color: string } => {
    const s = (status || '').toLowerCase();
    let color = colors.yellow;
    if (s === 'completed' || s === 'done' || s === 'ok') {
      color = colors.green;
    } else if (s === 'error' || s === 'errored' || s === 'failed') {
      color = colors.red;
    }

    if (!narrow) {
      return { label: status, color };
    }

    let label = status;
    if (s === 'completed' || s === 'done' || s === 'ok') {
      label = 'done';
    } else if (s === 'error' || s === 'errored' || s === 'failed') {
      label = 'err';
    } else if (s === 'working' || s === 'running' || s === 'in_progress') {
      label = 'run';
    } else if (s.startsWith('waiting')) {
      label = 'wait';
    } else if (s === 'cancelled' || s === 'canceling') {
      label = 'cancel';
    } else if (s.length > 6) {
      label = s.substring(0, 5) + '.';
    }

    return { label, color };
  };

  const subStrs = metrics.subagents.map(s => {
    const { label: statusLabel, color: statusColor } = formatSubagentStatus(s.status, isNarrow);
    let shortRole = s.role || '';
    const maxRoleLen = isNarrow ? 15 : 25;
    if (shortRole.length > maxRoleLen) {
      shortRole = shortRole.substring(0, maxRoleLen - 3) + '...';
    }
    const depth = typeof s.depth === 'number' && s.depth > 0 ? s.depth : 0;
    const prefix = depth > 0 ? '  '.repeat(depth) + '↳ ' : '';
    const idStr = s.conversationId ? ` ${colors.dim}[id:${s.conversationId.substring(0, 6)}]${colors.reset}` : '';
    return `${prefix}${s.name}${idStr} [${statusColor}${statusLabel}${colors.reset}] (${shortRole})`;
  });
  const chunkedSubagents = calculateStackedChunks(subStrs, 3);

  const gitStrs = (metrics.gitBranches || []).map(g => `${g.name} (${colors.cyan}${g.branch}${colors.reset})`);
  const chunkedGit = calculateStackedChunks(gitStrs, 5);
  
  const artStrs = (metrics.artifacts || []).map(a => `${colors.yellow}${a}${colors.reset}`);
  const chunkedArtifacts = calculateStackedChunks(artStrs, 5);

  const looperStrs: string[] = [];
  if (metrics.looperEpics) {
    for (const e of metrics.looperEpics) {
      const pColor = e.done === e.total ? colors.green : colors.yellow;
      const epicPct = e.total > 0 ? Math.round((e.done / e.total) * 100) : 0;
      const epicBar = renderMicroBar(epicPct, pColor, 5);
      looperStrs.push(`🎯 ${colors.dim}${e.repo} -${colors.reset} Epic: ${colors.bold}${e.epic}${colors.reset} ${epicBar} [${pColor}${e.done}/${e.total} DONE${colors.reset}]`);
    }
  }
  for (const m of (metrics.looperMissions || [])) {
    const statusColor = m.status === 'IN_PROGRESS' ? colors.cyan : (m.status === 'FAILED' || m.status === 'BLOCKED' ? colors.red : colors.green);
    
    let suffix = '';
    if (m.iteration && m.maxIterations && (m.status === 'IN_PROGRESS' || m.status === 'PENDING')) {
      suffix = ` Iteration ${m.iteration}/${m.maxIterations}`;
    } else if (m.reason && (m.status === 'FAILED' || m.status === 'BLOCKED')) {
      suffix = ` - ${m.reason}`;
    }
    
    looperStrs.push(`• ${colors.dim}${m.repo} -${colors.reset} ${colors.bold}${m.epic}/${m.mission}${colors.reset} [${statusColor}${m.status}${suffix}${colors.reset}]`);
  }
  const chunkedLooper = calculateStackedChunks(looperStrs, 5);

  // 2. Responsive Router
  let activeLayout: string[][] = [];
  if (termWidth >= HUD_CONFIG.breakpoints.large) activeLayout = HUD_CONFIG.layouts.large;
  else if (termWidth >= HUD_CONFIG.breakpoints.medium) activeLayout = HUD_CONFIG.layouts.medium;
  else activeLayout = HUD_CONFIG.layouts.small;

  // Clone to avoid mutating the global configuration
  activeLayout = activeLayout.map(row => [...row]);

  // Responsive Culling: Drop non-essential blocks on narrow screens
  if (termWidth <= 75) {
    activeLayout = activeLayout.map(row => row.filter(k => k !== 'weekly'));
  }
  if (termWidth <= 70) {
    activeLayout = activeLayout.map(row => row.filter(k => k !== 'sandbox'));
  }

  // Handle credits overriding quotas
  if (metrics.credits !== undefined) {
    activeLayout = activeLayout.map(row => {
      const newRow: string[] = [];
      for (const k of row) {
        if (k === '5h') {
          newRow.push('credits');
        } else if (k === 'weekly') {
          // Hide weekly when credits are present
        } else {
          newRow.push(k);
        }
      }
      return newRow;
    });
  }

  // Dynamic Culling: Hide tasks and subagents when they are inactive to prevent clutter
  if (HUD_CONFIG.autoHideEmptyBlocks) {
    if (metrics.taskCount === 0) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'tasks'));
    }
    if (metrics.subagents.length === 0) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'subagents'));
    }
    if (!metrics.activeTool) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'tool'));
    }
    if (!metrics.artifacts || metrics.artifacts.length === 0) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'artifacts'));
    }
    if ((!metrics.looperMissions || metrics.looperMissions.length === 0) && (!metrics.looperEpics || metrics.looperEpics.length === 0)) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'looper'));
    }
    if (!metrics.gitBranches || metrics.gitBranches.length === 0) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'git'));
    }
    if (metrics.cacheTokens === 0) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'cache'));
    }
    if (!metrics.activeSkills || metrics.activeSkills.length === 0) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'skill'));
    }
    if (!metrics.transcriptPath) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'transcript'));
    }
  }

  // Clean up any rows that became entirely empty
  activeLayout = activeLayout.filter(row => row.length > 0);

  // 3. Matrix Builder
  const finalLines: string[] = [];
  
  for (let rowIndex = 0; rowIndex < activeLayout.length; rowIndex++) {
    const rowKeys = activeLayout[rowIndex];
    
    const stackableKeys = ['subagents', 'git', 'artifacts', 'looper'];
    const stackedKey = stackableKeys.find(k => rowKeys.includes(k));
    
    if (stackedKey) {
      const stackedIdx = rowKeys.indexOf(stackedKey);
      let chunks: string[][] = [];
      let emptyTitle = '';
      let populatedTitle = '';
      
      if (stackedKey === 'subagents') {
         chunks = chunkedSubagents;
         emptyTitle = '👥 Subagents (0)';
         populatedTitle = '👥 Subagents:';
      } else if (stackedKey === 'git') {
         chunks = chunkedGit;
         emptyTitle = '🌱 Branches (0)';
         populatedTitle = '🌱 Active Branches:';
      } else if (stackedKey === 'artifacts') {
         chunks = chunkedArtifacts;
         emptyTitle = '📄 Artifacts (0)';
         const shortId = metrics.conversationId ? metrics.conversationId.substring(0, 8) : '';
         populatedTitle = `📄 Artifacts (open ~/.gemini/antigravity-cli/brain/${shortId}*):`;
      } else if (stackedKey === 'looper') {
         chunks = chunkedLooper;
         emptyTitle = '🔄 Looper (0)';
         populatedTitle = '🔄 Active Looper Missions:';
      }
      
      const beforeStack = rowKeys.slice(0, stackedIdx).map(k => blocks[k]).filter(Boolean);
      const afterStack = rowKeys.slice(stackedIdx + 1).map(k => blocks[k]).filter(Boolean);
      
      const beforeStr = beforeStack.length > 0 ? beforeStack.join('  |  ') + '  |  ' : '';
      const afterStr = afterStack.length > 0 ? '  |  ' + afterStack.join('  |  ') : '';

      // Calculate visual padding to align wrapped lines under the title
      const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '');
      const padLen = stripAnsi(beforeStr).length + 4; // indent 4 spaces relative to the title
      const padding = ' '.repeat(Math.max(0, padLen));

      for (let i = 0; i < chunks.length; i++) {
        const stackItemStr = chunks[i].join('  •  ');
        
        let rowContent = '';
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
      const renderedItems = rowKeys.map(k => blocks[k]).filter(Boolean);
      finalLines.push(renderedItems.join('  |  '));
    }
  }

  // 4. Accent Bar & Vertical Guide Injector
  const accentColor = metrics.agentState === 'IDLE' ? colors.green : (metrics.agentState === 'WAITING' ? colors.yellow : colors.cyan);

  for (let i = 0; i < finalLines.length; i++) {
    if (i === 0) {
      finalLines[0] = `${accentColor}▌${colors.reset} ${finalLines[0]}`;
    } else {
      finalLines[i] = `${colors.dim}│${colors.reset} ${finalLines[i]}`;
    }
  }

  return finalLines.join('\n');
}

import { ParsedMetrics } from './parser.js';

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
// Available blocks: 'state', 'model', 'sandbox', 'permissions', 'workspace', 'git', 'artifacts', 'ctx', '5h', 'weekly', 'tasks', 'subagents'
// Note: To completely disable the Looper integration, simply remove 'looper' from the layout arrays below.
// ============================================================================
export const HUD_CONFIG = {
  // Whether to dynamically hide 'tasks' and 'subagents' blocks from the UI when their count is 0
  autoHideEmptyBlocks: true,
  // Breakpoints in column widths
  breakpoints: {
    large: 135,
    medium: 75,
    small: 0
  },
  // Matrix rows map block IDs to visual layout ordering
  layouts: {
    large: [
      ['state', 'mode', 'model', 'permissions'],
      ['workspace', 'sandbox', 'ctx', 'cache', '5h', 'weekly'],
      ['tasks', 'subagents'],
      ['artifacts'],
      ['looper'],
      ['git']
    ],
    medium: [
      ['state', 'mode', 'model', 'permissions'],
      ['workspace', 'sandbox'],
      ['ctx', 'cache', '5h', 'weekly'],
      ['tasks', 'subagents'],
      ['artifacts'],
      ['looper'],
      ['git']
    ],
    small: [
      ['state', 'mode', 'model', 'permissions'],
      ['sandbox'],
      ['workspace', 'ctx', 'cache'],
      ['5h', 'weekly'],
      ['tasks', 'subagents'],
      ['artifacts'],
      ['looper'],
      ['git']
    ]
  }
};

export function formatMetrics(metrics: ParsedMetrics, width: number = 80): string {
  const termWidth = metrics.terminalWidth || width || 80;

  // 1. Calculate Blocks Independently
  const paddedState = metrics.agentState.padEnd(7, ' ');
  let stateIndicator = `🤖 ${paddedState}`;
  if (metrics.agentState === 'IDLE') stateIndicator = `${colors.green}🟢 ${paddedState}${colors.reset}`;
  else if (metrics.agentState === 'WAITING') stateIndicator = `${colors.yellow}🟡 ${paddedState}${colors.reset}`;
  else stateIndicator = `${colors.cyan}🔵 ${paddedState}${colors.reset}`;

  // 3-tier traffic light threshold color logic for percentages
  const getThresholdColor = (percent: number) => {
    if (percent >= 85) return colors.red;
    if (percent >= 60) return colors.yellow;
    return colors.green;
  };

  const ctxColor = metrics.exceeds200k ? colors.red : getThresholdColor(metrics.contextUsage);
  const exceedWarning = metrics.exceeds200k ? ` ${colors.red}${colors.bold}🚨 >200k!${colors.reset}` : '';
  
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

  const modeColors: Record<string, string> = {
    'request-review': `${colors.yellow}🟡 request-review${colors.reset}`,
    'accept-edits': `${colors.green}🟢 accept-edits${colors.reset}`,
    'plan': `${colors.blue}🔵 plan${colors.reset}`
  };
  const modeStr = modeColors[metrics.executionMode] || `${colors.yellow}🟡 request-review${colors.reset}`;

  const blocks: Record<string, string> = {
    state: stateIndicator,
    mode: modeStr,
    model: `🤖 ${colors.bold}${metrics.model}${colors.reset}`,
    sandbox: metrics.isSandboxed ? `${colors.gray}🔒 Sandboxed${colors.reset}` : `${colors.yellow}🔓 Unsandboxed${colors.reset}`,
    permissions: metrics.skipPermissions ? `${colors.red}☢️  Danger Mode${colors.reset}` : '',
    workspace: `📂 ${colors.blue}${metrics.workspace}${colors.reset}`,
    git: metrics.gitBranch ? `🌱 ${colors.cyan}${metrics.gitBranch}${colors.reset}` : '',
    artifacts: metrics.artifactCount > 0 ? `📄 Artifacts: ${colors.yellow}${metrics.artifactCount}${colors.reset}` : '',
    ctx: `🎧 Ctx: ${ctxColor}${metrics.contextUsage}%${colors.reset} (${Math.round(metrics.totalInputTokens/1000)}k)${exceedWarning}`,
    cache: metrics.cacheTokens > 0 ? `⚡ Cache: ${colors.cyan}${Math.round(metrics.cacheTokens/1000)}k${colors.reset}` : '',
    '5h': `🕒 5h: ${q5Color}${metrics.quota5h}%${colors.reset} (${formatTime(metrics.quota5hResetSeconds)})`,
    weekly: `🕒 Weekly: ${qWColor}${metrics.quotaWeekly}%${colors.reset} (${formatTime(metrics.quotaWeeklyResetSeconds)})`,
    tasks: `⚙️  Active Tasks: ${taskColor}${metrics.taskCount}${colors.reset}`,
    version: `📦 v${metrics.version}`,
    email: `📧 ${colors.dim}${metrics.email}${colors.reset}`,
    plan: `💎 ${metrics.planTier}`
  };

  // Generalized pre-calculator for stacked blocks
  const calculateStackedChunks = (items: string[], maxVisible: number) => {
    let chunks: string[][] = [];
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

  const subStrs = metrics.subagents.map(s => {
    const c = s.status === 'completed' ? colors.green : (s.status === 'error' ? colors.red : colors.yellow);
    let shortRole = s.role;
    if (shortRole.length > 25) shortRole = shortRole.substring(0, 22) + '...';
    return `${s.name} [${c}${s.status}${colors.reset}] (${shortRole})`;
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
      looperStrs.push(`🎯 ${colors.dim}${e.repo} -${colors.reset} Epic: ${colors.bold}${e.epic}${colors.reset} [${pColor}${e.done}/${e.total} DONE${colors.reset}]`);
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

  // Dynamic Culling: Hide tasks and subagents when they are inactive to prevent clutter
  if (HUD_CONFIG.autoHideEmptyBlocks) {
    if (metrics.taskCount === 0) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'tasks'));
    }
    if (metrics.subagents.length === 0) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'subagents'));
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
  }

  // Clean up any rows that became entirely empty
  activeLayout = activeLayout.filter(row => row.length > 0);

  // 3. Matrix Builder
  let finalLines: string[] = [];
  
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

  // 4. Bracket Injector
  for (let i = 0; i < finalLines.length; i++) {
    const isFirst = i === 0;
    const isLast = i === finalLines.length - 1;
    let bracket = '├─';
    if (isFirst) bracket = '┌─';
    if (isLast) bracket = '└─';
    
    finalLines[i] = `${bracket} ${finalLines[i]}`;
  }

  return finalLines.join('\n');
}

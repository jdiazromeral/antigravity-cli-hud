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
// Available blocks: 'state', 'model', 'sandbox', 'permissions', 'workspace', 'ctx', '5h', 'weekly', 'tasks', 'subagents'
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
      ['state', 'model', 'permissions'],
      ['workspace', 'sandbox', 'ctx', '5h', 'weekly'],
      ['tasks', 'subagents']
    ],
    medium: [
      ['state', 'model', 'permissions'],
      ['workspace', 'sandbox'],
      ['ctx', '5h', 'weekly'],
      ['tasks', 'subagents']
    ],
    small: [
      ['state', 'model', 'permissions'],
      ['sandbox'],
      ['workspace', 'ctx'],
      ['5h', 'weekly'],
      ['tasks', 'subagents']
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

  const blocks: Record<string, string> = {
    state: stateIndicator,
    model: `🤖 ${colors.bold}${metrics.model}${colors.reset}`,
    sandbox: metrics.isSandboxed ? `${colors.gray}🔒 Sandboxed${colors.reset}` : `${colors.yellow}🔓 Unsandboxed${colors.reset}`,
    permissions: metrics.skipPermissions ? `${colors.red}☢️  Danger Mode${colors.reset}` : '',
    workspace: `📂 ${colors.blue}${metrics.workspace}${colors.reset}`,
    ctx: `🎧 Ctx: ${ctxColor}${metrics.contextUsage}%${colors.reset} (${Math.round(metrics.totalInputTokens/1000)}k)${exceedWarning}`,
    '5h': `🕒 5h: ${q5Color}${metrics.quota5h}%${colors.reset} (${formatTime(metrics.quota5hResetSeconds)})`,
    weekly: `🕒 Weekly: ${qWColor}${metrics.quotaWeekly}%${colors.reset} (${formatTime(metrics.quotaWeeklyResetSeconds)})`,
    tasks: `⚙️  Active Tasks: ${taskColor}${metrics.taskCount}${colors.reset}`,
    version: `📦 v${metrics.version}`,
    email: `📧 ${colors.dim}${metrics.email}${colors.reset}`,
    plan: `💎 ${metrics.planTier}`
  };

  // Pre-calculate subagent chunks
  let chunkedSubagents: string[][] = [];
  if (metrics.subagents.length === 0) {
    chunkedSubagents.push([]);
  } else {
    const subStrs = metrics.subagents.map(s => {
      const c = s.status === 'completed' ? colors.green : (s.status === 'error' ? colors.red : colors.yellow);
      let shortRole = s.role;
      if (shortRole.length > 25) shortRole = shortRole.substring(0, 22) + '...';
      return `${s.name} [${c}${s.status}${colors.reset}] (${shortRole})`;
    });

    const maxSubagentsToShow = 3;
    const displaySubagents = subStrs.slice(0, maxSubagentsToShow);
    const hiddenCount = subStrs.length - maxSubagentsToShow;

    for (let i = 0; i < displaySubagents.length; i++) {
      chunkedSubagents.push([displaySubagents[i]]);
    }
    if (hiddenCount > 0) {
      chunkedSubagents.push([`...and ${hiddenCount} more hidden`]);
    }
  }

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
  }

  // Clean up any rows that became entirely empty
  activeLayout = activeLayout.filter(row => row.length > 0);

  // 3. Matrix Builder
  let finalLines: string[] = [];
  
  for (let rowIndex = 0; rowIndex < activeLayout.length; rowIndex++) {
    const rowKeys = activeLayout[rowIndex];
    
    const subIdx = rowKeys.indexOf('subagents');
    if (subIdx !== -1) {
      const beforeSub = rowKeys.slice(0, subIdx).map(k => blocks[k]).filter(Boolean);
      const afterSub = rowKeys.slice(subIdx + 1).map(k => blocks[k]).filter(Boolean);
      
      const beforeStr = beforeSub.length > 0 ? beforeSub.join('  |  ') + '  |  ' : '';
      const afterStr = afterSub.length > 0 ? '  |  ' + afterSub.join('  |  ') : '';

      // Calculate visual padding to align wrapped lines under the title
      const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '');
      const padLen = stripAnsi(beforeStr).length + 4; // indent 4 spaces relative to the title
      const padding = ' '.repeat(Math.max(0, padLen));

      for (let i = 0; i < chunkedSubagents.length; i++) {
        const subStr = chunkedSubagents[i].join('  •  ');
        
        let rowContent = '';
        if (i === 0) {
           if (metrics.subagents.length === 0) {
             rowContent = `${beforeStr}👥 Subagents (0)${afterStr}`;
             finalLines.push(rowContent);
           } else {
             rowContent = `${beforeStr}👥 Subagents:${afterStr}`;
             finalLines.push(rowContent);
             rowContent = `${padding}${colors.dim}${subStr}${colors.reset}`;
             finalLines.push(rowContent);
           }
        } else {
           rowContent = `${padding}${colors.dim}${subStr}${colors.reset}`;
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

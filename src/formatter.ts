import type { ParsedMetrics } from './parser.js';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

export interface HudThemeColors {
  reset: string;
  bold: string;
  dim: string;
  accent: string;
  green: string;
  yellow: string;
  blue: string;
  cyan: string;
  red: string;
  magenta: string;
  gray: string;
  text: string;
}

export const THEMES: Record<string, HudThemeColors> = {
  'default': {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    accent: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    gray: '\x1b[90m',
    text: '\x1b[37m'
  },
  'catppuccin': {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    accent: '\x1b[38;2;137;180;250m', // Blue #89b4fa
    green: '\x1b[38;2;166;227;161m',  // Green #a6e3a1
    yellow: '\x1b[38;2;249;226;175m', // Yellow #f9e2af
    blue: '\x1b[38;2;137;180;250m',   // Blue #89b4fa
    cyan: '\x1b[38;2;148;226;213m',   // Teal #94e2d5
    red: '\x1b[38;2;243;139;168m',    // Red #f38ba8
    magenta: '\x1b[38;2;203;166;247m',// Mauve #cba6f7
    gray: '\x1b[38;2;108;112;134m',   // Overlay0 #6c7086
    text: '\x1b[38;2;205;214;244m'    // Text #cdd6f4
  },
  'tokyo-night': {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    accent: '\x1b[38;2;122;162;247m', // #7aa2f7
    green: '\x1b[38;2;158;206;106m',  // #9ece6a
    yellow: '\x1b[38;2;224;175;104m', // #e0af68
    blue: '\x1b[38;2;122;162;247m',   // #7aa2f7
    cyan: '\x1b[38;2;125;207;255m',   // #7dcfff
    red: '\x1b[38;2;247;118;142m',    // #f7768e
    magenta: '\x1b[38;2;187;154;247m',// #bb9af7
    gray: '\x1b[38;2;86;95;137m',     // #565f89
    text: '\x1b[38;2;192;202;245m'    // #c0caf5
  },
  'dracula': {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    accent: '\x1b[38;2;189;147;249m', // Purple #bd93f9
    green: '\x1b[38;2;80;250;123m',   // Green #50fa7b
    yellow: '\x1b[38;2;241;250;140m', // Yellow #f1fa8c
    blue: '\x1b[38;2;98;114;164m',    // Blue #6272a4
    cyan: '\x1b[38;2;139;233;253m',   // Cyan #8be9fd
    red: '\x1b[38;2;255;85;85m',      // Red #ff5555
    magenta: '\x1b[38;2;255;121;198m',// Pink #ff79c6
    gray: '\x1b[38;2;98;114;164m',    // Comment #6272a4
    text: '\x1b[38;2;248;248;242m'    // Foreground #f8f8f2
  },
  'nord': {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    accent: '\x1b[38;2;136;192;208m', // Frost #88c0d0
    green: '\x1b[38;2;163;190;140m',  // Aurora green #a3be8c
    yellow: '\x1b[38;2;235;203;139m', // Aurora yellow #ebcb8b
    blue: '\x1b[38;2;129;161;193m',   // Frost blue #81a1c1
    cyan: '\x1b[38;2;143;188;187m',   // Frost teal #8fbcbb
    red: '\x1b[38;2;191;97;106m',     // Aurora red #bf616a
    magenta: '\x1b[38;2;180;142;173m',// Aurora purple #b48ead
    gray: '\x1b[38;2;76;86;106m',     // Polar night #4c566a
    text: '\x1b[38;2;236;239;244m'    // Snow storm #eceff4
  },
  'solarized': {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    accent: '\x1b[38;2;38;139;210m',  // Blue #268bd2
    green: '\x1b[38;2;133;153;0m',    // Green #859900
    yellow: '\x1b[38;2;181;137;0m',   // Yellow #b58900
    blue: '\x1b[38;2;38;139;210m',    // Blue #268bd2
    cyan: '\x1b[38;2;42;161;152m',    // Cyan #2aa198
    red: '\x1b[38;2;220;50;47m',      // Red #dc322f
    magenta: '\x1b[38;2;211;54;130m', // Magenta #d33682
    gray: '\x1b[38;2;101;123;131m',   // Base00 #657b83
    text: '\x1b[38;2;131;148;150m'    // Base0 #839496
  },
  'monochrome': {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    accent: '\x1b[1m',
    green: '\x1b[37m',
    yellow: '\x1b[37m',
    blue: '\x1b[37m',
    cyan: '\x1b[37m',
    red: '\x1b[1m\x1b[37m',
    magenta: '\x1b[37m',
    gray: '\x1b[90m',
    text: '\x1b[37m'
  }
};

export interface HudStyleConfig {
  accentBar: string;
  guideLine: string;
  divider: string;
  bullet: string;
}

export const STYLES: Record<string, HudStyleConfig> = {
  'modern': {
    accentBar: '▌',
    guideLine: '│',
    divider: '  |  ',
    bullet: '  •  '
  },
  'powerline': {
    accentBar: '',
    guideLine: '│',
    divider: '  ',
    bullet: '  '
  },
  'bubble': {
    accentBar: '█',
    guideLine: '│',
    divider: '   ',
    bullet: ' • '
  },
  'minimal': {
    accentBar: ' ',
    guideLine: ' ',
    divider: '   ',
    bullet: ' • '
  }
};

export const SKILL_ICONS: Record<string, string> = {
  'hud-config': '🎛️',
  'rules': '📜',
  'looper': '🔄',
  'tdd': '🧪',
  'mapper': '🗺️',
  'retro': '🔍',
  'epic-planner': '📐',
  'epic-runner': '🏃',
  'explore': '🔭',
  'init': '🚀',
  'address-review': '💬',
  'status': '📊',
  'code-review': '🧐',
  'codebase-design': '🏗️',
  'diagnosing-bugs': '🩺',
  'domain-modeling': '🏛️',
  'grilling': '🔥',
  'melon': '🍉',
  'prototype': '🛠️',
  'research': '📚',
  'wizard': '🧙',
  'writing-for-agents': '✍️',
  'agy-customizations': '⚙️',
  'antigravity-guide': '🪐',
  'migrate-to-shoehorn': '👞',
  'setup-pre-commit': '🪝',
  'git-guardrails-claude-code': '🛡️',
  'scaffold-exercises': '📋',
  'resolving-merge-conflicts': '⚔️'
};

export function formatCostAmount(amount: number): string {
  if (amount <= 0) return '$0.00';
  if (amount < 0.01) {
    return `$${amount.toFixed(4)}`;
  }
  if (amount < 10) {
    return `$${amount.toFixed(3)}`;
  }
  return `$${amount.toFixed(2)}`;
}

export function stripAnsi(str: string): string {
  return str
    .replace(/\x1b\]8;;[^\x1b]*\x1b\\/g, '') // Strip OSC 8 opening URL tags
    .replace(/\x1b\]8;;\x1b\\/g, '')         // Strip OSC 8 closing delimiters
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');  // Strip standard ANSI SGR codes
}

export function formatOsc8Link(filePath: string, displayText: string, enabled: boolean = true): string {
  if (!enabled || !filePath) return displayText;
  let fileUrl = filePath;
  if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://') && !fileUrl.startsWith('file://')) {
    const normalized = path.resolve(filePath).replace(/\\/g, '/');
    const encodedPath = normalized.split('/').map(encodeURIComponent).join('/');
    fileUrl = `file://${encodedPath}`;
  } else if (fileUrl.startsWith('file://')) {
    const pathPart = fileUrl.slice(7);
    const encodedPath = pathPart.split('/').map(encodeURIComponent).join('/');
    fileUrl = `file://${encodedPath}`;
  }
  return `\x1b]8;;${fileUrl}\x1b\\${displayText}\x1b]8;;\x1b\\`;
}

// ============================================================================
// HUD LAYOUT CONFIGURATION
// Default layout matrix and budget ceilings.
// Custom overrides can be placed in ~/.gemini/hud_config.json
// Available blocks: 'state', 'mode', 'effort', 'model', 'sandbox', 'permissions', 'workspace', 'git', 'artifacts', 'ctx', '5h', 'weekly', 'cost', 'tasks', 'subagents', 'tool', 'transcript', 'mcp', 'rules', 'plugins', 'session_time'
// ============================================================================
export interface CustomBlockConfig {
  title?: string;
  command: string;
  intervalMs?: number;
}

export interface HudBudgetConfig {
  maxSteps?: number;
  maxContextTokens?: number;
}

export interface HudBreakpointsConfig {
  large: number;
  medium: number;
  small: number;
}

export interface HudLayoutsConfig {
  large: string[][];
  medium: string[][];
  small: string[][];
}

export interface HudExperimentalVoiceConfig {
  enabled?: boolean;
  showKeybinding?: boolean;
  checkMicServe?: boolean;
  port?: number;
}

export interface HudExperimentalConfig {
  voice?: HudExperimentalVoiceConfig;
}

export interface HudConfig {
  theme?: string;
  style?: string;
  clickableLinks?: boolean;
  autoHideEmptyBlocks?: boolean;
  budget?: HudBudgetConfig;
  breakpoints?: HudBreakpointsConfig;
  layouts?: HudLayoutsConfig;
  customBlocks?: Record<string, CustomBlockConfig>;
  experimental?: HudExperimentalConfig;
}

export const DEFAULT_HUD_CONFIG: {
  theme: string;
  style: string;
  clickableLinks: boolean;
  autoHideEmptyBlocks: boolean;
  budget: { maxSteps: number; maxContextTokens?: number };
  breakpoints: { large: number; medium: number; small: number };
  layouts: { large: string[][]; medium: string[][]; small: string[][] };
  customBlocks?: Record<string, CustomBlockConfig>;
  experimental?: HudExperimentalConfig;
} = {
  theme: 'default',
  style: 'modern',
  clickableLinks: true,
  // Whether to dynamically hide empty blocks from the UI when inactive
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
      ['state', 'mode', 'voice', 'model', 'effort', 'skill', 'version', 'plan', 'permissions'],
      ['workspace', 'sandbox', 'cache', 'ctx'],
      ['steps', 'cost', '5h', 'weekly'],
      ['tasks', 'subagents', 'tool'],
      ['artifacts'],
      ['looper'],
      ['git'],
      ['transcript']
    ],
    medium: [
      ['state', 'mode', 'voice', 'model', 'effort', 'skill', 'permissions'],
      ['workspace', 'sandbox', 'cache', 'ctx'],
      ['steps', 'cost', '5h', 'weekly'],
      ['tasks', 'subagents', 'tool'],
      ['artifacts'],
      ['looper'],
      ['git'],
      ['transcript']
    ],
    small: [
      ['state', 'mode', 'voice', 'model', 'effort', 'skill', 'permissions'],
      ['workspace', 'sandbox'],
      ['cache', 'ctx'],
      ['steps', 'cost', '5h', 'weekly'],
      ['tasks', 'subagents', 'tool'],
      ['artifacts'],
      ['looper'],
      ['git'],
      ['transcript']
    ]
  },
  customBlocks: {}
};

export const HUD_CONFIG = DEFAULT_HUD_CONFIG;

export function loadHudConfig(customPath?: string): typeof DEFAULT_HUD_CONFIG {
  const configPath = customPath || path.join(os.homedir(), '.gemini', 'hud_config.json');
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const userConfig = JSON.parse(raw);
      const userCustomBlocks: Record<string, CustomBlockConfig> = { ...(userConfig.customBlocks || {}) };
      for (const [k, v] of Object.entries(userConfig)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && typeof (v as any).command === 'string' && k !== 'customBlocks' && k !== 'budget' && k !== 'breakpoints' && k !== 'layouts' && k !== 'theme' && k !== 'style' && k !== 'clickableLinks') {
          userCustomBlocks[k] = v as CustomBlockConfig;
        }
      }
      return {
        ...DEFAULT_HUD_CONFIG,
        ...userConfig,
        theme: userConfig.theme || DEFAULT_HUD_CONFIG.theme,
        style: userConfig.style || DEFAULT_HUD_CONFIG.style,
        clickableLinks: userConfig.clickableLinks !== undefined ? !!userConfig.clickableLinks : DEFAULT_HUD_CONFIG.clickableLinks,
        budget: {
          ...DEFAULT_HUD_CONFIG.budget,
          ...(userConfig.budget || {})
        },
        breakpoints: {
          ...DEFAULT_HUD_CONFIG.breakpoints,
          ...(userConfig.breakpoints || {})
        },
        layouts: {
          large: userConfig.layouts?.large || DEFAULT_HUD_CONFIG.layouts.large.map(r => [...r]),
          medium: userConfig.layouts?.medium || DEFAULT_HUD_CONFIG.layouts.medium.map(r => [...r]),
          small: userConfig.layouts?.small || DEFAULT_HUD_CONFIG.layouts.small.map(r => [...r]),
        },
        customBlocks: userCustomBlocks
      };
    }
  } catch {
    // Fall back to default config if file cannot be read or parsed
  }

  return {
    ...DEFAULT_HUD_CONFIG,
    budget: { ...DEFAULT_HUD_CONFIG.budget },
    breakpoints: { ...DEFAULT_HUD_CONFIG.breakpoints },
    layouts: {
      large: DEFAULT_HUD_CONFIG.layouts.large.map(r => [...r]),
      medium: DEFAULT_HUD_CONFIG.layouts.medium.map(r => [...r]),
      small: DEFAULT_HUD_CONFIG.layouts.small.map(r => [...r]),
    },
    customBlocks: {}
  };
}

export function formatMetrics(metrics: ParsedMetrics, width: number = 80, configOverride?: HudConfig): string {
  const termWidth = metrics.terminalWidth || width || 80;
  const hudConfig = configOverride ? {
    ...DEFAULT_HUD_CONFIG,
    ...configOverride,
    theme: configOverride.theme || DEFAULT_HUD_CONFIG.theme,
    style: configOverride.style || DEFAULT_HUD_CONFIG.style,
    clickableLinks: configOverride.clickableLinks !== undefined ? !!configOverride.clickableLinks : DEFAULT_HUD_CONFIG.clickableLinks,
    budget: {
      ...DEFAULT_HUD_CONFIG.budget,
      ...(configOverride.budget || {})
    },
    breakpoints: {
      ...DEFAULT_HUD_CONFIG.breakpoints,
      ...(configOverride.breakpoints || {})
    },
    layouts: {
      large: configOverride.layouts?.large || DEFAULT_HUD_CONFIG.layouts.large.map(r => [...r]),
      medium: configOverride.layouts?.medium || DEFAULT_HUD_CONFIG.layouts.medium.map(r => [...r]),
      small: configOverride.layouts?.small || DEFAULT_HUD_CONFIG.layouts.small.map(r => [...r]),
    },
    customBlocks: {
      ...(DEFAULT_HUD_CONFIG.customBlocks || {}),
      ...(configOverride.customBlocks || {})
    }
  } : loadHudConfig();

  const defaultTheme = THEMES['default']!;
  const defaultStyle = STYLES['modern']!;
  const colors: HudThemeColors = (hudConfig.theme && THEMES[hudConfig.theme]) ? THEMES[hudConfig.theme]! : defaultTheme;
  const styleConfig: HudStyleConfig = (hudConfig.style && STYLES[hudConfig.style]) ? STYLES[hudConfig.style]! : defaultStyle;
  const clickableLinks = hudConfig.clickableLinks !== false && metrics.clickableLinks !== false;

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

  // Format quota and elapsed values
  const formatTime = (sec: number) => {
    if (sec <= 0) return '00:00';
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const formatElapsed = (sec: number) => {
    if (sec <= 0) return '0s';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
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
    const names = metrics.activeSkills.map(s => {
      const baseName = s.split(':').pop()?.toLowerCase() || '';
      const icon = SKILL_ICONS[s.toLowerCase()] || SKILL_ICONS[baseName] || '';
      const iconPrefix = icon ? `${icon} ` : '';
      return `${iconPrefix}${colors.cyan}${s}${colors.reset}`;
    }).join(' & ');
    skillBlockStr = `${label} ${names}`;
  }

  const envMaxSteps = process.env.AGY_MAX_STEPS ? parseInt(process.env.AGY_MAX_STEPS, 10) : undefined;
  const maxSteps = (envMaxSteps && !isNaN(envMaxSteps)) ? envMaxSteps : (metrics.maxSteps || hudConfig.budget?.maxSteps || 20);
  const stepCount = metrics.stepCount || 0;
  const stepPct = Math.round((stepCount / maxSteps) * 100);
  const stepColor = getThresholdColor(stepPct);
  const stepBar = renderMicroBar(stepPct, stepColor, 5);
  const stepStr = `👟 Steps: ${stepBar} ${stepColor}${stepCount}/${maxSteps}${colors.reset}`;

  const envMaxTokens = process.env.AGY_MAX_CONTEXT_TOKENS ? parseInt(process.env.AGY_MAX_CONTEXT_TOKENS, 10) : undefined;
  const configMaxTokens = hudConfig.budget?.maxContextTokens;
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
    git: (metrics.gitBranches && metrics.gitBranches.length > 0 && metrics.gitBranches[0]) ? `🌱 ${colors.cyan}${metrics.gitBranches[0].branch}${colors.reset}` : '',
    artifacts: metrics.artifactCount > 0 ? `📄 Artifacts: ${colors.yellow}${metrics.artifactCount}${colors.reset}` : '',
    ctx: `🎧 Ctx: ${ctxBar} ${ctxColor}${softPct}%${colors.reset} (${ratioStr})${exceedWarning}`,
    cache: metrics.cacheTokens > 0 ? `⚡ Cache: ${colors.cyan}${formatTokenCount(metrics.cacheTokens)}${colors.reset}` : '',
    '5h': `🕒 5h: ${q5Bar} ${q5Color}${metrics.quota5h}%${colors.reset} (${formatTime(metrics.quota5hResetSeconds)})`,
    weekly: `🕒 Weekly: ${qWBar} ${qWColor}${metrics.quotaWeekly}%${colors.reset} (${formatTime(metrics.quotaWeeklyResetSeconds)})`,
    credits: metrics.credits !== undefined ? `\uF155 AI Credits: ${colors.yellow}${metrics.credits}${colors.reset}` : '',
    apiKey: metrics.isApiKey ? `${colors.yellow}🔑 [API Key]${colors.reset}` : '',
    cost: (() => {
      if (!metrics.cost || metrics.cost.totalUsd === undefined) return '';
      const total = metrics.cost.totalUsd;
      if (total <= 0 && (!metrics.cost.subagentUsd || metrics.cost.subagentUsd <= 0)) {
        return '';
      }
      const estPrefix = metrics.cost.estimated ? '~' : '';
      const formattedTotal = formatCostAmount(total);
      let subPart = '';
      if (metrics.cost.subagentUsd !== undefined && metrics.cost.subagentUsd > 0) {
        subPart = ` ${colors.dim}(sub: ${formatCostAmount(metrics.cost.subagentUsd)})${colors.reset}`;
      }
      return `💲 Cost: ${colors.yellow}${estPrefix}${formattedTotal}${colors.reset}${subPart}`;
    })(),
    voice: (() => {
      const expVoice = hudConfig.experimental?.voice;
      const isVoiceConfigured = expVoice?.enabled;
      if (!metrics.voice && !isVoiceConfigured) return '';

      const v = metrics.voice;
      if (v?.isRecording || v?.status === 'recording') {
        return `${colors.red}${colors.bold}🔴 🎙️ REC${colors.reset}`;
      }
      if (v?.status === 'serving') {
        const addr = v.addr || '127.0.0.1:4713';
        const port = addr.includes(':') ? addr.split(':').pop() : addr;
        return `🎙️ ${colors.cyan}Mic: ${port}${colors.reset}`;
      }
      if (v?.status === 'limit') {
        return `${colors.yellow}⚠️ 🎙️ Limit${colors.reset}`;
      }
      if (v?.status === 'disabled') {
        return '';
      }

      const keyHint = v?.keybinding || (expVoice?.showKeybinding !== false ? 'F5' : '');
      const keyStr = keyHint ? ` [${keyHint}]` : '';
      return `🎙️ Voice: ${colors.green}Ready${colors.reset}${colors.dim}${keyStr}${colors.reset}`;
    })(),
    tasks: `⚙️  Active Tasks: ${taskColor}${metrics.taskCount}${colors.reset}`,
    tool: (() => {
      if (!metrics.activeTool) return '';
      const isNarrow = termWidth <= 75;
      const toolName = metrics.activeTool.name;
      let summary = metrics.activeTool.summary;
      if (summary) {
        const maxSummaryLen = isNarrow ? 30 : 60;
        if (summary.length > maxSummaryLen) {
          summary = summary.substring(0, maxSummaryLen - 3) + '...';
        }
      }
      const summaryPart = summary ? ` (${summary})` : '';
      let statusBadge = '';
      if (metrics.activeTool.status) {
        const st = metrics.activeTool.status.toLowerCase();
        if (st === 'failed' || st === 'error') {
          statusBadge = ` ${colors.red}[${metrics.activeTool.status}]${colors.reset}${colors.cyan}`;
        } else if (st === 'killed' || st === 'cancelled' || st === 'canceling') {
          statusBadge = ` ${colors.yellow}[${metrics.activeTool.status}]${colors.reset}${colors.cyan}`;
        }
      }
      const durationPart = (metrics.toolElapsedSeconds !== undefined && metrics.toolElapsedSeconds > 0)
        ? ` [⏱️ ${metrics.toolElapsedSeconds}s]`
        : '';
      return `🛠️  ${colors.cyan}${toolName}${statusBadge}${summaryPart}${durationPart}${colors.reset}`;
    })(),
    mcp: (() => {
      if (!metrics.mcpServers || metrics.mcpServers.length === 0) return '';
      const configPath = metrics.mcpConfigPath || path.join(os.homedir(), '.gemini', 'config', 'mcp_config.json');
      const countLabel = `${metrics.mcpServers.length} active`;
      const linked = formatOsc8Link(configPath, countLabel, clickableLinks);
      return `🔌 MCP: ${colors.cyan}${linked}${colors.reset}`;
    })(),
    rules: (() => {
      if (!metrics.activeRules || metrics.activeRules.length === 0) return '';
      const countLabel = `${metrics.activeRules.length} active`;
      return `📜 Rules: ${colors.cyan}${countLabel}${colors.reset}`;
    })(),
    plugins: (() => {
      if (!metrics.activePlugins || metrics.activePlugins.length === 0) return '';
      return `🧩 Plugins: ${colors.cyan}${metrics.activePlugins.join(', ')}${colors.reset}`;
    })(),
    session_time: (metrics.sessionElapsedSeconds !== undefined && metrics.sessionElapsedSeconds > 0)
      ? `⏱️ ${colors.cyan}${formatElapsed(metrics.sessionElapsedSeconds)}${colors.reset}`
      : '',
    version: `📦 v${metrics.version}`,
    email: `📧 ${colors.dim}${metrics.email}${colors.reset}`,
    plan: (metrics.isApiKey || (metrics.planTier && metrics.planTier.toLowerCase().includes('api')))
      ? `${colors.yellow}🔑 [API Key]${colors.reset}`
      : (metrics.planTier.startsWith('GE-') || metrics.planTier.includes('Enterprise') ? `🏢 ${metrics.planTier}` : `💎 ${metrics.planTier}`),
    transcript: metrics.transcriptPath ? `📜 ${formatOsc8Link(metrics.transcriptPath, `tail -f ${metrics.transcriptPath.replace(os.homedir(), '~')}`, clickableLinks)}` : ''
  };

  if (hudConfig.customBlocks) {
    for (const [key, blockConf] of Object.entries(hudConfig.customBlocks)) {
      let val = metrics.customBlocks?.[key];
      if (val === undefined) {
        const cacheFile = path.join(os.homedir(), '.gemini', `hud_custom_${key}.cache`);
        if (fs.existsSync(cacheFile)) {
          try {
            val = fs.readFileSync(cacheFile, 'utf8').trim();
          } catch (e) {}
        }
      }
      if (val) {
        const title = blockConf?.title;
        blocks[key] = title ? `${title}: ${colors.cyan}${val}${colors.reset}` : `${colors.cyan}${val}${colors.reset}`;
      } else {
        blocks[key] = '';
      }
    }
  }
  if (metrics.customBlocks) {
    for (const [key, val] of Object.entries(metrics.customBlocks)) {
      if (!blocks[key]) {
        if (val) {
          blocks[key] = `${colors.cyan}${val}${colors.reset}`;
        } else {
          blocks[key] = '';
        }
      }
    }
  }

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
    const costStr = (typeof s.totalUsd === 'number' && s.totalUsd > 0) ? ` ${colors.dim}[${formatCostAmount(s.totalUsd)}]${colors.reset}` : '';
    return `${prefix}${s.name}${idStr} [${statusColor}${statusLabel}${colors.reset}] (${shortRole})${costStr}`;
  });
  const chunkedSubagents = calculateStackedChunks(subStrs, 3);

  const gitStrs = (metrics.gitBranches || []).map(g => {
    let statsStr = '';
    if (metrics.gitStats) {
      const parts: string[] = [];
      if (metrics.gitStats.added > 0 || metrics.gitStats.deleted > 0 || metrics.gitStats.filesModified > 0) {
        parts.push(`+${metrics.gitStats.added}/-${metrics.gitStats.deleted}, ${metrics.gitStats.filesModified} files`);
      }
      if (metrics.gitStats.ahead > 0 || metrics.gitStats.behind > 0) {
        parts.push(`↑${metrics.gitStats.ahead} ↓${metrics.gitStats.behind}`);
      }
      if (parts.length > 0) {
        statsStr = ` (${parts.join(' ')})`;
      }
    }
    const resolvedPath = g.path || (metrics.workspace && path.isAbsolute(metrics.workspace) ? metrics.workspace : undefined);
    const linkedName = (clickableLinks && resolvedPath && fs.existsSync(resolvedPath))
      ? formatOsc8Link(resolvedPath, g.name, true)
      : g.name;
    return `${linkedName} (${colors.cyan}${g.branch}${colors.reset})${statsStr}`;
  });
  const chunkedGit = calculateStackedChunks(gitStrs, 5);
  
  const artStrs = (metrics.artifacts || []).map(a => {
    let aPath = a;
    if (metrics.conversationId) {
      aPath = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain', metrics.conversationId, a);
    }
    const linked = formatOsc8Link(aPath, a, clickableLinks);
    return `${colors.yellow}${linked}${colors.reset}`;
  });
  const chunkedArtifacts = calculateStackedChunks(artStrs, 5);

  const looperStrs: string[] = [];
  const processedMissions = new Set<typeof metrics.looperMissions extends (infer U)[] | undefined ? U : never>();

  if (metrics.looperEpics) {
    for (const e of metrics.looperEpics) {
      const pColor = e.done === e.total ? colors.green : colors.yellow;
      const epicPct = e.total > 0 ? Math.round((e.done / e.total) * 100) : 0;
      const epicBar = renderMicroBar(epicPct, pColor, 5);
      const epicHeader = e.repo === e.epic
        ? `🎯 Epic: ${colors.bold}${e.epic}${colors.reset}`
        : `🎯 [${e.repo}] ${colors.bold}${e.epic}${colors.reset}`;
      looperStrs.push(`${epicHeader} ${epicBar} [${pColor}${e.done}/${e.total} DONE${colors.reset}]`);

      // Nest matching active missions under this epic
      const matchingMissions = (metrics.looperMissions || []).filter(m => m.epic === e.epic);
      for (const m of matchingMissions) {
        processedMissions.add(m);
        const statusColor = m.status === 'IN_PROGRESS' ? colors.cyan : (m.status === 'FAILED' || m.status === 'BLOCKED' ? colors.red : colors.green);
        
        let suffix = '';
        if (m.iteration && m.maxIterations && (m.status === 'IN_PROGRESS' || m.status === 'PENDING')) {
          suffix = ` Iteration ${m.iteration}/${m.maxIterations}`;
        } else if (m.reason && (m.status === 'FAILED' || m.status === 'BLOCKED')) {
          suffix = ` - ${m.reason}`;
        }

        looperStrs.push(`   ↳ [${m.mission}] [${statusColor}${m.status}${suffix}${colors.reset}]`);
      }
    }
  }

  for (const m of (metrics.looperMissions || [])) {
    if (!processedMissions.has(m)) {
      const statusColor = m.status === 'IN_PROGRESS' ? colors.cyan : (m.status === 'FAILED' || m.status === 'BLOCKED' ? colors.red : colors.green);
      
      let suffix = '';
      if (m.iteration && m.maxIterations && (m.status === 'IN_PROGRESS' || m.status === 'PENDING')) {
        suffix = ` Iteration ${m.iteration}/${m.maxIterations}`;
      } else if (m.reason && (m.status === 'FAILED' || m.status === 'BLOCKED')) {
        suffix = ` - ${m.reason}`;
      }
      
      let prefix = '';
      if (m.repo && m.epic) {
        prefix = m.repo === m.epic ? `[${m.epic}] ` : `[${m.repo} ➔ ${m.epic}] `;
      } else if (m.epic) {
        prefix = `[${m.epic}] `;
      } else if (m.repo) {
        prefix = `[${m.repo}] `;
      }
      
      looperStrs.push(`• ${prefix}[${m.mission}] [${statusColor}${m.status}${suffix}${colors.reset}]`);
    }
  }
  const chunkedLooper = calculateStackedChunks(looperStrs, 5);

  // 2. Responsive Router
  let activeLayout: string[][] = [];
  if (termWidth >= hudConfig.breakpoints.large) activeLayout = hudConfig.layouts.large;
  else if (termWidth >= hudConfig.breakpoints.medium) activeLayout = hudConfig.layouts.medium;
  else activeLayout = hudConfig.layouts.small;

  // Clone to avoid mutating the configuration
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

  // Handle API Key mode omitting quotas and rendering [API Key] badge
  if (metrics.isApiKey) {
    const layoutHasPlan = activeLayout.some(row => row.includes('plan'));
    activeLayout = activeLayout.map(row => {
      const newRow: string[] = [];
      for (const k of row) {
        if (k === '5h') {
          if (!layoutHasPlan) {
            newRow.push('apiKey');
          }
        } else if (k === 'weekly') {
          // Hide weekly when in API Key mode
        } else {
          newRow.push(k);
        }
      }
      return newRow;
    });
  }

  // Dynamic Culling: Hide empty blocks when they are inactive to prevent clutter
  if (hudConfig.autoHideEmptyBlocks) {
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
    if (!metrics.mcpServers || metrics.mcpServers.length === 0) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'mcp'));
    }
    if (!metrics.activeRules || metrics.activeRules.length === 0) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'rules'));
    }
    if (!metrics.activePlugins || metrics.activePlugins.length === 0) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'plugins'));
    }
    if (metrics.sessionElapsedSeconds === undefined || metrics.sessionElapsedSeconds <= 0) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'session_time'));
    }
    if (!metrics.isApiKey) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'apiKey'));
    }
    if (!metrics.cost || (metrics.cost.totalUsd <= 0 && (!metrics.cost.subagentUsd || metrics.cost.subagentUsd <= 0))) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'cost'));
    }
    if (!blocks['voice']) {
      activeLayout = activeLayout.map(row => row.filter(k => k !== 'voice'));
    }
    if (hudConfig.customBlocks) {
      for (const customKey of Object.keys(hudConfig.customBlocks)) {
        if (!blocks[customKey]) {
          activeLayout = activeLayout.map(row => row.filter(k => k !== customKey));
        }
      }
    }
    if (metrics.customBlocks) {
      for (const customKey of Object.keys(metrics.customBlocks)) {
        if (!blocks[customKey]) {
          activeLayout = activeLayout.map(row => row.filter(k => k !== customKey));
        }
      }
    }
    activeLayout = activeLayout.map(row => row.filter(k => {
      if (k.startsWith('custom_') || (hudConfig.customBlocks && hudConfig.customBlocks[k])) {
        return !!blocks[k];
      }
      return true;
    }));
  }

  // Clean up any rows that became entirely empty
  activeLayout = activeLayout.filter(row => row.length > 0);

  // 3. Matrix Builder
  const finalLines: string[] = [];
  
  for (const rowKeys of activeLayout) {
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
      
      const beforeStr = beforeStack.length > 0 ? beforeStack.join(styleConfig.divider) + styleConfig.divider : '';
      const afterStr = afterStack.length > 0 ? styleConfig.divider + afterStack.join(styleConfig.divider) : '';

      // Calculate visual padding to align wrapped lines under the title using hardened stripAnsi
      const padLen = stripAnsi(beforeStr).length + 4; // indent 4 spaces relative to the title
      const padding = ' '.repeat(Math.max(0, padLen));

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk) continue;
        const stackItemStr = chunk.join(styleConfig.bullet);
        
        let rowContent = '';
        if (i === 0) {
           const firstChunk = chunks[0];
           if (!firstChunk || firstChunk.length === 0 || !firstChunk[0]) {
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
      finalLines.push(renderedItems.join(styleConfig.divider));
    }
  }

  // 4. Accent Bar & Vertical Guide Injector
  const accentColor = metrics.agentState === 'IDLE' ? colors.green : (metrics.agentState === 'WAITING' ? colors.yellow : colors.cyan);

  for (let i = 0; i < finalLines.length; i++) {
    const line = finalLines[i];
    if (line !== undefined) {
      if (i === 0) {
        finalLines[0] = `${accentColor}${styleConfig.accentBar}${colors.reset} ${line}`;
      } else {
        finalLines[i] = `${colors.dim}${styleConfig.guideLine}${colors.reset} ${line}`;
      }
    }
  }

  return finalLines.join('\n');
}

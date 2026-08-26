import { formatMetrics, type HudConfig } from '../src/formatter.js';
import type { ParsedMetrics } from '../src/parser.js';

// Parse CLI flags
const args = process.argv.slice(2);
let themeOverride: string | undefined = undefined;
let styleOverride: string | undefined = undefined;
let linksOverride: boolean | undefined = undefined;
let widthOverride: number | undefined = undefined;

for (const arg of args) {
  if (arg.startsWith('--theme=')) {
    themeOverride = arg.split('=')[1];
  } else if (arg.startsWith('--style=')) {
    styleOverride = arg.split('=')[1];
  } else if (arg.startsWith('--links=')) {
    linksOverride = arg.split('=')[1] === 'true';
  } else if (arg.startsWith('--width=')) {
    const val = arg.split('=')[1];
    if (val) widthOverride = parseInt(val, 10);
  }
}

const mockMetrics: ParsedMetrics = {
  agentState: 'WORKING',
  agentName: 'TARS',
  executionMode: 'plan',
  effort: 'high',
  activeSkills: ['looper', 'tdd', 'rules'],
  model: 'Gemini 3.6 Flash',
  isSandboxed: false,
  skipPermissions: false,
  workspace: 'acme-corp/work',
  stepCount: 14,
  maxSteps: 20,
  contextUsage: 72,
  totalInputTokens: 54000,
  maxContextTokens: 75000,
  cacheTokens: 120000,
  quotaType: 'Gemini',
  quotaWeekly: 85,
  quotaWeeklyResetSeconds: 86400 * 2,
  quota5h: 45,
  quota5hResetSeconds: 3600,
  cost: {
    totalUsd: 0.0423,
    subagentUsd: 0.0125,
    estimated: true
  },
  voice: {
    enabled: true,
    status: 'ready',
    keybinding: 'F5'
  },
  taskCount: 3,
  activeTool: {
    name: 'run_command',
    summary: 'npm test',
    status: 'running'
  },
  toolElapsedSeconds: 8,
  mcpServers: ['github', 'postgres', 'chrome'],
  mcpConfigPath: `${process.env.HOME || '/Users/user'}/.gemini/config/mcp_config.json`,
  activeRules: [
    { name: 'AGENTS.md', path: '/workspace/AGENTS.md', scope: 'project' },
    { name: 'GEMINI.md', path: '/workspace/GEMINI.md', scope: 'global' },
    { name: 'security.md', path: '/workspace/.agents/rules/security.md', scope: 'project' }
  ],
  activePlugins: ['hud', 'looper'],
  sessionElapsedSeconds: 862,
  subagents: [
    { name: 'orchestrator', role: 'Epic Runner', status: 'working', depth: 0, conversationId: 'abc12345' },
    { name: 'worker-1', role: 'Feature Dev', status: 'working', depth: 1, conversationId: 'def67890', totalUsd: 0.008 },
    { name: 'researcher', role: 'Context Finder', status: 'completed', depth: 2, conversationId: 'ghi11223' },
    { name: 'reviewer', role: 'Code Review', status: 'working', depth: 1, conversationId: 'jkl44556', totalUsd: 0.0045 }
  ],
  artifacts: [
    'v1.4_hud_implementation_plan.md',
    'walkthrough.md'
  ],
  artifactCount: 2,
  conversationId: 'ad266f1f-75f3-44dd-b073-c93a1bedc277',
  looperEpics: [
    { repo: 'acme-corp/work', epic: 'hud-v1.4.0', total: 4, done: 3 }
  ],
  looperMissions: [
    { repo: 'acme-corp/work', epic: 'hud-v1.4.0', mission: 'theming_engine', status: 'IN_PROGRESS', iteration: 2, maxIterations: 5 }
  ],
  gitBranches: [
    { name: 'acme-corp/work', branch: 'feat/hud-v1.4.0*' },
    { name: 'acme-corp/service-b', branch: 'main' }
  ],
  gitStats: { added: 42, deleted: 10, filesModified: 3, ahead: 1, behind: 0 },
  transcriptPath: `${process.env.HOME || '/Users/user'}/.gemini/antigravity-cli/brain/ad266f1f-75f3-44dd-b073-c93a1bedc277/.system_generated/logs/transcript.jsonl`,
  sessionName: 'ad266f1f-75f3-44dd-b073-c93a1bedc277',
  version: '1.5.0',
  email: 'developer@example.com',
  planTier: 'Pro',
  terminalWidth: widthOverride || process.stdout.columns || 140,
  exceeds200k: false
};

const configOverride: HudConfig = {};
if (themeOverride) configOverride.theme = themeOverride;
if (styleOverride) configOverride.style = styleOverride;
if (linksOverride !== undefined) configOverride.clickableLinks = linksOverride;

const out = formatMetrics(mockMetrics, mockMetrics.terminalWidth, configOverride);
console.log(out);


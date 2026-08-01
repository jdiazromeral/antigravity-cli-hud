import { formatMetrics, ParsedMetrics } from '../src/formatter.js';

const mockMetrics: ParsedMetrics = {
  agentState: 'WORKING',
  agentName: 'TARS',
  executionMode: 'plan',
  effort: 'high',
  activeSkills: ['looper', 'tdd', 'mapper'],
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
  taskCount: 3,
  activeTool: {
    name: 'run_command',
    summary: 'git status',
    status: 'running'
  },
  subagents: [
    { name: 'orchestrator', role: 'Epic Runner', status: 'working', depth: 0, conversationId: 'abc12345' },
    { name: 'worker-1', role: 'Feature Dev', status: 'working', depth: 1, conversationId: 'def67890' },
    { name: 'researcher', role: 'Context Finder', status: 'completed', depth: 2, conversationId: 'ghi11223' },
    { name: 'reviewer', role: 'Code Review', status: 'working', depth: 1, conversationId: 'jkl44556' }
  ],
  artifacts: [
    'architecture_review.md',
    'database_schema.md'
  ],
  artifactCount: 2,
  conversationId: 'ad266f1f-75f3-44dd-b073-c93a1bedc277',
  looperEpics: [
    { repo: 'acme-corp/work', epic: 'auth-v2', total: 5, done: 3 }
  ],
  looperMissions: [
    { repo: 'sample_faqs', epic: 'setup', mission: 'M1_setup', status: 'IN_PROGRESS', iteration: 2, maxIterations: 5 },
    { repo: 'auth-system', epic: 'auth', mission: 'epic_runner', status: 'DONE' }
  ],
  gitBranches: [
    { name: 'acme-corp/work', branch: 'feature/hud-nested-agents' },
    { name: 'acme-corp/service-b', branch: 'main' }
  ],
  transcriptPath: `${process.env.HOME || '/Users/user'}/.gemini/antigravity-cli/brain/ad266f1f-75f3-44dd-b073-c93a1bedc277/.system_generated/logs/transcript.jsonl`,
  sessionName: 'ad266f1f-75f3-44dd-b073-c93a1bedc277',
  version: '2.4.0',
  email: 'developer@example.com',
  planTier: 'Pro',
  terminalWidth: 140,
  exceeds200k: false
};

const out = formatMetrics(mockMetrics, process.stdout.columns || 140);
console.log(out);

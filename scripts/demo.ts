import { formatMetrics } from '../src/formatter.js';

const mockMetrics = {
  agentState: 'WORKING',
  executionMode: 'plan',
  effort: 'high',
  model: 'Gemini 3.1 Pro',
  isSandboxed: false,
  dangerMode: true,
  workspace: 'japan4/work',
  gitBranches: [
    { name: 'japan4/work', branch: 'feature/hud-nested-agents' },
    { name: 'japan4/some-other-repo', branch: 'main' }
  ],
  artifacts: [
    'architecture_review.md',
    'database_schema.md'
  ],
  artifactCount: 2,
  looperMissions: [
    { repo: 'sample_faqs', epic: 'setup', mission: 'M1_setup', status: 'IN_PROGRESS' },
    { repo: 'auth-system', epic: 'auth', mission: 'epic_runner', status: 'DONE' }
  ],
  contextUsage: 72,
  totalInputTokens: 144000,
  cacheTokens: 120000,
  quotaType: 'Gemini' as const,
  quotaWeekly: 85,
  quotaWeeklyResetSeconds: 86400 * 2,
  quota5h: 45,
  quota5hResetSeconds: 3600,
  taskCount: 3,
  subagents: [
    { name: 'orchestrator', role: 'Epic Runner', status: 'working', depth: 0 },
    { name: 'worker-1', role: 'Feature Dev', status: 'working', depth: 1 },
    { name: 'researcher', role: 'Context Finder', status: 'completed', depth: 2 },
    { name: 'reviewer', role: 'Code Review', status: 'working', depth: 1 }
  ],
  sessionName: 'a14a6901-62aa-4128-a082-e6adcd03c7c9',
  exceeds200k: false
};

const out = formatMetrics(mockMetrics as any, process.stdout.columns || 140);
console.log(out);

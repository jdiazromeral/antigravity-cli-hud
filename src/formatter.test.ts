import { describe, it, expect } from 'vitest';
import { formatMetrics } from './formatter';
import { ParsedMetrics } from './parser';
import * as os from 'os';

describe('formatMetrics', () => {
  const baseMetrics: ParsedMetrics = {
    agentState: 'WORKING',
    contextUsage: 12,
    totalInputTokens: 123000,
    cacheTokens: 0,
    exceeds200k: false,
    quotaWeekly: 21,
    quotaWeeklyResetSeconds: 551098,
    quota5h: 84,
    quota5hResetSeconds: 7319,
    quotaType: 'Gemini',
    subagents: [],
    taskCount: 1,
    sessionName: 'sess123',
    model: 'Gemini 3.1 Pro',
    workspace: 'work',
    isSandboxed: false,
    version: '1.0.8',
    email: 'test@example.com',
    planTier: 'Pro',
    terminalWidth: 184,
    skipPermissions: false,
    gitBranches: [],
    artifactCount: 0,
    artifacts: [],
    looperEpics: [],
    executionMode: 'request-review',
    effort: 'normal',
    agentName: 'Antigravity',
    activeSkills: [],
    stepCount: 0,
    maxSteps: 20,
    maxContextTokens: 0,
    contextWindowSize: 1048576,
    editorMode: undefined,
    credits: undefined
  };

  it('formats single and multiple active skills correctly', () => {
    const singleSkillMetrics = { ...baseMetrics, activeSkills: ['looper'] };
    const outSingle = formatMetrics(singleSkillMetrics);
    expect(outSingle).toContain('🧠 Skill:');
    expect(outSingle).toContain('looper');

    const multiSkillMetrics = { ...baseMetrics, activeSkills: ['looper', 'tdd', 'mapper'] };
    const outMulti = formatMetrics(multiSkillMetrics);
    expect(outMulti).toContain('🧠 Skills:');
    expect(outMulti).toContain('looper');
    expect(outMulti).toContain('tdd');
    expect(outMulti).toContain('mapper');
  });

  it('formats correctly with wide terminals', () => {
    const out = formatMetrics(baseMetrics);
    expect(out).toContain('WORKING');
    expect(out).toContain('Gemini 3.1 Pro');
    expect(out).toContain('Unsandboxed');
    expect(out).toContain('6d 9h'); // The weekly quota conversion
  });

  it('degrades gracefully on extremely narrow terminals', () => {
    const narrowMetrics = { ...baseMetrics, terminalWidth: 60 };
    const out = formatMetrics(narrowMetrics);
    // On width=60, Weekly Quota and Sandbox should be hidden
    expect(out).not.toContain('Weekly');
    expect(out).not.toContain('Unsandboxed');
    // But 5h quota should still be there
    expect(out).toContain('5h');
  });

  it('formats subagents in rows', () => {
    const metricsWithSubs = {
      ...baseMetrics,
      terminalWidth: 120, // Enough for 2 chunks
      subagents: [
        { name: 'sub1', role: 'Tester', status: 'completed', depth: 0 },
        { name: 'sub2', role: 'Runner', status: 'working', depth: 0 }
      ]
    };
    const out = formatMetrics(metricsWithSubs);
    expect(out).toContain('sub1');
    expect(out).toContain('sub2');
    expect(out).toContain('Subagents:');
  });

  it('formats nested subagents with indentation based on depth', () => {
    const metricsWithSubs = {
      ...baseMetrics,
      terminalWidth: 120,
      subagents: [
        { name: 'parent', role: 'Manager', status: 'working', depth: 0 },
        { name: 'child', role: 'Worker', status: 'working', depth: 1 },
        { name: 'grandchild', role: 'Helper', status: 'working', depth: 2 }
      ]
    };
    const out = formatMetrics(metricsWithSubs);
    expect(out).toContain('parent');
    expect(out).toContain('  ↳ child');
    expect(out).toContain('    ↳ grandchild');
  });

  it('formats deep subagent hierarchy nesting for depth 3 and 4', () => {
    const metricsWithSubs = {
      ...baseMetrics,
      terminalWidth: 120,
      subagents: [
        { name: 'greatgrandchild', role: 'SubHelper', status: 'working', depth: 3 },
        { name: 'leafagent', role: 'Leaf', status: 'completed', depth: 4 }
      ]
    };
    const out = formatMetrics(metricsWithSubs);
    expect(out).toContain('      ↳ greatgrandchild');
    expect(out).toContain('        ↳ leafagent');
  });

  it('uses responsive compact status badges and role truncation on narrow terminal widths', () => {
    const metricsWithSubs = {
      ...baseMetrics,
      terminalWidth: 60,
      subagents: [
        { name: 'agent1', role: 'VeryLongRoleNameThatExceedsLimit', status: 'completed', depth: 0 },
        { name: 'agent2', role: 'Worker', status: 'working', depth: 1 },
        { name: 'agent3', role: 'Reviewer', status: 'waiting_for_input', depth: 2 },
        { name: 'agent4', role: 'Tester', status: 'error', depth: 0 }
      ]
    };
    const out = formatMetrics(metricsWithSubs);
    expect(out).toContain('done');
    expect(out).toContain('run');
    expect(out).toContain('wait');
    // Note: agent4 is hidden in the 3-subagent stack preview (...and 1 more hidden)
    // Check role truncation at 15 chars (12 chars + '...')
    expect(out).toContain('(VeryLongRole...)');
  });

  it('formats compact error badge for subagents on narrow terminal', () => {
    const metricsWithSubs = {
      ...baseMetrics,
      terminalWidth: 60,
      subagents: [
        { name: 'errAgent', role: 'Tester', status: 'error', depth: 0 }
      ]
    };
    const out = formatMetrics(metricsWithSubs);
    expect(out).toContain('err');
  });


  it('turns ctx block red and adds degradation warning if exceeds200k is true', () => {
    const warningMetrics = { ...baseMetrics, exceeds200k: true };
    const out = formatMetrics(warningMetrics);
    expect(out).toContain('Agent may start degrading');
    expect(out).toContain('\x1b[31m'); // Red color
  });

  it('formats ctx with soft limit and max physical limit in fraction', () => {
    process.env.AGY_MAX_CONTEXT_TOKENS = '1048576';
    const ctxMetrics = { ...baseMetrics, totalInputTokens: 100000 };
    const out = formatMetrics(ctxMetrics);
    // 100k out of 200k soft limit = 50%
    expect(out).toContain('50%');
    expect(out).toContain('100k/200k soft • 1M max');
    delete process.env.AGY_MAX_CONTEXT_TOKENS;
  });

  it('supports custom soft limit via AGY_SOFT_CONTEXT_TOKENS env var', () => {
    process.env.AGY_MAX_CONTEXT_TOKENS = '1048576';
    process.env.AGY_SOFT_CONTEXT_TOKENS = '100000';
    const ctxMetrics = { ...baseMetrics, totalInputTokens: 50000 };
    const out = formatMetrics(ctxMetrics);
    expect(out).toContain('50%');
    expect(out).toContain('50k/100k soft • 1M max');
    delete process.env.AGY_MAX_CONTEXT_TOKENS;
    delete process.env.AGY_SOFT_CONTEXT_TOKENS;
  });

  it('formats ctx cleanly when limitTokens is smaller than soft limit (75k < 200k)', () => {
    process.env.AGY_MAX_CONTEXT_TOKENS = '75000';
    const ctxMetrics = { ...baseMetrics, totalInputTokens: 37500 };
    const out = formatMetrics(ctxMetrics);
    // 37.5k out of 75k max = 50%
    expect(out).toContain('50%');
    expect(out).toContain('38k/75k max');
    expect(out).not.toContain('soft');
    delete process.env.AGY_MAX_CONTEXT_TOKENS;
  });


  describe('executionMode formatting', () => {
    it('formats request-review mode with yellow circle', () => {
      const metrics = { ...baseMetrics, executionMode: 'request-review' };
      const out = formatMetrics(metrics);
      expect(out).toContain('🟡 request-review');
    });

    it('formats accept-edits mode with green circle', () => {
      const metrics = { ...baseMetrics, executionMode: 'accept-edits' };
      const out = formatMetrics(metrics);
      expect(out).toContain('🟢 accept-edits');
    });

    it('formats plan mode with blue circle', () => {
      const metrics = { ...baseMetrics, executionMode: 'plan' };
      const out = formatMetrics(metrics);
      expect(out).toContain('🔵 plan');
    });

    it('handles missing executionMode safely', () => {
      const metrics = { ...baseMetrics } as any;
      delete metrics.executionMode;
      expect(() => formatMetrics(metrics)).not.toThrow();
    });
  });

  describe('vim mode badge formatting', () => {
    it('renders normal mode badge with cyan icon', () => {
      const metrics = { ...baseMetrics, executionMode: 'plan', editorMode: 'N' };
      const out = formatMetrics(metrics);
      expect(out).toContain('🔵 plan');
      expect(out).toContain('');
      expect(out).not.toContain('[N]');
      expect(out).toContain('\x1b[36m'); // cyan
    });

    it('renders insert mode badge with yellow icon', () => {
      const metrics = { ...baseMetrics, executionMode: 'request-review', editorMode: 'I' };
      const out = formatMetrics(metrics);
      expect(out).toContain('');
      expect(out).not.toContain('[I]');
      expect(out).toContain('\x1b[33m'); // yellow
    });

    it('renders visual mode badge with blue icon', () => {
      const metrics = { ...baseMetrics, executionMode: 'accept-edits', editorMode: 'V' };
      const out = formatMetrics(metrics);
      expect(out).toContain('');
      expect(out).not.toContain('[V]');
      expect(out).toContain('\x1b[34m'); // blue
    });

    it('handles lowercase and missing editorMode gracefully', () => {
      const metricsLower = { ...baseMetrics, executionMode: 'plan', editorMode: 'i' };
      const outLower = formatMetrics(metricsLower);
      expect(outLower).toContain('');
      expect(outLower).not.toContain('[I]');

      const outMissing = formatMetrics(baseMetrics);
      expect(outMissing).not.toContain('');
      expect(outMissing).not.toContain('');
      expect(outMissing).not.toContain('');
    });
  });

  
  describe('transcript formatting', () => {
    it('formats transcript path with tail -f hint when present', () => {
      const metrics = { ...baseMetrics, transcriptPath: `${os.homedir()}/.gemini/antigravity-cli/transcript_123.txt` };
      const out = formatMetrics(metrics);
      expect(out).toContain('📜 tail -f ~/.gemini/antigravity-cli/transcript_123.txt');
    });

    it('does not display transcript block when missing', () => {
      const metrics = { ...baseMetrics };
      delete metrics.transcriptPath;
      const out = formatMetrics(metrics);
      expect(out).not.toContain('📜 tail -f');
    });
  });

  describe('effort formatting', () => {
    it('formats effort with Nerd Font icons and colors', () => {
      const metrics = { ...baseMetrics, effort: 'high' };
      const out = formatMetrics(metrics);
      expect(out).toContain('Effort');
      expect(out).toContain('high');
    });
  });

  describe('credits formatting', () => {
    it('displays AI credits block when credits are present', () => {
      const metrics = { ...baseMetrics, credits: 1250 };
      const out = formatMetrics(metrics);
      expect(out).toContain(' AI Credits:');
      expect(out).toContain('1250');
    });

    it('does not display quota when credits are present', () => {
      const metrics = { ...baseMetrics, credits: 1250, quotaWeekly: 100, quota5h: 100 };
      const out = formatMetrics(metrics);
      expect(out).not.toContain('Quota');
      expect(out).not.toContain('Weekly');
      expect(out).not.toContain('5h');
    });
  });
});

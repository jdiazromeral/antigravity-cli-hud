import { describe, it, expect } from 'vitest';
import { formatMetrics } from './formatter';
import { ParsedMetrics } from './parser';

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
    looperMissions: [],
    looperEpics: [],
    executionMode: 'request-review'
  };

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
        { name: 'sub1', role: 'Tester', status: 'completed' },
        { name: 'sub2', role: 'Runner', status: 'working' }
      ]
    };
    const out = formatMetrics(metricsWithSubs);
    expect(out).toContain('sub1');
    expect(out).toContain('sub2');
    expect(out).toContain('Subagents:');
  });

  it('turns ctx block red and adds degradation warning if exceeds200k is true', () => {
    const warningMetrics = { ...baseMetrics, exceeds200k: true };
    const out = formatMetrics(warningMetrics);
    expect(out).toContain('Agent may start degrading');
    expect(out).toContain('\x1b[31m'); // Red color
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
});

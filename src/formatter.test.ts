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
    terminalWidth: 184
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
});

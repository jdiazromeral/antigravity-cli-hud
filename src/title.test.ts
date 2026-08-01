import { describe, it, expect } from 'vitest';

function formatTitle(metrics: { workspace: string; gitBranches?: { name: string; branch: string }[]; model: string; agentState: string }): string {
  let gitPart = '';
  if (metrics.gitBranches && metrics.gitBranches.length > 0) {
    if (metrics.gitBranches.length === 1) {
      const single = metrics.gitBranches[0];
      const label = single.name === metrics.workspace ? single.branch : `${single.name}:${single.branch}`;
      gitPart = `(${label}) `;
    } else {
      const labels = metrics.gitBranches.map((g: any) => `${g.name}:${g.branch}`).join(' & ');
      gitPart = `(${labels}) `;
    }
  }
  const statePart = metrics.agentState === 'IDLE' ? '🟢 IDLE' : (metrics.agentState === 'WAITING' ? '🟡 WAITING' : `🔵 ${metrics.agentState}`);
  return `agy - ${metrics.workspace} ${gitPart}[${metrics.model}] ${statePart}`;
}

describe('title formatting', () => {
  it('formats title without git branches when clean', () => {
    const title = formatTitle({
      workspace: 'work',
      gitBranches: [],
      model: 'Gemini 3.6 Flash',
      agentState: 'IDLE'
    });
    expect(title).toBe('agy - work [Gemini 3.6 Flash] 🟢 IDLE');
  });

  it('formats title with single branch matching workspace name', () => {
    const title = formatTitle({
      workspace: 'sample_faqs',
      gitBranches: [{ name: 'sample_faqs', branch: 'feat/auth' }],
      model: 'Gemini 3.6 Flash',
      agentState: 'WORKING'
    });
    expect(title).toBe('agy - sample_faqs (feat/auth) [Gemini 3.6 Flash] 🔵 WORKING');
  });

  it('formats title with single branch differing from workspace name', () => {
    const title = formatTitle({
      workspace: 'work',
      gitBranches: [{ name: 'sample_faqs', branch: 'feat/auth' }],
      model: 'Gemini 3.6 Flash',
      agentState: 'WAITING'
    });
    expect(title).toBe('agy - work (sample_faqs:feat/auth) [Gemini 3.6 Flash] 🟡 WAITING');
  });

  it('formats title with multiple branches including repo names', () => {
    const title = formatTitle({
      workspace: 'work',
      gitBranches: [
        { name: 'sample_faqs', branch: 'feat/auth' },
        { name: 'antigravity-cli-hud', branch: 'fix/scoping' }
      ],
      model: 'Gemini 3.6 Flash',
      agentState: 'IDLE'
    });
    expect(title).toBe('agy - work (sample_faqs:feat/auth & antigravity-cli-hud:fix/scoping) [Gemini 3.6 Flash] 🟢 IDLE');
  });
});

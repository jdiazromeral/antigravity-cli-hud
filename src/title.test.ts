import { describe, it, expect } from 'vitest';
import { formatTitle } from './title.js';

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

  it('formats title with active tool and step progress when working', () => {
    const title = formatTitle({
      workspace: 'work',
      gitBranches: [{ name: 'work', branch: 'main' }],
      model: 'Gemini 3.6 Flash',
      agentState: 'WORKING',
      activeTool: { name: 'vitest' },
      stepCount: 14,
      maxSteps: 20
    });
    expect(title).toBe('[🛠️ vitest] agy - work (main) [Gemini 3.6 Flash] [👟 14/20] 🔵 WORKING');
  });
});

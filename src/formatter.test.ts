import { describe, it, expect } from 'vitest';
import { formatMetrics, DEFAULT_HUD_CONFIG, HUD_CONFIG, loadHudConfig } from './formatter';
import { ParsedMetrics } from './parser';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

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
    credits: undefined,
    isApiKey: false
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
      expect(out).toContain('\uF155 AI Credits:');
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

  describe('runtime configuration and layout loading', () => {
    const tmpDir = os.tmpdir();
    const testConfigFile = path.join(tmpDir, `hud_config_test_${Date.now()}.json`);

    it('exports DEFAULT_HUD_CONFIG and HUD_CONFIG', () => {
      expect(DEFAULT_HUD_CONFIG).toBeDefined();
      expect(HUD_CONFIG).toBeDefined();
      expect(DEFAULT_HUD_CONFIG.budget.maxSteps).toBe(20);
      expect(DEFAULT_HUD_CONFIG.layouts.large).toBeDefined();
    });

    it('loads defaults when config file does not exist', () => {
      const config = loadHudConfig('/non/existent/path/hud_config.json');
      expect(config.budget.maxSteps).toBe(20);
      expect(config.autoHideEmptyBlocks).toBe(true);
      expect(config.breakpoints.large).toBe(135);
    });

    it('gracefully handles corrupted JSON without throwing', () => {
      fs.writeFileSync(testConfigFile, '{ invalid json: broken', 'utf-8');
      try {
        const config = loadHudConfig(testConfigFile);
        expect(config.budget.maxSteps).toBe(20);
      } finally {
        if (fs.existsSync(testConfigFile)) fs.unlinkSync(testConfigFile);
      }
    });

    it('loads custom runtime overrides from JSON file and merges with defaults', () => {
      const customConfig = {
        autoHideEmptyBlocks: false,
        budget: {
          maxSteps: 50
        },
        layouts: {
          large: [
            ['workspace', 'model'],
            ['steps']
          ]
        }
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(customConfig), 'utf-8');
      try {
        const loaded = loadHudConfig(testConfigFile);
        expect(loaded.autoHideEmptyBlocks).toBe(false);
        expect(loaded.budget.maxSteps).toBe(50);
        // Breakpoints should be preserved from defaults
        expect(loaded.breakpoints.large).toBe(135);
        expect(loaded.layouts.large).toEqual([
          ['workspace', 'model'],
          ['steps']
        ]);
        // Other layouts preserved
        expect(loaded.layouts.medium).toEqual(DEFAULT_HUD_CONFIG.layouts.medium);
      } finally {
        if (fs.existsSync(testConfigFile)) fs.unlinkSync(testConfigFile);
      }
    });

    it('renders custom layouts and budget limits with formatMetrics config override', () => {
      const customConfig = {
        budget: { maxSteps: 35 },
        breakpoints: { large: 100, medium: 50, small: 0 },
        layouts: {
          large: [
            ['workspace', 'model'],
            ['steps']
          ],
          medium: [
            ['workspace'],
            ['steps']
          ],
          small: [
            ['steps']
          ]
        }
      };

      const metrics = { ...baseMetrics, maxSteps: undefined, stepCount: 7, terminalWidth: 120 };
      const out = formatMetrics(metrics as any, 120, customConfig);
      // Line 1 should have workspace and model
      expect(out).toContain('work');
      expect(out).toContain('Gemini 3.1 Pro');
      // Line 2 should have 7/35 steps
      expect(out).toContain('7/35');
      // It should not render other unconfigured blocks on large layout
      expect(out).not.toContain('Unsandboxed');
      expect(out).not.toContain('5h');
    });

    it('respects autoHideEmptyBlocks: false in custom config', () => {
      const customConfig = {
        autoHideEmptyBlocks: false,
        layouts: {
          large: [
            ['tasks', 'subagents']
          ],
          medium: [
            ['tasks', 'subagents']
          ],
          small: [
            ['tasks']
          ]
        }
      };

      const metricsNoTasksNoSubs = { ...baseMetrics, taskCount: 0, subagents: [], terminalWidth: 120 };
      const out = formatMetrics(metricsNoTasksNoSubs, 120, customConfig);
      // Tasks and Subagents should still be rendered because autoHideEmptyBlocks is false
      expect(out).toContain('Active Tasks:');
      expect(out).toContain('Subagents (0)');
    });

    it('end-to-end: loads config from file and renders layout accordingly', () => {
      const fileConfig = {
        budget: { maxSteps: 42 },
        layouts: {
          large: [
            ['model', 'steps']
          ]
        }
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(fileConfig), 'utf-8');
      try {
        const loadedConfig = loadHudConfig(testConfigFile);
        const metrics = { ...baseMetrics, maxSteps: undefined, stepCount: 21, terminalWidth: 140 };
        const out = formatMetrics(metrics as any, 140, loadedConfig);
        expect(out).toContain('Gemini 3.1 Pro');
        expect(out).toContain('21/42');
        expect(out).not.toContain('Unsandboxed');
      } finally {
        if (fs.existsSync(testConfigFile)) fs.unlinkSync(testConfigFile);
      }
    });
  });

  describe('API key mode formatting', () => {
    it('renders [API Key] badge and omits broken quota bars on standard terminal', () => {
      const metrics = { ...baseMetrics, isApiKey: true, quota5h: 0, quotaWeekly: 0 };
      const out = formatMetrics(metrics);
      expect(out).toContain('[API Key]');
      expect(out).not.toContain('5h:');
      expect(out).not.toContain('Weekly:');
    });

    it('renders [API Key] badge on narrow terminal when plan block is not in layout', () => {
      const metrics = { ...baseMetrics, isApiKey: true, terminalWidth: 70, quota5h: 0, quotaWeekly: 0 };
      const out = formatMetrics(metrics);
      expect(out).toContain('[API Key]');
      expect(out).not.toContain('5h:');
      expect(out).not.toContain('Weekly:');
    });

    it('renders [API Key] badge when planTier is API Key', () => {
      const metrics = { ...baseMetrics, planTier: 'API Key', isApiKey: true };
      const out = formatMetrics(metrics);
      expect(out).toContain('[API Key]');
    });
  });

  describe('activeTool formatting', () => {
    it('formats activeTool with live summary and queries cleanly', () => {
      const metrics = {
        ...baseMetrics,
        activeTool: { name: 'search_web', summary: 'vitest mock os.homedir', status: 'running' }
      };
      const out = formatMetrics(metrics);
      expect(out).toContain('search_web (vitest mock os.homedir)');
      expect(out).toContain('🛠️');
    });

    it('formats activeTool with failure or cancellation status badge', () => {
      const failedMetrics = {
        ...baseMetrics,
        activeTool: { name: 'run_command', summary: 'npm test', status: 'failed' }
      };
      const failedOut = formatMetrics(failedMetrics);
      expect(failedOut).toContain('run_command');
      expect(failedOut).toContain('[failed]');

      const killedMetrics = {
        ...baseMetrics,
        activeTool: { name: 'manage_task', summary: 'Killed task task-123', status: 'killed' }
      };
      const killedOut = formatMetrics(killedMetrics);
      expect(killedOut).toContain('manage_task');
      expect(killedOut).toContain('[killed]');
    });

    it('applies responsive truncation for long tool summaries on wide and narrow screens', () => {
      const longQuery = 'Searching the web for the latest updates on Antigravity CLI 1.1.13 release notes and changes in TypeScript layout engine';
      
      // Wide terminal (>75 width) truncates at 60 chars
      const wideMetrics = {
        ...baseMetrics,
        terminalWidth: 120,
        activeTool: { name: 'search_web', summary: longQuery, status: 'running' }
      };
      const wideOut = formatMetrics(wideMetrics);
      expect(wideOut).toContain('search_web');
      expect(wideOut).toContain('Searching the web for the latest updates on Antigravity C...');
      expect(wideOut).not.toContain(longQuery);

      // Narrow terminal (<=75 width) truncates at 30 chars
      const narrowMetrics = {
        ...baseMetrics,
        terminalWidth: 70,
        activeTool: { name: 'search_web', summary: longQuery, status: 'running' }
      };
      const narrowOut = formatMetrics(narrowMetrics);
      expect(narrowOut).toContain('search_web');
      expect(narrowOut).toContain('Searching the web for the l...');
      expect(narrowOut).not.toContain('Searching the web for the latest updates');
    });
  });
});



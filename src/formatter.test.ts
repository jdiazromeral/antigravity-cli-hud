import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { formatMetrics, DEFAULT_HUD_CONFIG, HUD_CONFIG, loadHudConfig, stripAnsi, formatOsc8Link, THEMES, STYLES } from './formatter';
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
      expect(stripAnsi(out)).toContain('📜 tail -f ~/.gemini/antigravity-cli/transcript_123.txt');
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

  describe('Custom Executable Blocks', () => {
    const testConfigFile = path.join(os.tmpdir(), `hud-config-custom-${Math.random().toString(36).substring(2)}.json`);

    afterEach(() => {
      if (fs.existsSync(testConfigFile)) fs.unlinkSync(testConfigFile);
    });

    it('loads customBlocks from hud_config.json', () => {
      const customConfig = {
        customBlocks: {
          custom_1: {
            title: 'Project',
            command: './get-project.sh',
            intervalMs: 3000
          },
          custom_2: {
            command: 'git status -s'
          }
        }
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(customConfig), 'utf-8');
      const loaded = loadHudConfig(testConfigFile);
      expect(loaded.customBlocks?.custom_1).toEqual({
        title: 'Project',
        command: './get-project.sh',
        intervalMs: 3000
      });
      expect(loaded.customBlocks?.custom_2).toEqual({
        command: 'git status -s'
      });
    });

    it('formats custom block with title header cleanly', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        customBlocks: {
          custom_1: 'lab/hud (feature-branch)'
        }
      };
      const configOverride = {
        customBlocks: {
          custom_1: {
            title: 'Project',
            command: './get-project.sh'
          }
        },
        layouts: {
          large: [['state', 'custom_1']],
          medium: [['state', 'custom_1']],
          small: [['state', 'custom_1']]
        }
      };
      const out = formatMetrics(metrics, 150, configOverride);
      expect(out).toContain('Project:');
      expect(out).toContain('lab/hud (feature-branch)');
    });

    it('formats custom block without title cleanly', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        customBlocks: {
          custom_status: 'ONLINE'
        }
      };
      const configOverride = {
        customBlocks: {
          custom_status: {
            command: 'echo ONLINE'
          }
        },
        layouts: {
          large: [['state', 'custom_status']],
          medium: [['state', 'custom_status']],
          small: [['state', 'custom_status']]
        }
      };
      const out = formatMetrics(metrics, 150, configOverride);
      expect(out).toContain('ONLINE');
    });

    it('places custom blocks in small, medium, and large layouts', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        customBlocks: {
          custom_1: 'large-data',
          custom_2: 'med-data',
          custom_3: 'small-data'
        }
      };
      const configOverride = {
        breakpoints: {
          large: 120,
          medium: 60,
          small: 0
        },
        customBlocks: {
          custom_1: { title: 'L-Block', command: 'cmd1' },
          custom_2: { title: 'M-Block', command: 'cmd2' },
          custom_3: { title: 'S-Block', command: 'cmd3' }
        },
        layouts: {
          large: [['state', 'custom_1']],
          medium: [['state', 'custom_2']],
          small: [['state', 'custom_3']]
        }
      };

      const outLarge = formatMetrics({ ...metrics, terminalWidth: 140 }, 140, configOverride);
      expect(outLarge).toContain('L-Block:');
      expect(outLarge).toContain('large-data');
      expect(outLarge).not.toContain('med-data');

      const outMedium = formatMetrics({ ...metrics, terminalWidth: 80 }, 80, configOverride);
      expect(outMedium).toContain('M-Block:');
      expect(outMedium).toContain('med-data');
      expect(outMedium).not.toContain('large-data');

      const outSmall = formatMetrics({ ...metrics, terminalWidth: 50 }, 50, configOverride);
      expect(outSmall).toContain('S-Block:');
      expect(outSmall).toContain('small-data');
      expect(outSmall).not.toContain('med-data');
    });

    it('auto-hides empty custom blocks when autoHideEmptyBlocks is true', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        customBlocks: {
          custom_1: ''
        }
      };
      const configOverride = {
        autoHideEmptyBlocks: true,
        customBlocks: {
          custom_1: {
            title: 'Project',
            command: './get-project.sh'
          }
        },
        layouts: {
          large: [['workspace', 'custom_1']],
          medium: [['workspace', 'custom_1']],
          small: [['workspace', 'custom_1']]
        }
      };
      const out = formatMetrics(metrics, 150, configOverride);
      expect(out).not.toContain('Project:');
      expect(out).toContain('work');
    });
  });

  describe('looper block hierarchical tree and deduplication', () => {
    it('eliminates redundant repo name when repo equals epic name', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        looperEpics: [
          { repo: 'agy-1-1-13-hud-updates', epic: 'agy-1-1-13-hud-updates', total: 5, done: 3 }
        ]
      };
      const out = formatMetrics(metrics);
      expect(out).toContain('🎯 Epic:');
      expect(out).toContain('agy-1-1-13-hud-updates');
      expect(out).not.toContain('agy-1-1-13-hud-updates - Epic:');
      expect(out).toContain('3/5 DONE');
    });

    it('renders repository tag when repo and epic names are distinct', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        looperEpics: [
          { repo: 'antigravity-cli-hud', epic: 'custom-blocks', total: 4, done: 2 }
        ]
      };
      const out = formatMetrics(metrics);
      expect(out).toContain('🎯 [antigravity-cli-hud]');
      expect(out).toContain('custom-blocks');
      expect(out).not.toContain('antigravity-cli-hud - Epic:');
      expect(out).toContain('2/4 DONE');
    });

    it('renders nested missions under their matching parent epic in a hierarchical tree', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        looperEpics: [
          { repo: 'work', epic: 'hud-updates', total: 4, done: 2 }
        ],
        looperMissions: [
          { repo: 'work', epic: 'hud-updates', mission: 'M3', status: 'IN_PROGRESS', iteration: 2, maxIterations: 8 }
        ]
      };
      const out = formatMetrics(metrics);
      expect(out).toContain('🎯 [work]');
      expect(out).toContain('hud-updates');
      expect(out).toContain('↳ [M3]');
      expect(out).toContain('IN_PROGRESS Iteration 2/8');
      expect(out).not.toContain('work - hud-updates/M3');
    });

    it('renders standalone missions cleanly with repo/epic context when not matched to any active epic', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        looperEpics: [],
        looperMissions: [
          { repo: 'sample_faqs', epic: 'faq-sync', mission: 'M1', status: 'IN_PROGRESS', iteration: 1, maxIterations: 5 }
        ]
      };
      const out = formatMetrics(metrics);
      expect(out).toContain('• [sample_faqs ➔ faq-sync] [M1]');
      expect(out).toContain('IN_PROGRESS Iteration 1/5');
    });

    it('formats failed and blocked missions with reason suffix in tree and standalone', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        looperEpics: [
          { repo: 'my-epic', epic: 'my-epic', total: 2, done: 0 }
        ],
        looperMissions: [
          { repo: 'my-epic', epic: 'my-epic', mission: 'M1', status: 'FAILED', reason: 'npm test failed' },
          { repo: 'other-repo', epic: 'other-epic', mission: 'M2', status: 'BLOCKED', reason: 'deps missing' }
        ]
      };
      const out = formatMetrics(metrics);
      expect(out).toContain('🎯 Epic:');
      expect(out).toContain('my-epic');
      expect(out).toContain('↳ [M1]');
      expect(out).toContain('FAILED - npm test failed');
      expect(out).toContain('• [other-repo ➔ other-epic] [M2]');
      expect(out).toContain('BLOCKED - deps missing');
    });
  });

    describe('OSC 8 Hyperlinks & stripAnsi hardening', () => {
    it('strips both SGR and OSC 8 sequences cleanly without skewing visible character counts', () => {
      const rawText = '\x1b]8;;file:///Users/javidiaz/workspace/code/AGENTS.md\x1b\\AGENTS.md\x1b]8;;\x1b\\';
      const styledText = `\x1b[32m${rawText}\x1b[0m`;
      const stripped = stripAnsi(styledText);
      expect(stripped).toBe('AGENTS.md');
      expect(stripped.length).toBe(9);
    });

    it('formats OSC 8 links with URL encoding for paths with spaces and special characters', () => {
      const link = formatOsc8Link('/Users/javi/My Workspace/file#1.md', 'file#1.md', true);
      expect(link).toContain('\x1b]8;;file:///Users/javi/My%20Workspace/file%231.md\x1b\\file#1.md\x1b]8;;\x1b\\');
    });

    it('returns raw text when clickableLinks is false or url is empty', () => {
      expect(formatOsc8Link('/path/to/file.md', 'file.md', false)).toBe('file.md');
      expect(formatOsc8Link('', 'file.md', true)).toBe('file.md');
    });

    it('renders Cmd+Clickable OSC 8 links on transcript, artifacts, mcp, and git blocks by default', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        transcriptPath: '/Users/javidiaz/.gemini/transcript.jsonl',
        artifacts: ['plan.md', 'walkthrough.md'],
        conversationId: 'conv123',
        mcpConfigPath: '/Users/javidiaz/.gemini/config/mcp_config.json',
        mcpServers: ['github', 'chrome'],
        gitBranches: [{ name: 'work', branch: 'feat/hud*' }]
      };
      const out = formatMetrics(metrics);
      expect(out).toContain('\x1b]8;;file:///Users/javidiaz/.gemini/transcript.jsonl\x1b\\');
      expect(out).toContain('\x1b]8;;file://');
      expect(out).toContain('plan.md');
      expect(out).toContain('walkthrough.md');
    });
  });

  describe('Theming Engine (TrueColor RGB palettes)', () => {
    it('exports all 7 theme presets in THEMES dictionary', () => {
      expect(THEMES).toBeDefined();
      expect(THEMES['default']).toBeDefined();
      expect(THEMES['catppuccin']).toBeDefined();
      expect(THEMES['tokyo-night']).toBeDefined();
      expect(THEMES['dracula']).toBeDefined();
      expect(THEMES['nord']).toBeDefined();
      expect(THEMES['solarized']).toBeDefined();
      expect(THEMES['monochrome']).toBeDefined();
    });

    it('renders TrueColor 24-bit RGB codes when catppuccin theme is selected', () => {
      const configOverride = { theme: 'catppuccin' as const };
      const out = formatMetrics(baseMetrics, 120, configOverride as any);
      // Catppuccin Blue #89b4fa -> 137;180;250 or Catppuccin Mocha colors
      expect(out).toContain('\x1b[38;2;');
    });

    it('renders clean bold monochrome styling when monochrome theme is selected', () => {
      const configOverride = { theme: 'monochrome' as const };
      const out = formatMetrics(baseMetrics, 120, configOverride as any);
      expect(out).toBeDefined();
    });
  });

  describe('Separator Styles Engine', () => {
    it('exports all 4 style configurations in STYLES dictionary', () => {
      expect(STYLES).toBeDefined();
      expect(STYLES['modern']).toBeDefined();
      expect(STYLES['powerline']).toBeDefined();
      expect(STYLES['bubble']).toBeDefined();
      expect(STYLES['minimal']).toBeDefined();
    });

    it('renders powerline arrows when powerline style is configured', () => {
      const configOverride = { style: 'powerline' as const };
      const out = formatMetrics(baseMetrics, 120, configOverride as any);
      expect(out).toContain('');
    });

    it('renders bubble pill badges when bubble style is configured', () => {
      const configOverride = { style: 'bubble' as const };
      const out = formatMetrics(baseMetrics, 120, configOverride as any);
      expect(out).toContain('');
    });

    it('renders clean spaces and bullets when minimal style is configured', () => {
      const configOverride = { style: 'minimal' as const };
      const out = formatMetrics(baseMetrics, 120, configOverride as any);
      expect(out).not.toContain('▌');
    });
  });

  describe('New Telemetry Blocks (mcp, rules, session_time, enriched tool & git)', () => {
    it('renders MCP telemetry block with active servers and clickable config link', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        mcpServers: ['github', 'chrome', 'postgres'],
        mcpConfigPath: '/Users/javidiaz/.gemini/config/mcp_config.json'
      };
      const configOverride = {
        layouts: {
          large: [['state', 'mcp']],
          medium: [['state', 'mcp']],
          small: [['state', 'mcp']]
        }
      };
      const out = formatMetrics(metrics, 140, configOverride);
      expect(out).toContain('🔌 MCP:');
      expect(out).toContain('3 active');
      expect(out).toContain('mcp_config.json');
    });

    it('renders active rules count in rules block', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        activeRules: [
          { name: 'AGENTS.md', path: '/Users/javidiaz/workspace/AGENTS.md', scope: 'project' },
          { name: 'GEMINI.md', path: '/Users/javidiaz/.gemini/GEMINI.md', scope: 'global' }
        ]
      };
      const configOverride = {
        layouts: {
          large: [['state', 'rules']],
          medium: [['state', 'rules']],
          small: [['state', 'rules']]
        }
      };
      const out = formatMetrics(metrics, 140, configOverride);
      expect(out).toContain('📜 Rules:');
      expect(out).toContain('2 active');
    });

    it('renders session elapsed wall-clock timer in session_time block', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        sessionElapsedSeconds: 862 // 14m 22s
      };
      const configOverride = {
        layouts: {
          large: [['state', 'session_time']],
          medium: [['state', 'session_time']],
          small: [['state', 'session_time']]
        }
      };
      const out = formatMetrics(metrics, 140, configOverride);
      expect(stripAnsi(out)).toContain('⏱️ 14m 22s');
    });

    it('renders tool elapsed execution timer when toolElapsedSeconds is provided', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        activeTool: { name: 'run_command', summary: 'npm test', status: 'running' },
        toolElapsedSeconds: 8
      };
      const out = formatMetrics(metrics);
      expect(out).toContain('run_command (npm test) [⏱️ 8s]');
    });

    it('renders git diff weight and ahead/behind counts when gitStats is provided', () => {
      const metrics: ParsedMetrics = {
        ...baseMetrics,
        gitBranches: [{ name: 'work', branch: 'feat/hud*' }],
        gitStats: { added: 42, deleted: 10, filesModified: 3, ahead: 1, behind: 0 }
      };
      const out = formatMetrics(metrics);
      expect(out).toContain('feat/hud*');
      expect(out).toContain('+42/-10, 3 files');
      expect(out).toContain('↑1 ↓0');
    });
  });
});

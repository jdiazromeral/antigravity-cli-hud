import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseStream, AntigravityPayload } from './parser.js';

const mockHome = path.join(os.tmpdir(), `tmp-dir-${Math.random().toString(36).substring(2)}`);

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return {
    ...actual,
    homedir: () => mockHome,
  };
});

describe('parseStream', () => {
  it('should parse valid JSON payload and extract metrics', async () => {
    const payload: AntigravityPayload = {
      agent_state: 'Thinking',
      editor_mode: "N", credits: undefined,
      context_window: {
        total_input_tokens: 45000,
        used_percentage: 45,
        current_usage: {
          cache_read_input_tokens: 12000
        }
      },
      quota: {
        '3p-weekly': { remaining_fraction: 0.67, reset_in_seconds: 62917 },
        '3p-5h': { remaining_fraction: 1.0, reset_in_seconds: 17758 }
      },
      task_count: 2,
      session_id: '123',
      model: { display_name: 'Other Model' },
      cwd: '/path/to/project_dir',
      sandbox: { enabled: false },
      version: '1.0.8',
      email: 'user@example.com',
      plan_tier: 'Pro',
      terminal_width: 105,
      transcript_path: '/path/to/my/transcript.txt',
      effort: 'high',
      mode: 'plan',
      agent: 'MyCustomAgent',
      editor_mode: "I",
      credits: { balance: 1250 }
    };

    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);

    expect(result).toEqual({
      agentState: 'THINKING',
      contextUsage: 45,
      totalInputTokens: 45000,
      cacheTokens: 12000,
      contextWindowSize: 1048576,
      exceeds200k: false,
      quotaWeekly: 33, // Math.round((1 - 0.67) * 100)
      quotaWeeklyResetSeconds: 62917,
      quota5h: 0, // Math.round((1 - 1.0) * 100)
      quota5hResetSeconds: 17758,
      quotaType: '3rd-Party',
      subagents: [],
      activeTool: undefined,
      activeSkills: [],
      taskCount: 2,
      sessionName: '123',
      model: 'Other Model',
      workspace: 'project_dir',
      isSandboxed: false,
      version: '1.0.8',
      email: 'user@example.com',
      planTier: 'Pro',
      terminalWidth: 105,
      skipPermissions: false,
      gitBranches: [],
      artifactCount: 0,
      artifacts: [],
      conversationId: '123',
      looperMissions: [],
      looperEpics: [],
      stepCount: 0,
      maxSteps: 20,
      maxContextTokens: 0,
      executionMode: 'plan',
      transcriptPath: '/path/to/my/transcript.txt',
      effort: 'high',
      agentName: 'MyCustomAgent',
      editorMode: 'I',
      credits: 1250,
      isApiKey: false,
      customBlocks: {}
    });
  });

  it('should parse subagents depth correctly', async () => {
    const payload = {
      agent_state: 'Working',
      editor_mode: "N", credits: undefined,
      subagents: [
        { name: 'parent', role: 'Manager', status: 'working', depth: 0, conversation_id: 'sub-123456', log_uri: '/path/to/log.txt' },
        { name: 'child', role: 'Worker', status: 'working', depth: 1 }
      ]
    };
    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);
    expect(result.subagents).toEqual([
      { name: 'parent', role: 'Manager', status: 'working', depth: 0, conversationId: 'sub-123456', logUri: '/path/to/log.txt' },
      { name: 'child', role: 'Worker', status: 'working', depth: 1, conversationId: undefined, logUri: undefined }
    ]);
  });

  it('should parse tool_info correctly when present', async () => {
    const payload = {
      agent_state: 'Working',
      editor_mode: "N", credits: undefined,
      tool_info: { name: 'run_command', summary: 'git status', status: 'running' }
    };
    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);
    expect(result.activeTool).toEqual({
      name: 'run_command',
      summary: 'git status',
      status: 'running',
      query: undefined,
      action: undefined
    });
  });

  it('should parse progressive search_web query when query field is present', async () => {
    const payload = {
      agent_state: 'Working',
      editor_mode: "N", credits: undefined,
      tool_info: { name: 'search_web', query: 'vitest mock os.homedir', status: 'running' }
    };
    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);
    expect(result.activeTool).toEqual({
      name: 'search_web',
      summary: 'vitest mock os.homedir',
      status: 'running',
      query: 'vitest mock os.homedir',
      action: undefined
    });
  });

  it('should combine summary and query for search_web when both are present', async () => {
    const payload = {
      agent_state: 'Working',
      editor_mode: "N", credits: undefined,
      tool_info: { name: 'search_web', summary: 'Searching the web', query: 'antigravity cli 1.1.13', status: 'running' }
    };
    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);
    expect(result.activeTool).toEqual({
      name: 'search_web',
      summary: 'Searching the web: antigravity cli 1.1.13',
      status: 'running',
      query: 'antigravity cli 1.1.13',
      action: undefined
    });
  });

  it('should synthesize summaries for task actions (kill, status, list, send_input)', async () => {
    const killPayload = {
      agent_state: 'Working',
      editor_mode: "N", credits: undefined,
      tool_info: { name: 'manage_task', action: 'kill', taskId: 'task-123', status: 'running' }
    };
    let result = await parseStream(Readable.from([JSON.stringify(killPayload)]));
    expect(result.activeTool).toEqual({
      name: 'manage_task',
      summary: 'Killed task task-123',
      status: 'running',
      query: undefined,
      action: 'kill'
    });

    const checkPayload = {
      agent_state: 'Working',
      editor_mode: "N", credits: undefined,
      tool_info: { name: 'manage_task', action: 'status', task_id: 'task-456', status: 'running' }
    };
    result = await parseStream(Readable.from([JSON.stringify(checkPayload)]));
    expect(result.activeTool).toEqual({
      name: 'manage_task',
      summary: 'Checked task task-456',
      status: 'running',
      query: undefined,
      action: 'status'
    });

    const listPayload = {
      agent_state: 'Working',
      editor_mode: "N", credits: undefined,
      tool_info: { name: 'manage_task', action: 'list', status: 'running' }
    };
    result = await parseStream(Readable.from([JSON.stringify(listPayload)]));
    expect(result.activeTool).toEqual({
      name: 'manage_task',
      summary: 'Listed tasks',
      status: 'running',
      query: undefined,
      action: 'list'
    });

    const sendPayload = {
      agent_state: 'Working',
      editor_mode: "N", credits: undefined,
      tool_info: { name: 'manage_task', action: 'send_input', taskId: 'task-789', status: 'running' }
    };
    result = await parseStream(Readable.from([JSON.stringify(sendPayload)]));
    expect(result.activeTool).toEqual({
      name: 'manage_task',
      summary: 'Sent input to task task-789',
      status: 'running',
      query: undefined,
      action: 'send_input'
    });
  });

  it('should preserve explicit summary when present alongside action', async () => {
    const payload = {
      agent_state: 'Working',
      editor_mode: "N", credits: undefined,
      tool_info: { name: 'manage_task', summary: 'Killed task custom-999', action: 'kill', status: 'completed' }
    };
    const result = await parseStream(Readable.from([JSON.stringify(payload)]));
    expect(result.activeTool).toEqual({
      name: 'manage_task',
      summary: 'Killed task custom-999',
      status: 'completed',
      query: undefined,
      action: 'kill'
    });
  });

  describe('executionMode parsing', () => {
    const settingsDir = path.join(os.homedir(), '.gemini', 'antigravity-cli');
    const settingsPath = path.join(settingsDir, 'settings.json');

    beforeEach(() => {
      fs.mkdirSync(settingsDir, { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(os.homedir(), { recursive: true, force: true });
    });

    it('should parse executionMode from settings.json', async () => {
      fs.writeFileSync(settingsPath, JSON.stringify({ mode: 'accept-edits' }));
      
      const payload = { agent_state: 'Idle', editor_mode: "N", credits: undefined };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.executionMode).toBe('accept-edits');
    });

    it('should default to request-review if mode is missing in settings.json', async () => {
      fs.writeFileSync(settingsPath, JSON.stringify({}));
      
      const payload = { agent_state: 'Idle', editor_mode: "N", credits: undefined };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.executionMode).toBe('request-review');
    });
    it('should use mode from payload if present, bypassing settings.json', async () => {
      fs.writeFileSync(settingsPath, JSON.stringify({ mode: 'accept-edits' }));
      
      const payload = { agent_state: 'Idle', mode: 'plan', editor_mode: "N", credits: undefined };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.executionMode).toBe('plan');
    });
  });

  it('should leverage vcs payload if present to avoid OS blocking', async () => {
    const payload: AntigravityPayload = {
      agent_state: 'Idle',
      editor_mode: "N", credits: undefined,
      cwd: '/path/to/project',
      vcs: { branch: 'feature-branch', dirty: true }
    };
    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);
    expect(result.gitBranches).toEqual([{ name: 'project', branch: 'feature-branch*' }]);
  });

  it('should not append * if not dirty', async () => {
    const payload: AntigravityPayload = {
      agent_state: 'Idle',
      editor_mode: "N", credits: undefined,
      cwd: '/path/to/project',
      vcs: { branch: 'main', dirty: false }
    };
    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);
    expect(result.gitBranches).toEqual([{ name: 'project', branch: 'main' }]);
  });

  it('should handle invalid JSON gracefully by throwing an error', async () => {
    const stream = Readable.from(['{ invalid json']);
    await expect(parseStream(stream)).rejects.toThrow('Failed to parse JSON');
  });

  it('should fallback to defaults if missing required fields', async () => {
    const oldAgent = process.env.AGENT_NAME;
    const oldAgyAgent = process.env.AGY_AGENT_NAME;
    process.env.AGENT_NAME = 'TARS';
    process.env.AGY_AGENT_NAME = '';
    const payload = {
      agent_state: 'idle',
    };
    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);
    expect(result.agentState).toBe('IDLE');
    expect(result.contextUsage).toBe(0);
    expect(result.model).toBe('Unknown Model');
    expect(result.skipPermissions).toBe(false);
    expect(result.gitBranches).toEqual([]);
    expect(result.artifactCount).toBe(0);
    expect(result.exceeds200k).toBe(false);
    expect(result.effort).toBe('normal');
    expect(result.agentName).toBe('TARS');
    expect(result.executionMode).toBe('request-review');
    expect(result.editorMode).toBeUndefined();
    expect(result.isApiKey).toBe(true);
    process.env.AGENT_NAME = oldAgent;
    process.env.AGY_AGENT_NAME = oldAgyAgent;
  });

  it('should correctly parse dangerously_skip_permissions and skip_permissions from payload', async () => {
    const payload1 = {
      agent_state: 'working',
      dangerously_skip_permissions: true
    };
    const res1 = await parseStream(Readable.from([JSON.stringify(payload1)]));
    expect(res1.skipPermissions).toBe(true);

    const payload2 = {
      agent_state: 'working',
      skip_permissions: true
    };
    const res2 = await parseStream(Readable.from([JSON.stringify(payload2)]));
    expect(res2.skipPermissions).toBe(true);
  });

  it('should correctly parse exceeds_200k_tokens', async () => {
    const payload = {
      agent_state: 'Idle',
      editor_mode: "N", credits: undefined,
      exceeds_200k_tokens: true
    };
    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);
    expect(result.exceeds200k).toBe(true);
  });

  it('should correctly parse editor_mode', async () => {
    const payload = {
      agent_state: 'Idle',
      editor_mode: "N", credits: undefined
    };
    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);
    expect(result.editorMode).toBe('N');
  });

  it('should detect active skills from tool_info, subagents, and looper', async () => {
    const payload = {
      agent_state: 'Working',
      editor_mode: "N", credits: undefined,
      tool_info: {
        name: 'view_file',
        summary: '/Users/javidiaz/.gemini/config/plugins/looper/skills/looper/SKILL.md'
      },
      subagents: [
        { name: 'worker1', role: 'TDD Red-Green Refactor', status: 'working' }
      ]
    };
    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);

    expect(result.activeSkills).toContain('looper');
    expect(result.activeSkills).toContain('tdd');
  });

  it('should respect AGY_MAX_CONTEXT_TOKENS and AGY_MAX_STEPS env vars when defined', async () => {
    process.env.AGY_MAX_CONTEXT_TOKENS = '75000';
    process.env.AGY_MAX_STEPS = '30';

    const payload = { agent_state: 'Working', editor_mode: "N", credits: undefined };
    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);

    expect(result.maxContextTokens).toBe(75000);
    expect(result.maxSteps).toBe(30);

    delete process.env.AGY_MAX_CONTEXT_TOKENS;
    delete process.env.AGY_MAX_STEPS;
  });

  describe('stepCount parsing', () => {
    it('should parse step_count directly from payload', async () => {
      const payload = {
        agent_state: 'Working',
        editor_mode: "N", credits: undefined,
        step_count: 14
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);
      expect(result.stepCount).toBe(14);
    });

    it('should fallback to step_index if step_count is absent', async () => {
      const payload = {
        agent_state: 'Working',
        editor_mode: "N", credits: undefined,
        step_index: 8
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);
      expect(result.stepCount).toBe(8);
    });

    it('should prioritize step_count over step_index when both are provided', async () => {
      const payload = {
        agent_state: 'Working',
        editor_mode: "N", credits: undefined,
        step_count: 12,
        step_index: 5
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);
      expect(result.stepCount).toBe(12);
    });

    it('should default stepCount to 0 when neither step_count nor step_index is provided', async () => {
      const payload = {
        agent_state: 'Working',
        editor_mode: "N", credits: undefined
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);
      expect(result.stepCount).toBe(0);
    });

    it('should not read transcript file if step_count is present', async () => {
      const tmpTranscript = path.join(os.tmpdir(), `test-transcript-${Date.now()}.jsonl`);
      fs.writeFileSync(tmpTranscript, '{"type":"USER_INPUT"}\n{"type":"USER_INPUT"}\n{"type":"USER_INPUT"}\n');
      
      const payload = {
        agent_state: 'Working',
        editor_mode: "N", credits: undefined,
        transcript_path: tmpTranscript,
        step_count: 1
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);
      
      // stepCount should be 1 (from payload), not 3 (from transcript user turns)
      expect(result.stepCount).toBe(1);
      
      fs.unlinkSync(tmpTranscript);
    });

    it('should compute stepCount as user turns (USER_INPUT / USER_EXPLICIT) from transcript_path', async () => {
      const tmpTranscript = path.join(os.tmpdir(), `test-transcript-${Date.now()}-count.jsonl`);
      // 2 user turns with multiple tool and planner events
      fs.writeFileSync(tmpTranscript, [
        '{"type":"USER_INPUT","source":"USER_EXPLICIT"}',
        '{"type":"PLANNER_RESPONSE","source":"MODEL"}',
        '{"type":"RUN_COMMAND","source":"MODEL"}',
        '{"type":"TOOL_RESULT","source":"SYSTEM"}',
        '{"type":"USER_INPUT","source":"USER_EXPLICIT"}',
        '{"type":"PLANNER_RESPONSE","source":"MODEL"}'
      ].join('\n') + '\n');

      const payload = {
        agent_state: 'Working',
        editor_mode: "N", credits: undefined,
        transcript_path: tmpTranscript
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      // Should be 2 user turns, NOT 6 raw lines
      expect(result.stepCount).toBe(2);
      fs.unlinkSync(tmpTranscript);
    });

    it('should cache stepCount based on mtime and recompute when mtime changes', async () => {
      const tmpTranscript = path.join(os.tmpdir(), `test-transcript-${Date.now()}-cache.jsonl`);
      fs.writeFileSync(tmpTranscript, '{"type":"USER_INPUT"}\n{"type":"PLANNER_RESPONSE"}\n');

      const payload = {
        agent_state: 'Working',
        editor_mode: "N", credits: undefined,
        transcript_path: tmpTranscript
      };

      const result1 = await parseStream(Readable.from([JSON.stringify(payload)]));
      expect(result1.stepCount).toBe(1);

      // Verify cached result returns the same value
      const result2 = await parseStream(Readable.from([JSON.stringify(payload)]));
      expect(result2.stepCount).toBe(1);

      // Update file with new mtime and more user turns
      const futureTime = new Date(Date.now() + 2000);
      fs.appendFileSync(tmpTranscript, '{"type":"USER_INPUT"}\n{"type":"PLANNER_RESPONSE"}\n');
      fs.utimesSync(tmpTranscript, futureTime, futureTime);

      const result3 = await parseStream(Readable.from([JSON.stringify(payload)]));
      expect(result3.stepCount).toBe(2);

      fs.unlinkSync(tmpTranscript);
    });

    it('should compute stepCount from resolved transcript path via conversationId when transcript_path is omitted', async () => {
      const convId = `test-conv-${Date.now()}`;
      const brainDir = path.join(mockHome, '.gemini', 'antigravity-cli', 'brain', convId, '.system_generated', 'logs');
      fs.mkdirSync(brainDir, { recursive: true });
      const transcriptFile = path.join(brainDir, 'transcript.jsonl');
      fs.writeFileSync(transcriptFile, '{"type":"USER_INPUT"}\n{"type":"USER_INPUT"}\n');

      const payload = {
        agent_state: 'Working',
        conversation_id: convId
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.stepCount).toBe(2);
    });

    it('should fallback to 0 when transcript file is empty or corrupted', async () => {
      const tmpTranscript = path.join(os.tmpdir(), `test-transcript-${Date.now()}-empty.jsonl`);
      fs.writeFileSync(tmpTranscript, '');

      const payload = {
        agent_state: 'Working',
        transcript_path: tmpTranscript
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.stepCount).toBe(0);
      fs.unlinkSync(tmpTranscript);
    });
  });

  describe('fuzzing and resilience guard-rails', () => {
    it('should ignore unknown and experimental top-level/nested payload fields without crashing', async () => {
      const payload = {
        agent_state: 'Thinking',
        editor_mode: "N", credits: undefined,
        unknown_experimental_flag: true,
        nested_future_struct: {
          quantum_tokens: 999999,
          deep_mind_vector: [0.1, 0.2, 0.3]
        },
        future_subagent_field: 'unrecognized'
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.agentState).toBe('THINKING');
      expect(result.contextUsage).toBe(0);
    });

    it('should handle malformed subagents array items (null, non-object, invalid role/name types)', async () => {
      const payload = {
        agent_state: 'Working',
        editor_mode: "N", credits: undefined,
        subagents: [
          null,
          123,
          'string-subagent',
          { name: null, role: 456, status: 'working' },
          { name: 'valid', role: 'Worker', status: 'working', depth: -5 },
          { name: 'malformed-role', role: null, status: 'working' }
        ] as unknown as AntigravityPayload['subagents']
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(Array.isArray(result.subagents)).toBe(true);
      expect(result.subagents).toContainEqual(
        expect.objectContaining({ name: 'valid', role: 'Worker', status: 'working' })
      );
    });

    it('should handle 2M+ context window and extreme token usage gracefully', async () => {
      const payload = {
        agent_state: 'Thinking',
        editor_mode: "N", credits: undefined,
        context_window: {
          total_input_tokens: 1850000,
          used_percentage: 88.2,
          context_window_size: 2097152,
          current_usage: {
            cache_read_input_tokens: 450000
          }
        },
        exceeds_200k_tokens: true
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.totalInputTokens).toBe(1850000);
      expect(result.contextUsage).toBe(88);
      expect(result.contextWindowSize).toBe(2097152);
      expect(result.cacheTokens).toBe(450000);
      expect(result.exceeds200k).toBe(true);
    });

    it('should handle invalid/out-of-bounds context window values (NaN, negative, >100)', async () => {
      const payload = {
        agent_state: 'Working',
        editor_mode: "N", credits: undefined,
        context_window: {
          total_input_tokens: -500,
          used_percentage: 150,
          current_usage: {
            cache_read_input_tokens: -10
          }
        }
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.totalInputTokens).toBe(0);
      expect(result.contextUsage).toBe(100);
      expect(result.cacheTokens).toBe(0);
    });

    it('should handle non-object or malformed tool_info', async () => {
      const payload = {
        agent_state: 'Working',
        editor_mode: "N", credits: undefined,
        tool_info: 'invalid-string-tool-info' as unknown as AntigravityPayload['tool_info']
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.activeTool).toBeUndefined();

      const payload2 = {
        agent_state: 'Working',
        editor_mode: "N", credits: undefined,
        tool_info: { name: 12345, summary: { invalid: 'object' }, status: null } as unknown as AntigravityPayload['tool_info']
      };
      const stream2 = Readable.from([JSON.stringify(payload2)]);
      const result2 = await parseStream(stream2);
      expect(result2.activeTool).toBeUndefined();
    });

    it('should handle malformed model, session_id, and cwd fields gracefully', async () => {
      const payload = {
        agent_state: 'Idle',
        editor_mode: "N", credits: undefined,
        model: { display_name: 12345 } as unknown as AntigravityPayload['model'],
        session_id: 999999 as unknown as AntigravityPayload['session_id'],
        cwd: 123 as unknown as AntigravityPayload['cwd']
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.model).toBe('Unknown Model');
      expect(result.sessionName).toBe('Unknown');
      expect(result.workspace).toBe('Unknown Workspace');
    });

    it('should handle non-object root JSON payloads (array, string, number, boolean, null)', async () => {
      const arrayStream = Readable.from(['[1, 2, 3]']);
      await expect(parseStream(arrayStream)).rejects.toThrow('Missing required metrics in payload');

      const stringStream = Readable.from(['"just a string"']);
      await expect(parseStream(stringStream)).rejects.toThrow('Missing required metrics in payload');

      const nullStream = Readable.from(['null']);
      await expect(parseStream(nullStream)).rejects.toThrow('Missing required metrics in payload');
    });

    it('should handle malformed quota structures and unknown quota types', async () => {
      const payload = {
        agent_state: 'Idle',
        editor_mode: "N", credits: undefined,
        quota: {
          'gemini-weekly': 'invalid-quota-string' as unknown as { remaining_fraction: number },
          '3p-weekly': { remaining_fraction: 'invalid' as unknown as number, reset_in_seconds: -100 },
          'future-quota-model': { remaining_fraction: 0.5, reset_in_seconds: 1000 }
        }
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.quotaWeekly).toBe(0);
      expect(result.quotaWeeklyResetSeconds).toBe(0);
    });

    it('should gracefully handle malformed credits payload', async () => {
      const payload = {
        agent_state: 'Idle',
        editor_mode: "N", credits: undefined,
        credits: 'invalid-credits-string' as unknown as { balance: number }
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.credits).toBeUndefined();
    });

    it('should handle malformed sandbox and vcs objects', async () => {
      const payload = {
        agent_state: 'Idle',
        editor_mode: "N", credits: undefined,
        sandbox: 'not-an-object' as unknown as AntigravityPayload['sandbox'],
        vcs: 12345 as unknown as AntigravityPayload['vcs']
      };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.isSandboxed).toBe(false);
      expect(result.gitBranches).toEqual([]);
    });

    describe('API key mode parsing', () => {
      it('should parse direct GEMINI_API_KEY payload when is_api_key or api_key_mode is true', async () => {
        const payload1 = {
          agent_state: 'Working',
          is_api_key: true,
          model: { display_name: 'Gemini 3.6 Flash' }
        };
        const res1 = await parseStream(Readable.from([JSON.stringify(payload1)]));
        expect(res1.isApiKey).toBe(true);

        const payload2 = {
          agent_state: 'Working',
          api_key_mode: true,
          model: { display_name: 'Gemini 3.6 Flash' }
        };
        const res2 = await parseStream(Readable.from([JSON.stringify(payload2)]));
        expect(res2.isApiKey).toBe(true);
      });

      it('should detect API key mode when plan_tier or email indicates API key', async () => {
        const payload1 = {
          agent_state: 'Working',
          plan_tier: 'API Key',
          model: { display_name: 'Gemini 3.6 Flash' }
        };
        const res1 = await parseStream(Readable.from([JSON.stringify(payload1)]));
        expect(res1.isApiKey).toBe(true);

        const payload2 = {
          agent_state: 'Working',
          email: '<api-key>',
          model: { display_name: 'Gemini 3.6 Flash' }
        };
        const res2 = await parseStream(Readable.from([JSON.stringify(payload2)]));
        expect(res2.isApiKey).toBe(true);

        const payload3 = {
          agent_state: 'Working',
          email: 'api_key',
          model: { display_name: 'Gemini 3.6 Flash' }
        };
        const res3 = await parseStream(Readable.from([JSON.stringify(payload3)]));
        expect(res3.isApiKey).toBe(true);
      });

      it('should detect API key mode when quota is absent or null', async () => {
        const payload1 = {
          agent_state: 'Working',
          quota: null,
          model: { display_name: 'Gemini 3.6 Flash' }
        };
        const res1 = await parseStream(Readable.from([JSON.stringify(payload1)]));
        expect(res1.isApiKey).toBe(true);

        const payload2 = {
          agent_state: 'Working',
          quota: {},
          model: { display_name: 'Gemini 3.6 Flash' }
        };
        const res2 = await parseStream(Readable.from([JSON.stringify(payload2)]));
        expect(res2.isApiKey).toBe(true);
      });

      it('should not detect API key mode when standard quota is present', async () => {
        const payload = {
          agent_state: 'Working',
          model: { display_name: 'Gemini 3.6 Flash' },
          quota: {
            'gemini-5h': { remaining_fraction: 0.8, reset_in_seconds: 3600 }
          }
        };
        const res = await parseStream(Readable.from([JSON.stringify(payload)]));
        expect(res.isApiKey).toBe(false);
      });
    });

    describe('Custom Executable Blocks', () => {
      const configDir = path.join(mockHome, '.gemini');
      const configFile = path.join(configDir, 'hud_config.json');

      beforeEach(() => {
        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
      });

      afterEach(() => {
        if (fs.existsSync(configFile)) fs.unlinkSync(configFile);
      });

      it('reads cached custom block outputs into ParsedMetrics', async () => {
        const customConfig = {
          customBlocks: {
            custom_1: {
              title: 'Project',
              command: 'echo "lab/test (main)"',
              intervalMs: 5000
            }
          }
        };
        fs.writeFileSync(configFile, JSON.stringify(customConfig), 'utf8');

        const cacheFile = path.join(mockHome, '.gemini', 'hud_custom_custom_1.cache');
        const metaFile = path.join(mockHome, '.gemini', 'hud_custom_custom_1.meta');
        fs.writeFileSync(cacheFile, 'lab/test (main)', 'utf8');
        fs.writeFileSync(metaFile, JSON.stringify({ timestamp: Date.now() }), 'utf8');

        const payload = {
          agent_state: 'Working',
          model: { display_name: 'Gemini 3.6 Flash' }
        };
        const result = await parseStream(Readable.from([JSON.stringify(payload)]));
        expect(result.customBlocks).toBeDefined();
        expect(result.customBlocks?.custom_1).toBe('lab/test (main)');
      });

      it('returns empty customBlocks when no custom blocks are configured', async () => {
        const payload = {
          agent_state: 'Working',
          model: { display_name: 'Gemini 3.6 Flash' }
        };
        const result = await parseStream(Readable.from([JSON.stringify(payload)]));
        expect(result.customBlocks).toEqual({});
      });

      it('ignores custom blocks with invalid or unsafe block keys', async () => {
        const customConfig = {
          customBlocks: {
            'safe_block': { command: 'echo safe' },
            '../traversal': { command: 'echo bad' },
            'inject;rm -rf': { command: 'echo bad' },
            'inject"quote': { command: 'echo bad' },
            'with spaces': { command: 'echo bad' }
          }
        };
        fs.writeFileSync(configFile, JSON.stringify(customConfig), 'utf8');

        const cacheSafe = path.join(mockHome, '.gemini', 'hud_custom_safe_block.cache');
        const metaSafe = path.join(mockHome, '.gemini', 'hud_custom_safe_block.meta');
        fs.writeFileSync(cacheSafe, 'safe value', 'utf8');
        fs.writeFileSync(metaSafe, JSON.stringify({ timestamp: Date.now() }), 'utf8');

        const payload = {
          agent_state: 'Working',
          model: { display_name: 'Gemini 3.6 Flash' }
        };
        const result = await parseStream(Readable.from([JSON.stringify(payload)]));
        expect(result.customBlocks).toBeDefined();
        expect(result.customBlocks?.['safe_block']).toBe('safe value');
        expect(result.customBlocks?.['../traversal']).toBeUndefined();
        expect(result.customBlocks?.['inject;rm -rf']).toBeUndefined();
        expect(result.customBlocks?.['inject"quote']).toBeUndefined();
        expect(result.customBlocks?.['with spaces']).toBeUndefined();
      });
    });

    describe('Security Hardening & Path Traversal Protections', () => {
      it('rejects path traversal in conversation_id for artifact lookup', async () => {
        const externalDir = path.join(mockHome, 'external-secret-dir');
        fs.mkdirSync(externalDir, { recursive: true });
        fs.writeFileSync(path.join(externalDir, 'secret_artifact.md'), 'secret');

        const payload = {
          agent_state: 'Working',
          model: { display_name: 'Gemini 3.6 Flash' },
          conversation_id: '../../external-secret-dir'
        };

        const result = await parseStream(Readable.from([JSON.stringify(payload)]));
        expect(result.artifacts).toEqual([]);
        expect(result.conversationId).toBeUndefined();
      });

      it('rejects path traversal in session_id for context file loading', async () => {
        const payload = {
          agent_state: 'Working',
          model: { display_name: 'Gemini 3.6 Flash' },
          session_id: '../../../etc/passwd'
        };

        const result = await parseStream(Readable.from([JSON.stringify(payload)]));
        expect(result.conversationId).toBeUndefined();
        expect(result.sessionName).toBe('Unknown');
      });

      it('allows valid safe conversation IDs', async () => {
        const validId = '9630c763-fda0-4f71-aa15-dcd5ef14c4d3';
        const brainDir = path.join(mockHome, '.gemini', 'antigravity-cli', 'brain', validId);
        fs.mkdirSync(brainDir, { recursive: true });
        fs.writeFileSync(path.join(brainDir, 'valid_artifact.md'), 'valid');

        const payload = {
          agent_state: 'Working',
          model: { display_name: 'Gemini 3.6 Flash' },
          conversation_id: validId
        };

        const result = await parseStream(Readable.from([JSON.stringify(payload)]));
        expect(result.conversationId).toBe(validId);
        expect(result.artifacts).toContain('valid_artifact.md');
      });
    });
  });
});



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
      agent: 'MyCustomAgent'
    };

    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);

    expect(result).toEqual({
      agentState: 'THINKING',
      contextUsage: 45,
      totalInputTokens: 45000,
      cacheTokens: 12000,
      exceeds200k: false,
      quotaWeekly: 33, // Math.round((1 - 0.67) * 100)
      quotaWeeklyResetSeconds: 62917,
      quota5h: 0, // Math.round((1 - 1.0) * 100)
      quota5hResetSeconds: 17758,
      quotaType: '3rd-Party',
      subagents: [],
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
      executionMode: 'plan',
      transcriptPath: '/path/to/my/transcript.txt',
      effort: 'high',
      agentName: 'MyCustomAgent'
    });
  });

  it('should parse subagents depth correctly', async () => {
    const payload = {
      agent_state: 'Working',
      subagents: [
        { name: 'parent', role: 'Manager', status: 'working', depth: 0 },
        { name: 'child', role: 'Worker', status: 'working', depth: 1 }
      ]
    };
    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);
    expect(result.subagents).toEqual([
      { name: 'parent', role: 'Manager', status: 'working', depth: 0 },
      { name: 'child', role: 'Worker', status: 'working', depth: 1 }
    ]);
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
      
      const payload = { agent_state: 'Idle' };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.executionMode).toBe('accept-edits');
    });

    it('should default to request-review if mode is missing in settings.json', async () => {
      fs.writeFileSync(settingsPath, JSON.stringify({}));
      
      const payload = { agent_state: 'Idle' };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.executionMode).toBe('request-review');
    });
    it('should use mode from payload if present, bypassing settings.json', async () => {
      fs.writeFileSync(settingsPath, JSON.stringify({ mode: 'accept-edits' }));
      
      const payload = { agent_state: 'Idle', mode: 'plan' };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.executionMode).toBe('plan');
    });
  });

  it('should leverage vcs payload if present to avoid OS blocking', async () => {
    const payload: AntigravityPayload = {
      agent_state: 'Idle',
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
    const payload = {
      agent_state: 'Idle'
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
    expect(result.agentName).toBe('Antigravity');
    expect(result.executionMode).toBe('request-review');
  });

  it('should correctly parse exceeds_200k_tokens', async () => {
    const payload = {
      agent_state: 'Idle',
      exceeds_200k_tokens: true
    };
    const stream = Readable.from([JSON.stringify(payload)]);
    const result = await parseStream(stream);
    expect(result.exceeds200k).toBe(true);
  });
});

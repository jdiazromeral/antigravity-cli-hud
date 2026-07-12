import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Readable } from 'stream';
import * as fs from 'fs';
import { parseStream, AntigravityPayload } from './parser.js';

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return {
    ...actual,
    homedir: () => '/tmp/mock-homedir',
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
      terminal_width: 105
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
      executionMode: 'request-review'
    });
  });

  describe('executionMode parsing', () => {
    beforeEach(() => {
      fs.mkdirSync('/tmp/mock-homedir/.gemini/antigravity-cli', { recursive: true });
    });

    afterEach(() => {
      fs.rmSync('/tmp/mock-homedir', { recursive: true, force: true });
    });

    it('should parse executionMode from settings.json', async () => {
      fs.writeFileSync('/tmp/mock-homedir/.gemini/antigravity-cli/settings.json', JSON.stringify({ mode: 'accept-edits' }));
      
      const payload = { agent_state: 'Idle' };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.executionMode).toBe('accept-edits');
    });

    it('should default to request-review if mode is missing in settings.json', async () => {
      fs.writeFileSync('/tmp/mock-homedir/.gemini/antigravity-cli/settings.json', JSON.stringify({}));
      
      const payload = { agent_state: 'Idle' };
      const stream = Readable.from([JSON.stringify(payload)]);
      const result = await parseStream(stream);

      expect(result.executionMode).toBe('request-review');
    });
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

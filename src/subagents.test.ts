import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as child_process from 'node:child_process';
import { countSubagents } from './subagents';

vi.mock('node:child_process');

describe('countSubagents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the number of active subagent processes', async () => {
    vi.mocked(child_process.exec).mockImplementation((command, callback) => {
      if (typeof callback === 'function') {
        callback(null, 'user 123 0.0 0.0 1234 1234 ? S 00:00:00 subagent\nuser 124 0.0 0.0 1234 1234 ? S 00:00:00 subagent\nuser 125 0.0 0.0 1234 1234 ? S 00:00:00 subagent', '');
      }
      return {} as unknown as child_process.ChildProcess;
    });

    const count = await countSubagents();
    expect(count).toBe(3);
    expect(child_process.exec).toHaveBeenCalledWith(
      expect.stringContaining('ps'),
      expect.any(Function)
    );
  });

  it('should handle no processes found', async () => {
    vi.mocked(child_process.exec).mockImplementation((command, callback) => {
      if (typeof callback === 'function') {
        callback(null, '', '');
      }
      return {} as unknown as child_process.ChildProcess;
    });

    const count = await countSubagents();
    expect(count).toBe(0);
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(child_process.exec).mockImplementation((command, callback) => {
      if (typeof callback === 'function') {
        callback(new Error('command failed'), '', 'error output');
      }
      return {} as unknown as child_process.ChildProcess;
    });

    await expect(countSubagents()).rejects.toThrow('command failed');
  });
});

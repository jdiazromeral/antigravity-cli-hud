import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync, execSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const statusLineHook = path.join(rootDir, 'hooks', 'status-line.sh');
const titleHook = path.join(rootDir, 'hooks', 'title.sh');

describe('E2E Hook Invariant Black-Box Tests', () => {
  beforeAll(() => {
    // Ensure fresh build before running E2E tests against dist/
    execSync('npm run build', { cwd: rootDir, stdio: 'ignore' });
  });

  const runHook = (hookPath: string, inputPayload: string | Record<string, any>, env: NodeJS.ProcessEnv = {}) => {
    const inputStr = typeof inputPayload === 'string' ? inputPayload : JSON.stringify(inputPayload);
    const result = spawnSync(hookPath, [], {
      input: inputStr,
      encoding: 'utf-8',
      env: { ...process.env, ...env },
      cwd: rootDir
    });
    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      status: result.status
    };
  };

  it('Invariant 1: Standard Working State & Metric Rendering', () => {
    const payload = {
      agent_state: 'WORKING',
      model: { display_name: 'Gemini 3.6 Flash' },
      cwd: '/Users/test/workspace/code/my-project',
      context_window: {
        used_percentage: 45,
        total_input_tokens: 45000,
        context_window_size: 1048576,
        current_usage: { cache_read_input_tokens: 30000 }
      },
      step_count: 8,
      max_steps: 20,
      quota: {
        'gemini-5h': { remaining_fraction: 0.5, reset_in_seconds: 3600 },
        'gemini-weekly': { remaining_fraction: 0.2, reset_in_seconds: 86400 }
      },
      terminal_width: 140
    };

    const res = runHook(statusLineHook, payload);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('WORKING');
    expect(res.stdout).toContain('Gemini 3.6 Flash');
    expect(res.stdout).toContain('my-project');
    expect(res.stdout).toContain('Steps:');
    expect(res.stdout).toContain('8/20');
    expect(res.stdout).toContain('Cache:');
    expect(res.stdout).toContain('30k');
    expect(res.stdout).toContain('5h:');
    expect(res.stdout).toContain('Weekly:');
  });

  it('Invariant 2: Danger Mode Detection via Environment Variable', () => {
    const payload = {
      agent_state: 'WORKING',
      model: { display_name: 'Gemini 3.6 Flash' }
    };

    const res = runHook(statusLineHook, payload, { AGY_SKIP_PERMISSIONS: 'true' });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Danger Mode');
  });

  it('Invariant 3: Danger Mode Detection via Telemetry Payload Flags', () => {
    const payload = {
      agent_state: 'WORKING',
      model: { display_name: 'Gemini 3.6 Flash' },
      dangerously_skip_permissions: true
    };

    const res = runHook(statusLineHook, payload);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Danger Mode');
  });

  it('Invariant 4: Ironclad Crash Protection on Corrupt JSON', () => {
    const res = runHook(statusLineHook, 'INVALID_CORRUPT_JSON_{}');
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('HUD Warning');
    expect(res.stdout).toContain('Parsing payload');
  });

  it('Invariant 5: AI Credits Override Quota Display', () => {
    const payload = {
      agent_state: 'WORKING',
      model: { display_name: 'Claude 3.5 Sonnet' },
      credits: { balance: 2450 },
      quota: {
        '3p-5h': { remaining_fraction: 0.8, reset_in_seconds: 1800 },
        '3p-weekly': { remaining_fraction: 0.5, reset_in_seconds: 86400 }
      }
    };

    const res = runHook(statusLineHook, payload);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('AI Credits');
    expect(res.stdout).toContain('2450');
    expect(res.stdout).not.toContain('🕒 5h:');
    expect(res.stdout).not.toContain('🕒 Weekly:');
  });

  it('Invariant 6: Subagent Hierarchy & ID Formatting', () => {
    const payload = {
      agent_state: 'WORKING',
      subagents: [
        { name: 'orchestrator', role: 'Epic Runner', status: 'working', depth: 0, conversation_id: 'sub-orch123' },
        { name: 'worker-1', role: 'Backend Dev', status: 'working', depth: 1, conversation_id: 'sub-work456' },
        { name: 'tester', role: 'Unit Tester', status: 'working', depth: 2, conversation_id: 'sub-test789' }
      ]
    };

    const res = runHook(statusLineHook, payload);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Subagents:');
    expect(res.stdout).toContain('orchestrator');
    expect(res.stdout).toContain('[id:sub-or]');
    expect(res.stdout).toContain('↳ worker-1');
    expect(res.stdout).toContain('↳ tester');
  });

  it('Invariant 7: Active Tool Execution Streaming', () => {
    const payload = {
      agent_state: 'WORKING',
      tool_info: {
        name: 'run_command',
        summary: 'git push origin main',
        status: 'running'
      }
    };

    const res = runHook(statusLineHook, payload);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('🛠️');
    expect(res.stdout).toContain('run_command (git push origin main)');
  });

  it('Invariant 8: Terminal Window Title Hook Execution', () => {
    const payload = {
      agent_state: 'WORKING',
      model: { display_name: 'Gemini 3.6 Flash' },
      cwd: '/Users/test/workspace/code/my-project',
      vcs: { branch: 'feat/e2e-tests', dirty: false }
    };

    const res = runHook(titleHook, payload);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('agy - my-project');
    expect(res.stdout).toContain('feat/e2e-tests');
    expect(res.stdout).toContain('[Gemini 3.6 Flash]');
    expect(res.stdout).toContain('🔵 WORKING');
  });

  it('Invariant 9: Running Cost Telemetry with Subagent Breakdown', () => {
    const payload = {
      agent_state: 'WORKING',
      model: { display_name: 'Gemini 3.1 Pro' },
      cost: {
        total_usd: 0.04235,
        subagent_usd: 0.012,
        estimated: true
      },
      subagents: [
        { name: 'worker-1', role: 'Feature Dev', status: 'working', depth: 0, total_usd: 0.012 }
      ]
    };

    const res = runHook(statusLineHook, payload);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('💲 Cost:');
    expect(res.stdout).toContain('~$0.042');
    expect(res.stdout).toContain('(sub: $0.012)');
    expect(res.stdout).toContain('worker-1');
    expect(res.stdout).toContain('[$0.012]');
  });

  it('Invariant 10: Experimental Voice Telemetry & REC Indicator', () => {
    const payload = {
      agent_state: 'WORKING',
      model: { display_name: 'Gemini 3.6 Flash' },
      terminal_width: 140,
      voice: {
        is_recording: true,
        status: 'recording'
      }
    };

    // Save a temporary layout containing 'voice' in ~/.gemini/hud_config.json
    const configPath = path.join(os.homedir(), '.gemini', 'hud_config.json');
    let prevConfig: string | null = null;
    if (fs.existsSync(configPath)) {
      prevConfig = fs.readFileSync(configPath, 'utf8');
    }

    try {
      fs.writeFileSync(configPath, JSON.stringify({
        layouts: {
          large: [['state', 'mode', 'voice', 'model']]
        }
      }), 'utf8');

      const res = runHook(statusLineHook, payload);
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('🔴 🎙️ REC');
    } finally {
      if (prevConfig !== null) {
        fs.writeFileSync(configPath, prevConfig, 'utf8');
      } else if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    }
  });
});


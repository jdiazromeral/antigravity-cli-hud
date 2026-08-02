import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

describe('sync_installed_plugin script', () => {
  const tmpDir = path.join(os.tmpdir(), `hud-sync-test-${Date.now()}`);
  const rootDir = path.resolve(__dirname, '..');
  const scriptPath = path.join(rootDir, 'scripts', 'sync_installed_plugin.js');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should sync files and succeed with --test flag', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);

    const output = execSync(`node "${scriptPath}" --test`, {
      env: { ...process.env, SYNC_TARGET_DIR: tmpDir },
      encoding: 'utf-8'
    });

    expect(output).toMatch(/synced|verified/i);
    expect(fs.existsSync(path.join(tmpDir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'plugin.json'))).toBe(true);
  });
});

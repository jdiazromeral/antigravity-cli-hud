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

  it('should not dereference symlinks during sync to prevent external file copy', async () => {
    const syncSourceDir = path.join(tmpDir, 'source');
    const syncTargetDir = path.join(tmpDir, 'target');
    const outsideSecret = path.join(tmpDir, 'secret.txt');

    fs.mkdirSync(syncSourceDir, { recursive: true });
    fs.writeFileSync(outsideSecret, 'SUPER_SECRET_CONTENT', 'utf-8');

    // Create a symlink inside source pointing to the outside secret
    fs.symlinkSync(outsideSecret, path.join(syncSourceDir, 'linked_secret.txt'));
    // @ts-expect-error script is plain JS
    const { syncPlugin } = await import('../scripts/sync_installed_plugin.js');
    syncPlugin(syncSourceDir, syncTargetDir);

    const targetLinkPath = path.join(syncTargetDir, 'linked_secret.txt');
    expect(fs.existsSync(targetLinkPath)).toBe(true);
    const lstat = fs.lstatSync(targetLinkPath);
    expect(lstat.isSymbolicLink()).toBe(true);
  });
});

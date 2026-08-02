import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runDoctor } from './doctor.js';

describe('runDoctor healthcheck', () => {
  let tmpDir: string;
  let cliDir: string;
  let pluginDir: string;
  let settingsPath: string;
  let hookScript: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hud-doctor-test-'));
    cliDir = path.join(tmpDir, '.gemini', 'antigravity-cli');
    pluginDir = path.join(tmpDir, '.gemini', 'config', 'plugins', 'hud');
    settingsPath = path.join(cliDir, 'settings.json');

    fs.mkdirSync(cliDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(path.join(pluginDir, 'hooks'), { recursive: true, mode: 0o700 });
    fs.chmodSync(pluginDir, 0o700);

    hookScript = path.join(pluginDir, 'hooks', 'status-line.sh');
    fs.writeFileSync(hookScript, '#!/bin/sh\necho "hud"', { mode: 0o700 });
    fs.writeFileSync(path.join(pluginDir, 'plugin.json'), '{"name":"hud"}', { mode: 0o600 });

    const settingsContent = JSON.stringify({
      statusLine: {
        type: 'command',
        command: hookScript
      }
    }, null, 2);

    fs.writeFileSync(settingsPath, settingsContent, { mode: 0o600 });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return healthy = true and empty issues when everything is properly configured', () => {
    const result = runDoctor({
      settingsPath,
      cliDir,
      pluginDir,
      checkPermissions: true
    });

    expect(result.healthy).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('should report issue when CLI directory does not exist', () => {
    const nonExistentCli = path.join(tmpDir, 'nonexistent-cli');
    const result = runDoctor({
      settingsPath,
      cliDir: nonExistentCli,
      pluginDir,
      checkPermissions: false
    });

    expect(result.healthy).toBe(false);
    expect(result.issues).toContain(`CLI directory does not exist: ${nonExistentCli}`);
  });

  it('should report issue when plugin directory does not exist', () => {
    const nonExistentPlugin = path.join(tmpDir, 'nonexistent-plugin');
    const result = runDoctor({
      settingsPath,
      cliDir,
      pluginDir: nonExistentPlugin,
      checkPermissions: false
    });

    expect(result.healthy).toBe(false);
    expect(result.issues).toContain(`Installed plugin directory does not exist: ${nonExistentPlugin}`);
  });

  it('should report issue when plugin.json is missing in plugin directory', () => {
    fs.rmSync(path.join(pluginDir, 'plugin.json'));

    const result = runDoctor({
      settingsPath,
      cliDir,
      pluginDir,
      checkPermissions: false
    });

    expect(result.healthy).toBe(false);
    expect(result.issues).toContain(`Installed plugin missing plugin.json in ${pluginDir}`);
  });

  it('should report issue when settings.json does not exist', () => {
    fs.rmSync(settingsPath);

    const result = runDoctor({
      settingsPath,
      cliDir,
      pluginDir,
      checkPermissions: false
    });

    expect(result.healthy).toBe(false);
    expect(result.issues).toContain(`settings.json not found at ${settingsPath}`);
  });

  it('should report issue when settings.json contains invalid JSON', () => {
    fs.writeFileSync(settingsPath, '{ invalid json', { mode: 0o600 });

    const result = runDoctor({
      settingsPath,
      cliDir,
      pluginDir,
      checkPermissions: false
    });

    expect(result.healthy).toBe(false);
    expect(result.issues.some(i => i.includes('settings.json is not valid JSON'))).toBe(true);
  });

  it('should report issue when statusLine binding is missing in settings.json', () => {
    fs.writeFileSync(settingsPath, JSON.stringify({ model: 'Gemini' }), { mode: 0o600 });

    const result = runDoctor({
      settingsPath,
      cliDir,
      pluginDir,
      checkPermissions: false
    });

    expect(result.healthy).toBe(false);
    expect(result.issues).toContain('statusLine binding missing in settings.json');
  });

  it('should report issue when statusLine type is not command', () => {
    fs.writeFileSync(settingsPath, JSON.stringify({
      statusLine: { type: 'http', command: hookScript }
    }), { mode: 0o600 });

    const result = runDoctor({
      settingsPath,
      cliDir,
      pluginDir,
      checkPermissions: false
    });

    expect(result.healthy).toBe(false);
    expect(result.issues).toContain("statusLine type must be 'command', got 'http'");
  });

  it('should report issue when statusLine command is missing or empty', () => {
    fs.writeFileSync(settingsPath, JSON.stringify({
      statusLine: { type: 'command', command: '  ' }
    }), { mode: 0o600 });

    const result = runDoctor({
      settingsPath,
      cliDir,
      pluginDir,
      checkPermissions: false
    });

    expect(result.healthy).toBe(false);
    expect(result.issues).toContain('statusLine command is missing or empty in settings.json');
  });

  it('should report issue when statusLine command target file does not exist', () => {
    const missingHook = path.join(pluginDir, 'hooks', 'nonexistent.sh');
    fs.writeFileSync(settingsPath, JSON.stringify({
      statusLine: { type: 'command', command: missingHook }
    }), { mode: 0o600 });

    const result = runDoctor({
      settingsPath,
      cliDir,
      pluginDir,
      checkPermissions: false
    });

    expect(result.healthy).toBe(false);
    expect(result.issues).toContain(`statusLine command target does not exist: ${missingHook}`);
  });

  it('should report issue when statusLine command does not align with active plugin directory', () => {
    const outsideDir = path.join(tmpDir, 'other-location');
    fs.mkdirSync(outsideDir, { recursive: true });
    const outsideHook = path.join(outsideDir, 'status-line.sh');
    fs.writeFileSync(outsideHook, '#!/bin/sh\necho "outside"', { mode: 0o700 });

    fs.writeFileSync(settingsPath, JSON.stringify({
      statusLine: { type: 'command', command: outsideHook }
    }), { mode: 0o600 });

    const result = runDoctor({
      settingsPath,
      cliDir,
      pluginDir,
      checkPermissions: false
    });

    expect(result.healthy).toBe(false);
    expect(result.issues).toContain(
      `statusLine command does not align with active plugin path: ${outsideHook} (expected under ${pluginDir})`
    );
  });

  it('should report permission issues for 0600 file and 0700 dir violations when checkPermissions is true', () => {
    if (process.platform === 'win32') return;

    fs.chmodSync(settingsPath, 0o644);
    fs.chmodSync(cliDir, 0o755);
    fs.chmodSync(pluginDir, 0o755);

    const result = runDoctor({
      settingsPath,
      cliDir,
      pluginDir,
      checkPermissions: true
    });

    expect(result.healthy).toBe(false);
    expect(result.issues).toContain(`CLI directory permissions must be 0700, got 0755: ${cliDir}`);
    expect(result.issues).toContain(`Plugin directory permissions must be 0700, got 0755: ${pluginDir}`);
    expect(result.issues).toContain(`settings.json permissions must be 0600, got 0644: ${settingsPath}`);
  });
});

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface DoctorOptions {
  settingsPath?: string;
  cliDir?: string;
  pluginDir?: string;
  checkPermissions?: boolean;
}

export interface DoctorResult {
  healthy: boolean;
  issues: string[];
}

function expandHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

function formatOctal(mode: number): string {
  return '0' + (mode & 0o777).toString(8);
}

export function runDoctor(options: DoctorOptions = {}): DoctorResult {
  const settingsPath = expandHome(options.settingsPath ?? path.join(os.homedir(), '.gemini', 'antigravity-cli', 'settings.json'));
  const cliDir = expandHome(options.cliDir ?? path.join(os.homedir(), '.gemini', 'antigravity-cli'));
  const pluginDir = expandHome(options.pluginDir ?? path.join(os.homedir(), '.gemini', 'config', 'plugins', 'hud'));
  const checkPermissions = options.checkPermissions ?? true;

  const issues: string[] = [];

  // Check CLI directory
  if (!fs.existsSync(cliDir)) {
    issues.push(`CLI directory does not exist: ${cliDir}`);
  } else if (checkPermissions && process.platform !== 'win32') {
    const stat = fs.statSync(cliDir);
    const mode = stat.mode & 0o777;
    if (mode !== 0o700) {
      issues.push(`CLI directory permissions must be 0700, got ${formatOctal(mode)}: ${cliDir}`);
    }
  }

  // Check Plugin directory
  if (!fs.existsSync(pluginDir)) {
    issues.push(`Installed plugin directory does not exist: ${pluginDir}`);
  } else {
    if (checkPermissions && process.platform !== 'win32') {
      const stat = fs.statSync(pluginDir);
      const mode = stat.mode & 0o777;
      if (mode !== 0o700) {
        issues.push(`Plugin directory permissions must be 0700, got ${formatOctal(mode)}: ${pluginDir}`);
      }
    }

    const pluginConfig = path.join(pluginDir, 'plugin.json');
    if (!fs.existsSync(pluginConfig)) {
      issues.push(`Installed plugin missing plugin.json in ${pluginDir}`);
    }
  }

  // Check settings.json
  if (!fs.existsSync(settingsPath)) {
    issues.push(`settings.json not found at ${settingsPath}`);
  } else {
    if (checkPermissions && process.platform !== 'win32') {
      const stat = fs.statSync(settingsPath);
      const mode = stat.mode & 0o777;
      if (mode !== 0o600) {
        issues.push(`settings.json permissions must be 0600, got ${formatOctal(mode)}: ${settingsPath}`);
      }
    }

    try {
      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      if (!settings || typeof settings !== 'object') {
        issues.push(`settings.json content is invalid`);
      } else if (!settings.statusLine) {
        issues.push(`statusLine binding missing in settings.json`);
      } else {
        const statusLine = settings.statusLine;
        if (statusLine.type !== 'command') {
          issues.push(`statusLine type must be 'command', got '${statusLine.type}'`);
        }

        if (!statusLine.command || typeof statusLine.command !== 'string' || statusLine.command.trim() === '') {
          issues.push(`statusLine command is missing or empty in settings.json`);
        } else {
          const rawCmd = statusLine.command.trim();
          const cmdPath = expandHome(rawCmd);

          if (!fs.existsSync(cmdPath)) {
            issues.push(`statusLine command target does not exist: ${cmdPath}`);
          }

          // Active plugin path alignment check
          const resolvedCmd = path.resolve(cmdPath);
          const resolvedPluginDir = path.resolve(pluginDir);
          if (!resolvedCmd.startsWith(resolvedPluginDir + path.sep) && resolvedCmd !== resolvedPluginDir) {
            issues.push(`statusLine command does not align with active plugin path: ${rawCmd} (expected under ${pluginDir})`);
          }
        }
      }
    } catch (err) {
      issues.push(`settings.json is not valid JSON: ${(err as Error).message}`);
    }
  }

  return {
    healthy: issues.length === 0,
    issues
  };
}

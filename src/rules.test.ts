import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  findDeprecatedUnsandboxedRules,
  extractRuleSummary,
  inspectRules,
  formatRulesReport
} from './rules.js';

describe('Rules & Deprecated Permission Inspector', () => {
  const tmpDir = path.join(os.tmpdir(), `hud-rules-test-${Date.now()}`);

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('findDeprecatedUnsandboxedRules', () => {
    it('returns empty array when file does not exist', () => {
      expect(findDeprecatedUnsandboxedRules('/nonexistent/path.json')).toEqual([]);
    });

    it('detects deprecated unsandboxed rules in JSON permission arrays', () => {
      const jsonPath = path.join(tmpDir, 'settings.json');
      fs.writeFileSync(jsonPath, JSON.stringify({
        permissions: {
          allow: [
            'unsandboxed(git status)',
            'command(npm test)',
            'unsandboxed(make build)'
          ],
          deny: ['unsandboxed(rm -rf /)']
        }
      }, null, 2));

      const deprecated = findDeprecatedUnsandboxedRules(jsonPath);
      expect(deprecated).toEqual([
        'unsandboxed(git status)',
        'unsandboxed(make build)',
        'unsandboxed(rm -rf /)'
      ]);
    });

    it('detects bare "unsandboxed" string in JSON configs', () => {
      const jsonPath = path.join(tmpDir, 'perms.json');
      fs.writeFileSync(jsonPath, JSON.stringify({
        permissionGrants: ['unsandboxed', 'command(docker)']
      }));

      const deprecated = findDeprecatedUnsandboxedRules(jsonPath);
      expect(deprecated).toEqual(['unsandboxed']);
    });

    it('returns empty array for clean JSON configs using only modern command rules', () => {
      const jsonPath = path.join(tmpDir, 'clean_settings.json');
      fs.writeFileSync(jsonPath, JSON.stringify({
        permissions: {
          allow: ['command(git status)', 'command(npm test)']
        }
      }));

      const deprecated = findDeprecatedUnsandboxedRules(jsonPath);
      expect(deprecated).toEqual([]);
    });

    it('detects unsandboxed(...) in markdown rule files', () => {
      const mdPath = path.join(tmpDir, 'AGENTS.md');
      fs.writeFileSync(mdPath, `# Agent Rules\n\nAllow \`unsandboxed(deploy.sh)\` for quick deploys.\n`);

      const deprecated = findDeprecatedUnsandboxedRules(mdPath);
      expect(deprecated).toEqual(['unsandboxed(deploy.sh)']);
    });

    it('does not trigger false positives on regular prose in markdown', () => {
      const mdPath = path.join(tmpDir, 'CLAUDE.md');
      fs.writeFileSync(mdPath, `# Security\n\nNever run unsandboxed commands without caution.\n`);

      const deprecated = findDeprecatedUnsandboxedRules(mdPath);
      expect(deprecated).toEqual([]);
    });
  });

  describe('extractRuleSummary', () => {
    it('extracts top-level markdown heading as summary', () => {
      const mdPath = path.join(tmpDir, 'AGENTS.md');
      fs.writeFileSync(mdPath, `\n\n# Agents Information & Behavioral Mandates\n\nSome body text\n`);
      expect(extractRuleSummary(mdPath)).toBe('Agents Information & Behavioral Mandates');
    });

    it('returns configuration summary for JSON files', () => {
      const jsonPath = path.join(tmpDir, 'settings.json');
      fs.writeFileSync(jsonPath, '{}');
      expect(extractRuleSummary(jsonPath)).toBe('Permissions & settings configuration');
    });
  });

  describe('inspectRules & formatRulesReport', () => {
    it('discovers project rules and audits deprecated permissions', () => {
      const projectAgents = path.join(tmpDir, 'AGENTS.md');
      fs.writeFileSync(projectAgents, `# Pair Engineering Mandates\n\n- Rule 1: Think before coding`);

      const dotGemini = path.join(tmpDir, '.gemini');
      fs.mkdirSync(dotGemini, { recursive: true });
      const settingsPath = path.join(dotGemini, 'settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify({
        permissions: {
          allow: ['unsandboxed(git commit)']
        }
      }));

      const result = inspectRules(tmpDir);
      expect(result.cwd).toBe(tmpDir);
      expect(result.totalActive).toBeGreaterThanOrEqual(2);
      expect(result.totalDeprecated).toBe(1);

      const offendingFile = result.deprecatedDetails.find(d => d.file === settingsPath);
      expect(offendingFile).toBeDefined();
      expect(offendingFile?.rules).toContain('unsandboxed(git commit)');
      expect(offendingFile?.fix).toContain('command');

      const report = formatRulesReport(result);
      expect(report).toContain('# 📜 Active Workspace Rules & Permissions Audit Report');
      expect(report).toContain('AGENTS.md');
      expect(report).toContain('settings.json');
      expect(report).toContain('⚠️ Deprecated Permission Rule Warnings (`agy 1.2.2+`)');
      expect(report).toContain('unsandboxed(git commit)');
      expect(report).toContain('Migrate them to "command" rules');
    });

    it('formats green health check when no deprecated rules exist', () => {
      const projectAgents = path.join(tmpDir, 'AGENTS.md');
      fs.writeFileSync(projectAgents, `# Clean Rules\n\nEverything clean`);

      const result = inspectRules(tmpDir);
      // Filter out any potential external global deprecated rules for isolated assertion
      result.totalDeprecated = 0;
      result.deprecatedDetails = [];

      const report = formatRulesReport(result);
      expect(report).toContain('🟢 **All active instruction sets and permissions are modern and compliant with agy 1.2.2+**');
    });
  });
});

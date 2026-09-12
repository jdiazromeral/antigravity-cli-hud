import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as cp from 'child_process';

export interface DiscoveredRule {
  name: string;
  path: string;
  scope: 'project' | 'workspace' | 'global';
  summary?: string | undefined;
  hasDeprecatedRules: boolean;
  deprecatedRules: string[];
}

export interface RulesInspectionResult {
  cwd: string;
  rules: DiscoveredRule[];
  totalActive: number;
  totalDeprecated: number;
  deprecatedDetails: Array<{
    file: string;
    rules: string[];
    fix: string;
  }>;
}

/**
 * Searches a file for deprecated "unsandboxed" permission rules.
 * Upstream Antigravity CLI 1.2.2 deprecates "unsandboxed" permission rules in favor of "command".
 */
export function findDeprecatedUnsandboxedRules(filePath: string): string[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const stat = fs.statSync(filePath);
    if (stat.size > 1024 * 1024) return []; // Skip files > 1MB

    const content = fs.readFileSync(filePath, 'utf8');
    const deprecatedRules: string[] = [];

    if (filePath.endsWith('.json')) {
      try {
        const parsed = JSON.parse(content);
        const extractRules = (obj: unknown) => {
          if (!obj || typeof obj !== 'object') return;
          if (Array.isArray(obj)) {
            for (const item of obj) {
              if (typeof item === 'string') {
                if (/^unsandboxed(\(|$|:)/i.test(item.trim())) {
                  deprecatedRules.push(item.trim());
                }
              } else if (item && typeof item === 'object') {
                extractRules(item);
              }
            }
          } else {
            const record = obj as Record<string, unknown>;
            for (const [key, val] of Object.entries(record)) {
              if (typeof val === 'string' && /^unsandboxed(\(|$|:)/i.test(val.trim())) {
                deprecatedRules.push(val.trim());
              } else if (typeof val === 'object' && val !== null) {
                extractRules(val);
              }
            }
          }
        };
        extractRules(parsed);
      } catch (e) {
        const matches = content.match(/["'](unsandboxed(?:\([^"']*\))?)["']/gi);
        if (matches) {
          for (const m of matches) {
            const cleaned = m.slice(1, -1).trim();
            if (/^unsandboxed(\(|$|:)/i.test(cleaned)) {
              deprecatedRules.push(cleaned);
            }
          }
        }
      }
    } else {
      // Markdown or plain text
      const matches = content.match(/\bunsandboxed\s*\([^)]*\)/gi);
      if (matches) {
        for (const m of matches) {
          deprecatedRules.push(m.trim());
        }
      }
    }

    return Array.from(new Set(deprecatedRules));
  } catch (e) {
    return [];
  }
}

/**
 * Extracts a concise human-readable summary or first header directive from a rule file.
 */
export function extractRuleSummary(filePath: string): string {
  try {
    if (!fs.existsSync(filePath)) return '';
    const content = fs.readFileSync(filePath, 'utf8');
    if (filePath.endsWith('.json')) {
      return 'Permissions & settings configuration';
    }
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return trimmed.replace(/^#+\s*/, '');
      }
    }
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('---')) {
        return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
      }
    }
    return '';
  } catch (e) {
    return '';
  }
}

/**
 * Inspects all active instruction and permission rule files for the given workspace directory.
 */
export function inspectRules(cwd: string = process.cwd()): RulesInspectionResult {
  const discovered: DiscoveredRule[] = [];
  const checkedFiles = new Set<string>();

  const checkAndAdd = (filePath: string, name: string, scope: 'project' | 'workspace' | 'global') => {
    if (!fs.existsSync(filePath) || checkedFiles.has(filePath)) return;
    checkedFiles.add(filePath);
    const deprecated = findDeprecatedUnsandboxedRules(filePath);
    const summary = extractRuleSummary(filePath);
    discovered.push({
      name,
      path: filePath,
      scope,
      summary: summary || undefined,
      hasDeprecatedRules: deprecated.length > 0,
      deprecatedRules: deprecated
    });
  };

  if (cwd) {
    let currentScanDir = path.resolve(cwd);
    const rootBoundary = path.parse(currentScanDir).root;
    let gitRootDir: string | null = null;
    try {
      gitRootDir = cp.execSync('git rev-parse --show-toplevel', { cwd, stdio: 'pipe', timeout: 200 }).toString().trim();
    } catch (e) {}

    while (currentScanDir && currentScanDir !== rootBoundary) {
      const isCwd = currentScanDir === path.resolve(cwd);
      const scope: 'project' | 'workspace' = isCwd ? 'project' : 'workspace';

      for (const fname of ['AGENTS.md', 'GEMINI.md', 'CLAUDE.md']) {
        const filePath = path.join(currentScanDir, fname);
        checkAndAdd(filePath, fname, scope);
      }

      for (const dotAgentDirName of ['.agents', '.agent']) {
        const rulesSubDir = path.join(currentScanDir, dotAgentDirName, 'rules');
        if (fs.existsSync(rulesSubDir)) {
          try {
            const rFiles = fs.readdirSync(rulesSubDir);
            for (const rf of rFiles) {
              if (rf.endsWith('.md')) {
                const fullRulePath = path.join(rulesSubDir, rf);
                checkAndAdd(fullRulePath, rf, scope);
              }
            }
          } catch (e) {}
        }
      }

      // Check permission config files
      const configCandidates = [
        path.join(currentScanDir, '.gemini', 'settings.json'),
        path.join(currentScanDir, '.gemini', 'permissions.json'),
        path.join(currentScanDir, '.agents', 'settings.json')
      ];
      for (const cfg of configCandidates) {
        if (fs.existsSync(cfg)) {
          const deprecated = findDeprecatedUnsandboxedRules(cfg);
          if (deprecated.length > 0) {
            checkAndAdd(cfg, path.basename(cfg), scope);
          }
        }
      }

      if (gitRootDir && currentScanDir === path.resolve(gitRootDir)) {
        break;
      }
      const parentDir = path.dirname(currentScanDir);
      if (parentDir === currentScanDir) break;
      currentScanDir = parentDir;
    }
  }

  // Global rule locations
  const globalAgents = path.join(os.homedir(), '.gemini', 'AGENTS.md');
  checkAndAdd(globalAgents, 'AGENTS.md', 'global');

  const globalGemini = path.join(os.homedir(), '.gemini', 'GEMINI.md');
  checkAndAdd(globalGemini, 'GEMINI.md', 'global');

  const globalRuleDirs = [
    path.join(os.homedir(), '.gemini', 'config', 'rules'),
    path.join(os.homedir(), '.gemini', 'rules'),
    path.join(os.homedir(), '.agents', 'rules'),
    path.join(os.homedir(), '.agent', 'rules')
  ];

  for (const gDir of globalRuleDirs) {
    if (fs.existsSync(gDir)) {
      try {
        const gFiles = fs.readdirSync(gDir);
        for (const gf of gFiles) {
          if (gf.endsWith('.md')) {
            const fullPath = path.join(gDir, gf);
            checkAndAdd(fullPath, gf, 'global');
          }
        }
      } catch (e) {}
    }
  }

  // Global config files
  const globalConfigCandidates = [
    path.join(os.homedir(), '.gemini', 'settings.json'),
    path.join(os.homedir(), '.gemini', 'permissions.json'),
    path.join(os.homedir(), '.agents', 'settings.json')
  ];
  for (const gcfg of globalConfigCandidates) {
    if (fs.existsSync(gcfg)) {
      const deprecated = findDeprecatedUnsandboxedRules(gcfg);
      if (deprecated.length > 0) {
        checkAndAdd(gcfg, path.basename(gcfg), 'global');
      }
    }
  }

  const deprecatedDetails: Array<{ file: string; rules: string[]; fix: string }> = [];
  let totalDeprecated = 0;

  for (const r of discovered) {
    if (r.hasDeprecatedRules && r.deprecatedRules.length > 0) {
      totalDeprecated += r.deprecatedRules.length;
      deprecatedDetails.push({
        file: r.path,
        rules: r.deprecatedRules,
        fix: 'Replace "unsandboxed" with "command" (e.g. command(git status)), or remove the rule. Edit file directly or use /permissions.'
      });
    }
  }

  return {
    cwd: path.resolve(cwd),
    rules: discovered,
    totalActive: discovered.length,
    totalDeprecated,
    deprecatedDetails
  };
}

/**
 * Formats inspection results as an actionable GitHub-flavored markdown report.
 */
export function formatRulesReport(result: RulesInspectionResult): string {
  const lines: string[] = [];

  lines.push('# 📜 Active Workspace Rules & Permissions Audit Report');
  lines.push('');
  lines.push(`- **Scan Root**: \`${result.cwd}\``);
  lines.push(`- **Total Active Rules**: **${result.totalActive}**`);
  lines.push(`- **Deprecated Permission Rules**: **${result.totalDeprecated}**`);
  lines.push('');

  lines.push('## 1. Discovered Rules & Directives');
  lines.push('');

  if (result.rules.length === 0) {
    lines.push('*No active rule files found in current workspace or global paths.*');
  } else {
    lines.push('| Rule File | Scope | Path | Status / Directives |');
    lines.push('| :--- | :---: | :--- | :--- |');

    for (const r of result.rules) {
      const encoded = r.path.split('/').map(encodeURIComponent).join('/');
      const link = `[${r.name}](file://${encoded})`;
      const statusBadge = r.hasDeprecatedRules
        ? `⚠️ **${r.deprecatedRules.length} deprecated rule(s)** - ${r.summary || 'Directives'}`
        : `✅ ${r.summary || 'Active'}`;
      lines.push(`| \`${r.name}\` | \`${r.scope}\` | ${link} | ${statusBadge} |`);
    }
  }

  lines.push('');

  if (result.totalDeprecated > 0) {
    lines.push('## 2. ⚠️ Deprecated Permission Rule Warnings (`agy 1.2.2+`)');
    lines.push('');
    lines.push('> [!WARNING]');
    lines.push('> Antigravity CLI 1.2.2+ deprecates `unsandboxed` permission rules in favor of explicit `command` rules.');
    lines.push('');

    for (const detail of result.deprecatedDetails) {
      lines.push(`### File: \`${detail.file}\``);
      lines.push('**Offending Rules:**');
      for (const rule of detail.rules) {
        lines.push(`- \`${rule}\``);
      }
      lines.push(`**Fix**: ${detail.fix}`);
      lines.push('');
    }
  }

  lines.push('## 3. Health Check Verdict');
  lines.push('');
  if (result.totalDeprecated === 0) {
    lines.push('🟢 **All active instruction sets and permissions are modern and compliant with agy 1.2.2+**.');
  } else {
    lines.push(`🟡 **Found ${result.totalDeprecated} deprecated "unsandboxed" rule(s)** across configuration files. Migrate them to "command" rules.`);
  }

  return lines.join('\n');
}

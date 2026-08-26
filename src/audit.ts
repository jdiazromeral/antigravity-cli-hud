import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as cp from 'child_process';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { SKILL_ICONS } from './formatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TelemetryGap {
  field: string;
  status: 'implemented' | 'experimental' | 'missing';
  note?: string;
}

export interface MissingSkillIcon {
  name: string;
  declaredIcon?: string | undefined;
  location: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
}

export interface AuditResult {
  binaryPath: string;
  binaryVersion: string;
  binaryHash: string;
  changelogSnippet: string;
  discoveredSubcommands: string[];
  discoveredFlags: string[];
  telemetryStructs: string[];
  telemetryJsonTags: string[];
  telemetryGaps: TelemetryGap[];
  missingSkillIcons: MissingSkillIcon[];
  recommendations: Recommendation[];
}

export function findAgyBinaryPath(): string {
  if (process.env.AGY_BIN_PATH && fs.existsSync(process.env.AGY_BIN_PATH)) {
    return path.resolve(process.env.AGY_BIN_PATH);
  }

  const commonPaths = [
    path.join(os.homedir(), '.local', 'bin', 'agy'),
    '/usr/local/bin/agy',
    '/opt/homebrew/bin/agy',
    '/usr/bin/agy'
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }

  try {
    const whichOut = cp.execSync('which agy', { encoding: 'utf8' }).trim();
    if (whichOut && fs.existsSync(whichOut)) return whichOut;
  } catch {}

  return commonPaths[0]!;
}

export function extractBinaryStrings(binPath: string): string[] {
  if (!fs.existsSync(binPath)) return [];
  try {
    const out = cp.execFileSync('strings', [binPath], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    });
    return out.split('\n').map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function extractSubcommandsAndFlags(binPath: string): { subcommands: string[], flags: string[] } {
  const subcommands: string[] = [];
  const flags: string[] = [];

  if (!fs.existsSync(binPath)) return { subcommands, flags };

  try {
    const res = cp.spawnSync(binPath, ['--help'], { encoding: 'utf8' });
    const helpOut = (res.stdout || '') + '\n' + (res.stderr || '');
    const lines = helpOut.split('\n');

    let inSubcommands = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('Available subcommands:')) {
        inSubcommands = true;
        continue;
      }
      if (inSubcommands) {
        if (!trimmed) continue;
        const match = trimmed.match(/^([a-z0-9-]+)\s+/);
        if (match && match[1]) {
          subcommands.push(match[1]);
        }
      } else {
        const flagMatch = trimmed.match(/^--([a-z0-9-]+)/);
        if (flagMatch && flagMatch[1]) {
          flags.push(`--${flagMatch[1]}`);
        }
      }
    }
  } catch {}

  return {
    subcommands: Array.from(new Set(subcommands)).sort(),
    flags: Array.from(new Set(flags)).sort()
  };
}

export function extractTelemetryStructsAndTags(stringsList: string[]): { structs: string[], tags: string[] } {
  const structSet = new Set<string>();
  const tagSet = new Set<string>();

  for (const s of stringsList) {
    // Go statusline structs & symbols
    const structMatches = s.match(/(StatusLine[A-Za-z0-9_]+)/g);
    if (structMatches) {
      for (const m of structMatches) structSet.add(m);
    }

    // Go JSON tags
    const tagMatches = s.match(/json:"([a-z0-9_]+)"/g);
    if (tagMatches) {
      for (const tm of tagMatches) {
        const key = tm.replace('json:"', '').replace('"', '');
        tagSet.add(key);
      }
    }
  }

  return {
    structs: Array.from(structSet).sort(),
    tags: Array.from(tagSet).sort()
  };
}

export function auditMissingSkillIcons(): MissingSkillIcon[] {
  const missing: MissingSkillIcon[] = [];
  const searchDirs = [
    path.join(os.homedir(), '.gemini', 'config', 'plugins'),
    path.join(os.homedir(), '.gemini', 'skills'),
    path.join(os.homedir(), '.gemini', 'antigravity-cli', 'builtin', 'skills')
  ];

  const registeredSkills = new Set(Object.keys(SKILL_ICONS).map(s => s.toLowerCase()));

  for (const baseDir of searchDirs) {
    if (!fs.existsSync(baseDir)) continue;
    try {
      const walkSkills = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const skillFile = path.join(fullPath, 'SKILL.md');
            if (fs.existsSync(skillFile)) {
              const skillName = entry.name.toLowerCase();
              let icon: string | undefined = undefined;
              try {
                const content = fs.readFileSync(skillFile, 'utf8');
                const match = content.match(/icon:\s*([^\r\n]+)/);
                if (match && match[1]) icon = match[1].trim();
              } catch {}

              if (!registeredSkills.has(skillName)) {
                missing.push({
                  name: entry.name,
                  declaredIcon: icon,
                  location: skillFile
                });
              }
            } else {
              walkSkills(fullPath);
            }
          }
        }
      };
      walkSkills(baseDir);
    } catch {}
  }

  return missing;
}

export function auditTelemetryGaps(discoveredTags: string[]): TelemetryGap[] {
  // Read parser.ts / index.js to inspect active known payload keys
  const candidateParserPaths = [
    path.resolve(__dirname, 'parser.ts'),
    path.resolve(__dirname, 'parser.js'),
    path.resolve(__dirname, '../src/parser.ts'),
    path.resolve(process.cwd(), 'src/parser.ts'),
    path.resolve(process.cwd(), 'src/parser.js'),
    path.join(os.homedir(), '.gemini', 'config', 'plugins', 'hud', 'dist', 'index.js')
  ];
  let parserContent = '';
  for (const p of candidateParserPaths) {
    if (fs.existsSync(p)) {
      parserContent = fs.readFileSync(p, 'utf8');
      break;
    }
  }

  const candidateTelemetryKeys = [
    'agent_state', 'model', 'context_window', 'cost', 'total_usd', 'subagent_usd',
    'estimated', 'quota', 'subagents', 'vcs', 'vim', 'voice', 'audio', 'mic_serve',
    'credits', 'dangerously_skip_permissions', 'task_count', 'plan_tier', 'editor_mode'
  ];

  const gaps: TelemetryGap[] = [];

  for (const key of candidateTelemetryKeys) {
    const inBinary = discoveredTags.includes(key);
    const inParser = parserContent.includes(key);

    if (inBinary && inParser) {
      if (key === 'voice' || key === 'mic_serve' || key === 'audio') {
        gaps.push({ field: key, status: 'experimental', note: 'Implemented via experimental block & forward-compatible schema' });
      } else {
        gaps.push({ field: key, status: 'implemented', note: 'Fully parsed and rendered in HUD' });
      }
    } else if (inBinary && !inParser) {
      gaps.push({ field: key, status: 'missing', note: 'Discovered in binary JSON tags but missing from AntigravityPayload' });
    }
  }

  return gaps;
}

export function auditAgy(binPath: string = findAgyBinaryPath()): AuditResult {
  const binaryExists = fs.existsSync(binPath);
  let version = 'unknown';
  let hash = '';
  let changelog = '';

  if (binaryExists) {
    try {
      const verOut = cp.execFileSync(binPath, ['--version'], { encoding: 'utf8' }).trim();
      version = verOut || 'unknown';
    } catch {}

    try {
      const buf = fs.readFileSync(binPath);
      hash = crypto.createHash('sha256').update(buf).digest('hex').substring(0, 12);
    } catch {}

    try {
      const clOut = cp.execFileSync(binPath, ['changelog'], { encoding: 'utf8', timeout: 2000 });
      changelog = clOut.split('\n').slice(0, 20).join('\n').trim();
    } catch {}
  }

  const { subcommands, flags } = extractSubcommandsAndFlags(binPath);
  const stringsList = extractBinaryStrings(binPath);
  const { structs, tags } = extractTelemetryStructsAndTags(stringsList);
  const telemetryGaps = auditTelemetryGaps(tags);
  const missingSkillIcons = auditMissingSkillIcons();

  const recommendations: Recommendation[] = [];

  const missingFields = telemetryGaps.filter(g => g.status === 'missing');
  if (missingFields.length > 0) {
    recommendations.push({
      priority: 'high',
      title: `Implement Missing Telemetry Fields (${missingFields.map(f => f.field).join(', ')})`,
      detail: `New telemetry fields discovered in ${binPath} should be added to AntigravityPayload in src/parser.ts.`
    });
  }

  if (missingSkillIcons.length > 0) {
    recommendations.push({
      priority: 'medium',
      title: `Brand Missing Skills in SKILL_ICONS (${missingSkillIcons.length} skills)`,
      detail: `Add icon mappings in src/formatter.ts for: ${missingSkillIcons.map(s => s.name).join(', ')}.`
    });
  }

  if (subcommands.includes('mic-serve') && !telemetryGaps.some(g => g.field === 'mic_serve' && g.status === 'implemented')) {
    recommendations.push({
      priority: 'low',
      title: 'Maintain Remote Audio Streaming Support',
      detail: 'Keep /hud:voice skill up-to-date with agy mic-serve flags and port configurations.'
    });
  }

  return {
    binaryPath: binPath,
    binaryVersion: version,
    binaryHash: hash,
    changelogSnippet: changelog,
    discoveredSubcommands: subcommands,
    discoveredFlags: flags,
    telemetryStructs: structs,
    telemetryJsonTags: tags,
    telemetryGaps,
    missingSkillIcons,
    recommendations
  };
}

export function formatAuditReport(res: AuditResult): string {
  const lines: string[] = [];

  lines.push('# 🔍 Antigravity CLI vs HUD Telemetry Audit Report');
  lines.push('');
  lines.push(`- **Target Binary**: \`${res.binaryPath}\``);
  lines.push(`- **Detected Version**: **${res.binaryVersion}** (SHA: \`${res.binaryHash || 'unknown'}\`)`);
  lines.push(`- **Audit Timestamp**: ${new Date().toISOString()}`);
  lines.push('');

  lines.push('## 1. 📡 Telemetry Payload & Schema Gaps');
  lines.push('| Field / Struct | Status in HUD | Details / Action |');
  lines.push('| :--- | :---: | :--- |');
  for (const g of res.telemetryGaps) {
    const icon = g.status === 'implemented' ? '✅ Implemented' : (g.status === 'experimental' ? '🧪 Experimental' : '❌ Missing');
    lines.push(`| \`${g.field}\` | ${icon} | ${g.note || ''} |`);
  }
  lines.push('');

  if (res.missingSkillIcons.length > 0) {
    lines.push('## 2. 🎨 Unregistered Skill Icons');
    lines.push('| Skill Name | Declared Icon | Location |');
    lines.push('| :--- | :---: | :--- |');
    for (const s of res.missingSkillIcons) {
      lines.push(`| **${s.name}** | ${s.declaredIcon || '*(none)*'} | \`${s.location}\` |`);
    }
    lines.push('');
  } else {
    lines.push('## 2. 🎨 Skill Icon Branding');
    lines.push('✅ All installed and ecosystem skills have mapped emoji branding in `SKILL_ICONS`.');
    lines.push('');
  }

  lines.push('## 3. 🧩 Discovered CLI Subcommands & Flags');
  lines.push(`- **Available Subcommands (${res.discoveredSubcommands.length})**: ${res.discoveredSubcommands.map(s => `\`${s}\``).join(', ')}`);
  lines.push(`- **Key CLI Flags (${res.discoveredFlags.length})**: ${res.discoveredFlags.map(f => `\`${f}\``).join(', ')}`);
  lines.push('');

  if (res.recommendations.length > 0) {
    lines.push('## 4. 🎯 Actionable Upgrade Plan');
    for (let i = 0; i < res.recommendations.length; i++) {
      const r = res.recommendations[i]!;
      const badge = r.priority === 'high' ? '🔴 High Priority' : (r.priority === 'medium' ? '🟡 Medium Priority' : '🟢 Low Priority');
      lines.push(`### Option ${i + 1}: ${r.title} (${badge})`);
      lines.push(r.detail);
      lines.push('');
    }
  } else {
    lines.push('## 4. 🎯 Actionable Upgrade Plan');
    lines.push('🎉 **HUD is 100% in parity with the active Antigravity CLI binary! No telemetry gaps detected.**');
    lines.push('');
  }

  if (res.changelogSnippet) {
    lines.push('## 📜 Latest CLI Changelog');
    lines.push('```text');
    lines.push(res.changelogSnippet);
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

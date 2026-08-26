import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as cp from 'child_process';
import type { ParsedMetrics } from './parser.js';

export interface ModelSpendSummary {
  model: string;
  sessions: number;
  tokens: number;
  costUsd: number;
}

export interface WorkspaceSpendSummary {
  workspace: string;
  sessions: number;
  costUsd: number;
}

export interface SpendStats {
  todayUsd: number;
  todaySubagentUsd: number;
  todaySessions: number;
  weekUsd: number;
  weekSessions: number;
  allTimeUsd: number;
  allTimeSessions: number;
  totalInputTokens: number;
  totalCacheTokens: number;
  cacheHitPercentage: number;
  models: ModelSpendSummary[];
  workspaces: WorkspaceSpendSummary[];
}

export function getLedgerDbPath(): string {
  if (process.env.HUD_LEDGER_DB_PATH) {
    return path.resolve(process.env.HUD_LEDGER_DB_PATH);
  }
  return path.join(os.homedir(), '.gemini', 'hud_ledger.db');
}

function sanitizeSqlString(str: unknown): string {
  if (typeof str !== 'string') return '';
  return str.replace(/'/g, "''").replace(/[\x00-\x1f\x7f]/g, '');
}

export function getInitDbSql(): string {
  return `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS session_spend (
  conversation_id TEXT PRIMARY KEY,
  session_name TEXT,
  workspace TEXT,
  model TEXT,
  cost_usd REAL DEFAULT 0.0,
  subagent_usd REAL DEFAULT 0.0,
  is_estimated INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  cache_tokens INTEGER DEFAULT 0,
  step_count INTEGER DEFAULT 0,
  started_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_session_spend_updated ON session_spend(updated_at);
CREATE INDEX IF NOT EXISTS idx_session_spend_workspace ON session_spend(workspace);
CREATE INDEX IF NOT EXISTS idx_session_spend_model ON session_spend(model);
`.trim();
}

export function initLedgerDb(dbPath: string = getLedgerDbPath()): boolean {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    const sql = getInitDbSql();
    cp.execFileSync('sqlite3', [dbPath, sql], { stdio: 'pipe', timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

export function buildUpsertSql(metrics: ParsedMetrics): string | null {
  if (!metrics.conversationId || !metrics.cost) return null;
  const totalUsd = typeof metrics.cost.totalUsd === 'number' && !isNaN(metrics.cost.totalUsd) ? metrics.cost.totalUsd : 0;
  if (totalUsd <= 0 && (!metrics.cost.subagentUsd || metrics.cost.subagentUsd <= 0)) {
    return null;
  }

  const convId = sanitizeSqlString(metrics.conversationId);
  const sessName = sanitizeSqlString(metrics.sessionName || 'unknown');
  const workspace = sanitizeSqlString(metrics.workspace || 'unknown');
  const model = sanitizeSqlString(metrics.model || 'unknown');
  const subagentUsd = typeof metrics.cost.subagentUsd === 'number' && !isNaN(metrics.cost.subagentUsd) ? metrics.cost.subagentUsd : 0.0;
  const isEstimated = metrics.cost.estimated ? 1 : 0;
  const inputTokens = Math.max(0, Math.round(metrics.totalInputTokens || 0));
  const cacheTokens = Math.max(0, Math.round(metrics.cacheTokens || 0));
  const stepCount = Math.max(0, Math.round(metrics.stepCount || 0));
  const nowUnix = Math.floor(Date.now() / 1000);

  return `
INSERT INTO session_spend (
  conversation_id, session_name, workspace, model, cost_usd, subagent_usd,
  is_estimated, input_tokens, cache_tokens, step_count, started_at, updated_at
) VALUES (
  '${convId}', '${sessName}', '${workspace}', '${model}', ${totalUsd}, ${subagentUsd},
  ${isEstimated}, ${inputTokens}, ${cacheTokens}, ${stepCount}, ${nowUnix}, ${nowUnix}
)
ON CONFLICT(conversation_id) DO UPDATE SET
  session_name = excluded.session_name,
  workspace = excluded.workspace,
  model = excluded.model,
  cost_usd = excluded.cost_usd,
  subagent_usd = excluded.subagent_usd,
  is_estimated = excluded.is_estimated,
  input_tokens = excluded.input_tokens,
  cache_tokens = excluded.cache_tokens,
  step_count = excluded.step_count,
  updated_at = excluded.updated_at;
`.trim();
}

export function recordSessionSpendAsync(metrics: ParsedMetrics, dbPath: string = getLedgerDbPath()): void {
  const sql = buildUpsertSql(metrics);
  if (!sql) return;

  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    const fullSql = `${getInitDbSql()}\n${sql}`;
    const child = cp.spawn('sqlite3', [dbPath, fullSql], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
  } catch {}
}

export function parseMultipleJsonArrays(raw: string): any[][] {
  const results: any[][] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '[') {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === ']') {
        depth--;
        if (depth === 0 && start !== -1) {
          const chunk = raw.slice(start, i + 1);
          try {
            results.push(JSON.parse(chunk));
          } catch {}
          start = -1;
        }
      }
    }
  }
  return results;
}

export function querySpendStats(dbPath: string = getLedgerDbPath()): SpendStats {
  const emptyStats: SpendStats = {
    todayUsd: 0,
    todaySubagentUsd: 0,
    todaySessions: 0,
    weekUsd: 0,
    weekSessions: 0,
    allTimeUsd: 0,
    allTimeSessions: 0,
    totalInputTokens: 0,
    totalCacheTokens: 0,
    cacheHitPercentage: 0,
    models: [],
    workspaces: []
  };

  if (!fs.existsSync(dbPath)) return emptyStats;

  try {
    initLedgerDb(dbPath);
    const querySql = `
SELECT
  (SELECT COALESCE(SUM(cost_usd), 0.0) FROM session_spend WHERE date(updated_at, 'unixepoch', 'localtime') = date('now', 'localtime')) AS today_usd,
  (SELECT COALESCE(SUM(subagent_usd), 0.0) FROM session_spend WHERE date(updated_at, 'unixepoch', 'localtime') = date('now', 'localtime')) AS today_subagent_usd,
  (SELECT COUNT(*) FROM session_spend WHERE date(updated_at, 'unixepoch', 'localtime') = date('now', 'localtime')) AS today_sessions,
  (SELECT COALESCE(SUM(cost_usd), 0.0) FROM session_spend WHERE updated_at >= strftime('%s', 'now', '-7 days')) AS week_usd,
  (SELECT COUNT(*) FROM session_spend WHERE updated_at >= strftime('%s', 'now', '-7 days')) AS week_sessions,
  (SELECT COALESCE(SUM(cost_usd), 0.0) FROM session_spend) AS all_time_usd,
  (SELECT COUNT(*) FROM session_spend) AS all_time_sessions,
  (SELECT COALESCE(SUM(input_tokens), 0) FROM session_spend) AS total_input_tokens,
  (SELECT COALESCE(SUM(cache_tokens), 0) FROM session_spend) AS total_cache_tokens;

SELECT model, COUNT(*) as sessions, COALESCE(SUM(input_tokens), 0) as tokens, COALESCE(SUM(cost_usd), 0.0) as cost_usd
FROM session_spend
GROUP BY model
ORDER BY cost_usd DESC;

SELECT workspace, COUNT(*) as sessions, COALESCE(SUM(cost_usd), 0.0) as cost_usd
FROM session_spend
GROUP BY workspace
ORDER BY cost_usd DESC
LIMIT 10;
`.trim();

    const output = cp.execFileSync('sqlite3', ['-json', dbPath, querySql], { encoding: 'utf8', timeout: 2000 });
    const jsonBlocks = parseMultipleJsonArrays(output);

    if (jsonBlocks.length >= 1) {
      const summaryArr = jsonBlocks[0] || [];
      if (summaryArr.length > 0) {
        const s = summaryArr[0];
        emptyStats.todayUsd = Number(s.today_usd) || 0;
        emptyStats.todaySubagentUsd = Number(s.today_subagent_usd) || 0;
        emptyStats.todaySessions = Number(s.today_sessions) || 0;
        emptyStats.weekUsd = Number(s.week_usd) || 0;
        emptyStats.weekSessions = Number(s.week_sessions) || 0;
        emptyStats.allTimeUsd = Number(s.all_time_usd) || 0;
        emptyStats.allTimeSessions = Number(s.all_time_sessions) || 0;
        emptyStats.totalInputTokens = Number(s.total_input_tokens) || 0;
        emptyStats.totalCacheTokens = Number(s.total_cache_tokens) || 0;

        const totalContext = emptyStats.totalInputTokens + emptyStats.totalCacheTokens;
        emptyStats.cacheHitPercentage = totalContext > 0
          ? Math.round((emptyStats.totalCacheTokens / totalContext) * 1000) / 10
          : 0;
      }
    }

    if (jsonBlocks.length >= 2) {
      const modelsArr = jsonBlocks[1] || [];
      emptyStats.models = modelsArr.map((m: any) => ({
        model: String(m.model || 'Unknown'),
        sessions: Number(m.sessions) || 0,
        tokens: Number(m.tokens) || 0,
        costUsd: Number(m.cost_usd) || 0
      }));
    }

    if (jsonBlocks.length >= 3) {
      const workspacesArr = jsonBlocks[2] || [];
      emptyStats.workspaces = workspacesArr.map((w: any) => ({
        workspace: String(w.workspace || 'Unknown'),
        sessions: Number(w.sessions) || 0,
        costUsd: Number(w.cost_usd) || 0
      }));
    }

    return emptyStats;
  } catch {
    return emptyStats;
  }
}

export function formatSpendStatsReport(stats: SpendStats): string {
  const lines: string[] = [];

  lines.push('# 📊 Antigravity AI Spend & Token Efficiency Report');
  lines.push('');
  lines.push('## 💰 Financial Overview');
  lines.push(`- **Today's Spend**: $${stats.todayUsd.toFixed(3)} across ${stats.todaySessions} session(s)${stats.todaySubagentUsd > 0 ? ` (subagents: $${stats.todaySubagentUsd.toFixed(3)})` : ''}`);
  lines.push(`- **Last 7 Days Spend**: $${stats.weekUsd.toFixed(3)} across ${stats.weekSessions} session(s)`);
  lines.push(`- **All-Time Recorded Spend**: $${stats.allTimeUsd.toFixed(3)} across ${stats.allTimeSessions} session(s)`);
  lines.push('');

  lines.push('## ⚡ Prompt Cache Efficiency');
  const inputK = (stats.totalInputTokens / 1000).toFixed(1);
  const cacheK = (stats.totalCacheTokens / 1000).toFixed(1);
  lines.push(`- **Input Tokens**: ${inputK}k tokens`);
  lines.push(`- **Cached Read Tokens**: ${cacheK}k tokens`);
  lines.push(`- **Overall Cache Hit Rate**: **${stats.cacheHitPercentage}%** (prompt cache cost savings active)`);
  lines.push('');

  if (stats.models.length > 0) {
    lines.push('## 🤖 Spend by Model Tier');
    lines.push('| Model | Recorded Sessions | Input Tokens | Total Spend ($) |');
    lines.push('| :--- | :---: | :---: | :---: |');
    for (const m of stats.models) {
      lines.push(`| **${m.model}** | ${m.sessions} | ${(m.tokens / 1000).toFixed(1)}k | $${m.costUsd.toFixed(4)} |`);
    }
    lines.push('');
  }

  if (stats.workspaces.length > 0) {
    lines.push('## 📂 Spend by Workspace / Project');
    lines.push('| Workspace | Recorded Sessions | Total Spend ($) |');
    lines.push('| :--- | :---: | :---: |');
    for (const w of stats.workspaces) {
      lines.push(`| \`${w.workspace}\` | ${w.sessions} | $${w.costUsd.toFixed(4)} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

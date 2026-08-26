import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import {
  getInitDbSql,
  buildUpsertSql,
  initLedgerDb,
  querySpendStats,
  formatSpendStatsReport,
  type SpendStats
} from './ledger.js';
import type { ParsedMetrics } from './parser.js';

describe('SQLite Spend Ledger Engine (src/ledger.ts)', () => {
  const tmpDir = os.tmpdir();
  const testDbPath = path.join(tmpDir, `test_hud_ledger_${Date.now()}_${Math.random().toString(36).substring(2)}.db`);

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  afterEach(() => {
    for (const ext of ['', '-wal', '-shm', '-journal']) {
      const p = `${testDbPath}${ext}`;
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch {}
      }
    }
  });

  it('generates valid initialization SQL', () => {
    const sql = getInitDbSql();
    expect(sql).toContain('PRAGMA journal_mode = WAL;');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS session_spend');
    expect(sql).toContain('idx_session_spend_updated');
  });

  it('builds upsert SQL correctly for valid metrics and returns null for zero/empty metrics', () => {
    const validMetrics: ParsedMetrics = {
      conversationId: 'conv-abc-123',
      sessionName: 'feature-session',
      workspace: 'lab/antigravity-cli-hud',
      model: 'Gemini 3.1 Pro',
      totalInputTokens: 50000,
      cacheTokens: 150000,
      stepCount: 10,
      cost: {
        totalUsd: 0.0425,
        subagentUsd: 0.012,
        estimated: true
      }
    } as any;

    const sql = buildUpsertSql(validMetrics);
    expect(sql).not.toBeNull();
    expect(sql).toContain('conv-abc-123');
    expect(sql).toContain('feature-session');
    expect(sql).toContain('lab/antigravity-cli-hud');
    expect(sql).toContain('Gemini 3.1 Pro');
    expect(sql).toContain('0.0425');
    expect(sql).toContain('0.012');
    expect(sql).toContain('ON CONFLICT(conversation_id) DO UPDATE SET');

    // Should return null if no conversationId
    const noConvId = { ...validMetrics, conversationId: undefined };
    expect(buildUpsertSql(noConvId as any)).toBeNull();

    // Should return null if cost is zero and subagentUsd is zero
    const zeroCost = { ...validMetrics, cost: { totalUsd: 0, subagentUsd: 0 } };
    expect(buildUpsertSql(zeroCost as any)).toBeNull();
  });

  it('initializes the SQLite ledger database file on disk with WAL mode', () => {
    const success = initLedgerDb(testDbPath);
    expect(success).toBe(true);
    expect(fs.existsSync(testDbPath)).toBe(true);

    const schemaOut = cp.execFileSync('sqlite3', [testDbPath, '.schema'], { encoding: 'utf8' });
    expect(schemaOut).toContain('CREATE TABLE session_spend');
  });

  it('records session spend and computes accurate analytics via querySpendStats', () => {
    initLedgerDb(testDbPath);

    // Insert 2 sample sessions
    const nowUnix = Math.floor(Date.now() / 1000);
    const sqlInsert = `
INSERT INTO session_spend VALUES ('c1', 'sess1', 'lab/hud', 'Gemini 3.1 Pro', 0.050, 0.010, 0, 40000, 160000, 8, ${nowUnix}, ${nowUnix});
INSERT INTO session_spend VALUES ('c2', 'sess2', 'lab/hud', 'Gemini 3.6 Flash', 0.015, 0.000, 1, 60000, 240000, 12, ${nowUnix}, ${nowUnix});
INSERT INTO session_spend VALUES ('c3', 'sess3', 'lab/other', 'Gemini 3.6 Flash', 0.020, 0.005, 0, 50000, 50000, 5, ${nowUnix}, ${nowUnix});
`;
    cp.execFileSync('sqlite3', [testDbPath, sqlInsert]);

    const stats = querySpendStats(testDbPath);
    expect(stats.todaySessions).toBe(3);
    expect(stats.todayUsd).toBeCloseTo(0.085, 4);
    expect(stats.todaySubagentUsd).toBeCloseTo(0.015, 4);
    expect(stats.weekUsd).toBeCloseTo(0.085, 4);
    expect(stats.allTimeUsd).toBeCloseTo(0.085, 4);

    expect(stats.totalInputTokens).toBe(150000);
    expect(stats.totalCacheTokens).toBe(450000);
    // 450k / (150k + 450k) = 75.0%
    expect(stats.cacheHitPercentage).toBe(75);

    expect(stats.models).toHaveLength(2);
    expect(stats.models[0]?.model).toBe('Gemini 3.1 Pro');
    expect(stats.models[0]?.costUsd).toBeCloseTo(0.050, 4);
    expect(stats.models[1]?.model).toBe('Gemini 3.6 Flash');
    expect(stats.models[1]?.costUsd).toBeCloseTo(0.035, 4);

    expect(stats.workspaces).toHaveLength(2);
    expect(stats.workspaces[0]?.workspace).toBe('lab/hud');
    expect(stats.workspaces[0]?.costUsd).toBeCloseTo(0.065, 4);
  });

  it('formats spend stats into a clean markdown report via formatSpendStatsReport', () => {
    const mockStats: SpendStats = {
      todayUsd: 0.085,
      todaySubagentUsd: 0.015,
      todaySessions: 3,
      weekUsd: 1.25,
      weekSessions: 12,
      allTimeUsd: 5.42,
      allTimeSessions: 45,
      totalInputTokens: 250000,
      totalCacheTokens: 750000,
      cacheHitPercentage: 75.0,
      models: [
        { model: 'Gemini 3.1 Pro', sessions: 20, tokens: 150000, costUsd: 3.50 },
        { model: 'Gemini 3.6 Flash', sessions: 25, tokens: 100000, costUsd: 1.92 }
      ],
      workspaces: [
        { workspace: 'lab/antigravity-cli-hud', sessions: 30, costUsd: 4.10 },
        { workspace: 'lab/authz-go', sessions: 15, costUsd: 1.32 }
      ]
    };

    const report = formatSpendStatsReport(mockStats);
    expect(report).toContain('# 📊 Antigravity AI Spend & Token Efficiency Report');
    expect(report).toContain('**Today\'s Spend**: $0.085 across 3 session(s) (subagents: $0.015)');
    expect(report).toContain('**Last 7 Days Spend**: $1.250 across 12 session(s)');
    expect(report).toContain('**Overall Cache Hit Rate**: **75%**');
    expect(report).toContain('| **Gemini 3.1 Pro** | 20 | 150.0k | $3.5000 |');
    expect(report).toContain('| `lab/antigravity-cli-hud` | 30 | $4.1000 |');
  });

  it('handles non-existent database file gracefully without throwing', () => {
    const fakePath = '/non/existent/path/never_created.db';
    const stats = querySpendStats(fakePath);
    expect(stats.allTimeUsd).toBe(0);
    expect(stats.todaySessions).toBe(0);
    expect(stats.models).toEqual([]);
  });
});

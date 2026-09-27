import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  extractTelemetryStructsAndTags,
  auditTelemetryGaps,
  formatAuditReport,
  auditAgy,
  auditMissingSkillIcons
} from './audit.js';
import type { AuditResult } from './audit.js';

describe('AGY Binary & Telemetry Audit Engine', () => {
  it('extracts Go statusline structs and JSON tags from binary strings', () => {
    const mockStrings = [
      'google3/third_party/jetski/cli/types/types.StatusLineCost',
      'google3/third_party/jetski/cli/types/types.StatusLineModelInfo',
      'google3/third_party/jetski/cli/store/store.BuildStatusLineData',
      'TotalUSDojson:"total_usd"',
      'SubagentUSDojson:"subagent_usd"',
      'Estimatedojson:"estimated"',
      'Voiceojson:"voice"',
      'Audioojson:"audio"'
    ];

    const { structs, tags } = extractTelemetryStructsAndTags(mockStrings);

    expect(structs).toContain('StatusLineCost');
    expect(structs).toContain('StatusLineModelInfo');
    expect(structs).toContain('StatusLineData');
    expect(tags).toContain('total_usd');
    expect(tags).toContain('subagent_usd');
    expect(tags).toContain('estimated');
    expect(tags).toContain('voice');
    expect(tags).toContain('audio');
  });

  it('extracts Go struct tags with omitempty and omitzero options', () => {
    const mockStrings = [
      'ToolConfirmationPending*json:"tool_confirmation_pending,omitempty"',
      'PendingInputCountojson:"pending_input_count,omitempty"',
      'CycleModeojson:"cycle_mode,omitempty"',
      'Battleojson:"battle,omitempty"',
      'FocusedArmojson:"focused_arm"',
      'Effortojson:"effort,omitzero"'
    ];

    const { tags } = extractTelemetryStructsAndTags(mockStrings);

    expect(tags).toContain('tool_confirmation_pending');
    expect(tags).toContain('pending_input_count');
    expect(tags).toContain('cycle_mode');
    expect(tags).toContain('battle');
    expect(tags).toContain('focused_arm');
    expect(tags).toContain('effort');
  });

  it('accurately categorizes implemented vs experimental vs missing telemetry gaps', () => {
    const discoveredTags = ['agent_state', 'conversation_title', 'model', 'cost', 'total_usd', 'voice', 'audio', 'non_existent_future_metric'];
    const gaps = auditTelemetryGaps(discoveredTags);

    const agentState = gaps.find(g => g.field === 'agent_state');
    expect(agentState).toBeDefined();
    expect(agentState?.status).toBe('implemented');

    const convTitle = gaps.find(g => g.field === 'conversation_title');
    expect(convTitle).toBeDefined();
    expect(convTitle?.status).toBe('implemented');

    const voice = gaps.find(g => g.field === 'voice');
    expect(voice).toBeDefined();
    expect(voice?.status).toBe('experimental');
  });

  it('detects tool_confirmation_pending, cycle_mode, pending_input_count, battle in telemetry gaps', () => {
    const discoveredTags = ['tool_confirmation_pending', 'cycle_mode', 'pending_input_count', 'battle'];
    const gaps = auditTelemetryGaps(discoveredTags);

    expect(gaps.some(g => g.field === 'tool_confirmation_pending')).toBe(true);
    expect(gaps.some(g => g.field === 'cycle_mode')).toBe(true);
    expect(gaps.some(g => g.field === 'pending_input_count')).toBe(true);
    expect(gaps.some(g => g.field === 'battle')).toBe(true);
  });

  it('resolves and traverses symlinked plugin directories in auditMissingSkillIcons', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hud-symlink-test-'));
    try {
      const realPluginDir = path.join(tmpDir, 'real-plugin');
      const skillDir = path.join(realPluginDir, 'skills', 'unregistered-symlink-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: unregistered-symlink-skill\nicon: 🛸\n---\nTest skill');

      const pluginsDir = path.join(tmpDir, 'plugins');
      fs.mkdirSync(pluginsDir, { recursive: true });
      const symlinkPath = path.join(pluginsDir, 'symlinked-plugin');
      fs.symlinkSync(realPluginDir, symlinkPath, 'dir');

      const missing = auditMissingSkillIcons([pluginsDir]);
      expect(missing.some(m => m.name === 'unregistered-symlink-skill')).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('formats a structured markdown audit report', () => {
    const mockResult: AuditResult = {
      binaryPath: '/test/bin/agy',
      binaryVersion: '1.1.21',
      binaryHash: 'abc123456789',
      changelogSnippet: '1.1.21: Added voice dictation',
      discoveredSubcommands: ['mic-serve', 'mcp', 'plugin'],
      discoveredFlags: ['--effort', '--mode'],
      telemetryStructs: ['StatusLineCost', 'StatusLineData'],
      telemetryJsonTags: ['cost', 'total_usd', 'voice'],
      telemetryGaps: [
        { field: 'cost', status: 'implemented', note: 'Live cost block' },
        { field: 'voice', status: 'experimental', note: 'Experimental voice block' }
      ],
      missingSkillIcons: [
        { name: 'unregistered-skill', declaredIcon: '🚀', location: '/path/SKILL.md' }
      ],
      recommendations: [
        { priority: 'high', title: 'Implement Quick Wins', detail: 'Update schema' }
      ]
    };

    const report = formatAuditReport(mockResult);
    expect(report).toContain('# 🔍 Antigravity CLI vs HUD Telemetry Audit Report');
    expect(report).toContain('1.1.21');
    expect(report).toContain('`cost`');
    expect(report).toContain('✅ Implemented');
    expect(report).toContain('`voice`');
    expect(report).toContain('🧪 Experimental');
    expect(report).toContain('unregistered-skill');
    expect(report).toContain('mic-serve');
    expect(report).toContain('Option 1: Implement Quick Wins (🔴 High Priority)');
  });

  it('runs end-to-end auditAgy against the live system binary if present', () => {
    const res = auditAgy();
    expect(res).toBeDefined();
    expect(typeof res.binaryVersion).toBe('string');
    expect(Array.isArray(res.discoveredSubcommands)).toBe(true);
    expect(Array.isArray(res.telemetryGaps)).toBe(true);
    expect(Array.isArray(res.recommendations)).toBe(true);
  });
});

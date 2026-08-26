export { parseStream, formatToolActionSummary } from './parser.js';
export type { ParsedMetrics, AntigravityPayload, SubagentInfo, CostInfo } from './parser.js';
export { formatMetrics, HUD_CONFIG, SKILL_ICONS, formatCostAmount } from './formatter.js';
export type { CustomBlockConfig, HudConfig } from './formatter.js';
export { querySpendStats, formatSpendStatsReport, recordSessionSpendAsync, getLedgerDbPath, initLedgerDb } from './ledger.js';
export type { SpendStats, ModelSpendSummary, WorkspaceSpendSummary } from './ledger.js';
import { parseStream as _parseStream } from './parser.js';
import { formatMetrics as _formatMetrics } from './formatter.js';
import { recordSessionSpendAsync as _recordSessionSpendAsync } from './ledger.js';

async function main() {
  try {
    const metrics = await _parseStream(process.stdin);
    const width = process.stdout.columns || 80;

    // Asynchronously update historical spend ledger in background without blocking render loop
    _recordSessionSpendAsync(metrics);
    
    const output = _formatMetrics(metrics, width);
    process.stdout.write(output, () => {
      process.exit(0);
    });
  } catch (err) {
    // Ironclad Fallback - if parsing fails, never crash the hook!
    // A crash (exit code != 0) will permanently disable the HUD in Antigravity.
    const fallback = `╭─ 󰚩 HUD Warning | Parsing payload...\n `;
    process.stdout.write(fallback, () => {
      process.exit(0);
    });
  }
}

// Ensure the CLI runs when executed directly
main();


export { parseStream, ParsedMetrics, AntigravityPayload, SubagentInfo } from './parser.js';
export { formatMetrics, HUD_CONFIG } from './formatter.js';
import { parseStream as _parseStream } from './parser.js';
import { formatMetrics as _formatMetrics } from './formatter.js';

async function main() {
  try {
    const metrics = await _parseStream(process.stdin);
    const width = process.stdout.columns || 80;
    
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


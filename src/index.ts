import { parseStream } from './parser.js';
import { formatMetrics } from './formatter.js';

async function main() {
  try {
    const metrics = await parseStream(process.stdin);
    // Use stdout columns to provide terminal width, fallback to 80
    const width = process.stdout.columns || 80;
    
    const output = formatMetrics(metrics, width);
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

main();

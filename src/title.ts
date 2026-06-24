import { parseStream } from './parser.js';

async function main() {
  try {
    const metrics = await parseStream(process.stdin);
    const gitPart = metrics.gitBranches && metrics.gitBranches.length > 0 ? `(${metrics.gitBranches.map((g: any) => g.branch).join('&')}) ` : '';
    const statePart = metrics.agentState === 'IDLE' ? '🟢 IDLE' : (metrics.agentState === 'WAITING' ? '🟡 WAITING' : `🔵 ${metrics.agentState}`);
    const title = `agy - ${metrics.workspace} ${gitPart}[${metrics.model}] ${statePart}`;
    process.stdout.write(title, () => {
      process.exit(0);
    });
  } catch (err) {
    // Fallback title on error
    process.stdout.write('agy HUD', () => {
      process.exit(0);
    });
  }
}

main();

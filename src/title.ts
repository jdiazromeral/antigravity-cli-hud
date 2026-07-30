import { parseStream } from './parser.js';

async function main() {
  try {
    const metrics = await parseStream(process.stdin);
    let gitPart = '';
    if (metrics.gitBranches && metrics.gitBranches.length > 0) {
      if (metrics.gitBranches.length === 1) {
        const single = metrics.gitBranches[0];
        const label = single.name === metrics.workspace ? single.branch : `${single.name}:${single.branch}`;
        gitPart = `(${label}) `;
      } else {
        const labels = metrics.gitBranches.map((g: any) => `${g.name}:${g.branch}`).join(' & ');
        gitPart = `(${labels}) `;
      }
    }
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

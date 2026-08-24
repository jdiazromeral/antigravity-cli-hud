import { parseStream, ParsedMetrics } from './parser.js';

export function formatTitle(metrics: Partial<ParsedMetrics> & { workspace: string; model: string; agentState: string }): string {
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

  const toolPrefix = (metrics.activeTool && metrics.activeTool.name) ? `[🛠️ ${metrics.activeTool.name}] ` : '';
  const stepPart = (metrics.stepCount !== undefined && metrics.stepCount > 0) ? ` [👟 ${metrics.stepCount}/${metrics.maxSteps || 20}]` : '';
  const statePart = metrics.agentState === 'IDLE' ? '🟢 IDLE' : (metrics.agentState === 'WAITING' ? '🟡 WAITING' : `🔵 ${metrics.agentState}`);
  return `${toolPrefix}agy - ${metrics.workspace} ${gitPart}[${metrics.model}]${stepPart} ${statePart}`;
}

async function main() {
  try {
    const metrics = await parseStream(process.stdin);
    const title = formatTitle(metrics);
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

// Only run main if executed directly
if (process.argv[1] && process.argv[1].endsWith('title.js')) {
  main();
}


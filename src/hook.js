import { parseStream } from './dist/index.js';
import { formatMetrics } from './dist/index.js';

async function run() {
  try {
    const metrics = await parseStream(process.stdin);
    const width = process.stdout.columns || 80;
    process.stdout.write(formatMetrics(metrics, width));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();

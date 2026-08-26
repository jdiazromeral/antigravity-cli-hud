#!/usr/bin/env node
import { querySpendStats, formatSpendStatsReport } from './ledger.js';

function main() {
  const args = process.argv.slice(2);
  const stats = querySpendStats();

  if (args.includes('--json')) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  if (args.includes('--summary')) {
    console.log(`💲 Today: $${stats.todayUsd.toFixed(3)} | Week: $${stats.weekUsd.toFixed(3)} | Cache: ${stats.cacheHitPercentage}%`);
    return;
  }

  console.log(formatSpendStatsReport(stats));
}

main();

#!/usr/bin/env node
import { inspectRules, formatRulesReport } from './rules.js';

function main() {
  const args = process.argv.slice(2);
  const cwdOverride = args.find(a => !a.startsWith('-'));
  const result = inspectRules(cwdOverride || process.cwd());

  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(formatRulesReport(result));
}

main();

#!/usr/bin/env node
import { auditAgy, formatAuditReport } from './audit.js';

function main() {
  const args = process.argv.slice(2);
  const binOverride = args.find(a => !a.startsWith('-'));
  const result = auditAgy(binOverride);

  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(formatAuditReport(result));
}

main();

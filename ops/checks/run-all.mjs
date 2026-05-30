#!/usr/bin/env node
// run-all.mjs — the Kendama factory-level check runner.
//
// Run at session start as part of ops/loop.md's brain-reconciliation
// step:
//
//     node ops/checks/run-all.mjs
//
// Dependency-free: needs only a Node runtime, no npm install, so it
// works on a fresh clone before any product toolchain is set up.
//
// Exit code 0 = no blocking (P0/P1) findings. Exit code 1 = at least
// one blocking finding; the session must address it before pulling
// other queue items (a brain/guardrail integrity failure is the
// highest-priority queue item per ops/loop.md).
//
// GUARDRAILS.md #1-2: this runner is invoked by the Kendama session
// itself, never by CI. Do not wire it into any workflow.

import { BLOCKING_LEVELS } from './lib.mjs';
import * as ruleCadence from './rule-cadence-consistency.mjs';
import * as brainIntegrity from './brain-integrity.mjs';
import * as noGithubActions from './no-github-actions.mjs';
import * as humanQueue from './human-queue.mjs';

const CHECKS = [brainIntegrity, noGithubActions, ruleCadence, humanQueue];

const ICON = { P0: '✗', P1: '✗', P2: '!', info: '·' };

async function main() {
  let blocking = 0;
  let total = 0;

  console.log('Kendama factory checks\n');

  for (const check of CHECKS) {
    let result;
    try {
      result = await check.run();
    } catch (err) {
      console.log(`  ✗ ${check.name} — check threw: ${err.message}`);
      blocking++;
      continue;
    }
    const { name, findings } = result;
    const blockingHere = findings.filter((f) => BLOCKING_LEVELS.has(f.level));
    const header = blockingHere.length === 0 ? 'PASS' : 'FAIL';
    console.log(`  [${header}] ${name}`);
    for (const f of findings) {
      total += f.level === 'info' ? 0 : 1;
      if (BLOCKING_LEVELS.has(f.level)) blocking++;
      console.log(`      ${ICON[f.level] ?? '?'} ${f.level}: ${f.message}`);
    }
    console.log('');
  }

  if (blocking > 0) {
    console.log(`RESULT: ${blocking} blocking finding(s). Address before pulling other queue items (ops/loop.md priority 1-3).`);
    process.exit(1);
  }
  console.log(`RESULT: all checks passed${total > 0 ? ` (${total} non-blocking note(s))` : ''}.`);
  process.exit(0);
}

main();

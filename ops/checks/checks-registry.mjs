// checks-registry.mjs — meta-check: the factory-check ROSTER stays wired.
//
// Every time a new check is added, it must be (a) registered in run-all.mjs's
// CHECKS array and (b) documented in README.md. This session's consistency
// audit found the roster correctly wired, but nothing ENFORCED it — a future
// added-but-unregistered check would silently never run. Per 5.7.3 (the net
// guarding the roster grows with the roster), this meta-check closes that gap.
//
// Pure file/text inspection — dependency-free, safe at session start.

import { listFiles, readText, finding } from './lib.mjs';

export const name = 'checks-registry';

// Infrastructure files in ops/checks that are NOT themselves run-all checks.
const NON_CHECKS = new Set([
  'lib.mjs',
  'run-all.mjs',
  'checks.test.mjs',
  // stop-guard is the STOP-TIME red team (P0-by-design on Saturday) — it is
  // deliberately not in run-all; its LOGIC is covered by stop-guard-logic,
  // which IS a registered check. Both are excluded from the "must be in
  // run-all" rule here (stop-guard by design; this meta-check itself too).
  'stop-guard.mjs',
  'checks-registry.mjs',
]);

export function analyze(checkFiles, runAllSrc, readmeSrc) {
  const findings = [];
  for (const file of checkFiles) {
    const base = file.split('/').pop();
    if (NON_CHECKS.has(base)) continue;
    const mod = base.replace(/\.mjs$/, '');
    // (a) imported + present in run-all (the import line uses the file name).
    if (!runAllSrc.includes(`'./${base}'`)) {
      findings.push(
        finding('P1', `${file} is a check but is NOT imported in run-all.mjs — it would silently never run at session start. Register it in the CHECKS array.`),
      );
    }
    // (b) documented in the README roster (rows reference the check name in backticks).
    if (!readmeSrc.includes(`\`${mod}\``)) {
      findings.push(
        finding('P2', `${file} is a check but is not documented in ops/checks/README.md (the roster table). Add a row.`),
      );
    }
  }
  if (findings.length === 0) {
    findings.push(finding('info', 'Factory-check roster is fully wired: every check is registered in run-all and documented in the README.'));
  }
  return findings;
}

export function run() {
  const checkFiles = listFiles('ops/checks').filter((f) => f.endsWith('.mjs'));
  const runAllSrc = readText('ops/checks/run-all.mjs');
  const readmeSrc = readText('ops/checks/README.md');
  return { name, findings: analyze(checkFiles, runAllSrc, readmeSrc) };
}

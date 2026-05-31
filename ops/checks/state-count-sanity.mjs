// state-count-sanity.mjs — guards the ONE canonical current-test-count
// headline in brain/STATE.md against the drift class that recurred on
// 2026-05-30 (a mangled "288/312 tests" left by a batch reconciliation;
// repeated stale "330"/"312" while the true count moved).
//
// DELIBERATELY NARROW (see SELF_IMPROVEMENT #8's caveat): it does NOT run the
// test suite (too slow for session start) and does NOT scan free narrative
// (legitimate history like "226 -> 385" must not trip it). It checks only the
// single canonical headline line:
//
//     - **Build green:** **NNN/NNN tests** ...
//
// Invariants: exactly one such headline exists, and its two numbers are equal
// (X/X = a passing suite; X/Y with X!=Y is either a real red suite that must
// not be described as "green", or a mangled edit).

import { readText, finding } from './lib.mjs';

export const name = 'state-count-sanity';

const HEADLINE_RE = /Build green:\*\*\s*\*\*(\d+)\/(\d+)\s*tests\*\*/g;

export function analyze(stateText) {
  const findings = [];
  const matches = [...stateText.matchAll(HEADLINE_RE)];
  if (matches.length === 0) {
    findings.push(
      finding('P2', "brain/STATE.md has no canonical `Build green: **NNN/NNN tests**` headline — the current-state test count is the one derived fact the next session relies on; keep exactly one."),
    );
    return findings;
  }
  if (matches.length > 1) {
    findings.push(
      finding('P2', `brain/STATE.md has ${matches.length} \`Build green: **NNN/NNN tests**\` headlines — keep exactly one canonical current-state line (extra ones drift stale).`),
    );
  }
  for (const m of matches) {
    const passed = Number(m[1]);
    const total = Number(m[2]);
    if (passed !== total) {
      findings.push(
        finding('P1', `brain/STATE.md "Build green" headline says ${passed}/${total} tests — a "green" headline must have passed === total. Either the suite is RED (do not call it green) or this is a mangled count (the 2026-05-30 "288/312" drift class).`),
      );
    }
  }
  if (findings.length === 0) {
    findings.push(finding('info', `STATE.md current-test-count headline is well-formed (${matches[0][1]}/${matches[0][2]}).`));
  }
  return findings;
}

export function run() {
  return { name, findings: analyze(readText('brain/STATE.md')) };
}

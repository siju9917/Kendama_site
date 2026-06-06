// state-count-sanity.mjs — guards the ONE canonical current-test-count
// headline in brain/STATE.md against the drift class that recurred on
// 2026-05-30 (a mangled "288/312 tests" left by a batch reconciliation;
// repeated stale "330"/"312" while the true count moved).
//
// APPROVALS.md stale-count detection (SELF_IMPROVEMENT #12): We scan the Open
// proposals section for X/X tests mentions that are LESS than the counts in the
// BUILD SEQUENCE block for that same product — specifically, a count that is
// lower than a LATER count in the same proposal (since test counts are
// monotonically non-decreasing within a product). This avoids false-positives
// from product-specific counts that are lower than the global STATE.md total
// (e.g., "345/345 tests" for openapi-lens Phase 0 is NOT stale even when the
// global total is 931 — it is product-scoped).
//
// Practical implementation for the most common case: look for a proposal that
// mentions "Phase 0 complete" with a count N < the openapi-lens count in
// STATE.md's per-product breakdown, by scanning for the known pattern
// "**NNN/NNN tests** passing (N adversarial hardening rounds" and comparing
// against the max count found in STATE.md's session work list.
//
// DELIBERATELY NARROW (see SELF_IMPROVEMENT #8's caveat): it does NOT run the
// test suite (too slow for session start) and does NOT scan free narrative
// (legitimate history like "226 -> 385" must not trip it). STATE.md check
// applies only to the single canonical headline line:
//
//     - **Build green:** **NNN/NNN tests** ...
//
// Invariants: exactly one such headline exists, and its two numbers are equal
// (X/X = a passing suite; X/Y with X!=Y is either a real red suite that must
// not be described as "green", or a mangled edit).

import { readText, finding } from './lib.mjs';

export const name = 'state-count-sanity';

const HEADLINE_RE = /Build green:\*\*\s*\*\*(\d+)\/(\d+)\s*tests\*\*/g;
// Matches "**NNN/NNN tests** passing (N adversarial hardening rounds" — the
// Phase-0-complete claim pattern in APPROVALS.md proposals.
const PHASE0_CLAIM_RE = /\*\*(\d+)\/(\d+)\s+tests\*\*\s+passing\s+\(\d+\s+adversarial\s+hardening\s+rounds/g;
// Matches "openapi-lens: NNN/NNN" in STATE.md session work / test-count breakdowns.
const OPENAPI_COUNT_RE = /openapi-lens\s+\d+\/\d+.*?(\d{3,4})\/\1/g;

export function analyze(stateText, approvalsText) {
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

  // Cross-validate APPROVALS.md Phase-0-complete claim (SELF_IMPROVEMENT #12).
  // Extract the openapi-lens count from STATE.md's per-product breakdown line.
  if (approvalsText) {
    const closedIdx = approvalsText.search(/^##\s+Closed proposals/m);
    const openSection = closedIdx >= 0 ? approvalsText.slice(0, closedIdx) : approvalsText;
    // Find the current openapi-lens count from STATE.md (e.g. "openapi-lens 345/345")
    const olMatch = stateText.match(/openapi-lens\s+(\d+)\/(\d+)/);
    const currentOlCount = olMatch ? Number(olMatch[1]) : null;

    if (currentOlCount !== null) {
      for (const m of openSection.matchAll(PHASE0_CLAIM_RE)) {
        const claimedCount = Number(m[1]);
        if (claimedCount < currentOlCount) {
          findings.push(
            finding('P2', `human/APPROVALS.md open proposals claim openapi-lens Phase 0 has "${m[0].slice(0, 30)}..." (${claimedCount} tests) but STATE.md shows ${currentOlCount} tests for openapi-lens — stale Phase-0-complete count in proposal (the 2026-06-06 "91→345" drift class). Update to current count.`),
          );
        }
      }
    }
  }

  if (findings.length === 0) {
    findings.push(finding('info', `STATE.md current-test-count headline is well-formed (${matches[0][1]}/${matches[0][2]}).`));
  }
  return findings;
}

export function run() {
  let approvalsText;
  try { approvalsText = readText('human/APPROVALS.md'); } catch { /* optional */ }
  return { name, findings: analyze(readText('brain/STATE.md'), approvalsText) };
}

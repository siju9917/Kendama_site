// stop-guard-logic.mjs — session-start check that the STOP-GUARD'S OWN LOGIC
// is sound, evaluated against SYNTHETIC instants (never the live clock, so it
// is safe to run at session start unlike stop-guard.mjs itself).
//
// Why this exists: on 2026-05-30 the stop-guard computed the weekday in UTC
// instead of the human's Mountain-Time work window, so on a Saturday evening
// MT (already Sunday UTC) it wrongly authorized a stop — a false session-end.
// That bug passed every session-start check because nothing verified the
// guard's *logic* at session start (only checks.test.mjs did, which run-all
// does not invoke). Per 5.7.3, the defect leaves behind a check that would
// have caught it: this asserts the guard refuses/permits correctly at the
// timezone boundary that bit us.

import { finding } from './lib.mjs';
import { redTeamStop, hookDecision, weekdayInZone } from './stop-guard.mjs';

export const name = 'stop-guard-logic';

// Fixed UTC instants with a known Mountain-Time weekday.
const SAT_NOON_MT = new Date('2026-05-30T18:00:00Z'); // Sat 12:00 MDT
const SAT_EVENING_MT = new Date('2026-05-31T00:48:00Z'); // Sat 18:48 MDT == Sun 00:48 UTC
const SUN_NOON_MT = new Date('2026-05-31T18:00:00Z'); // Sun 12:00 MDT

function isRefused(now) {
  return redTeamStop(now).some((f) => f.level === 'P0');
}

export function analyze() {
  const findings = [];

  // Precondition: the boundary instant really is Sunday in UTC but Saturday
  // in Mountain Time — otherwise the regression below proves nothing.
  if (SAT_EVENING_MT.getUTCDay() !== 0) {
    findings.push(finding('P1', `stop-guard-logic: test fixture wrong — ${SAT_EVENING_MT.toISOString()} should be Sunday in UTC.`));
  }
  if (weekdayInZone(SAT_EVENING_MT) !== 'Saturday') {
    findings.push(finding('P0', `stop-guard regression: ${SAT_EVENING_MT.toISOString()} is Saturday evening in Mountain Time but weekdayInZone() returned "${weekdayInZone(SAT_EVENING_MT)}". The work window must be evaluated in America/Denver, not UTC (CLAUDE.md 5x).`));
  }

  // 1. Saturday (clearly, in MT) → REFUSE.
  if (!isRefused(SAT_NOON_MT)) {
    findings.push(finding('P0', 'stop-guard regression: a stop on Saturday noon MT was NOT refused.'));
  }
  // 2. THE BOUNDARY: Saturday evening MT (== Sunday UTC) → must still REFUSE.
  if (!isRefused(SAT_EVENING_MT)) {
    findings.push(finding('P0', 'stop-guard regression: a stop on Saturday EVENING Mountain time (already Sunday in UTC) was authorized — the UTC-vs-local timezone bug has returned (CLAUDE.md 5x).'));
  }
  // 3. Sunday (in MT) → PERMIT (no P0).
  if (isRefused(SUN_NOON_MT)) {
    findings.push(finding('P0', 'stop-guard regression: a stop on Sunday noon MT was refused — the guard never authorizes a legitimate stop.'));
  }
  // 4. The hook adapter must mirror the red team at the boundary.
  if (hookDecision(SAT_EVENING_MT).decision !== 'block') {
    findings.push(finding('P0', 'stop-guard hook regression: hookDecision did not BLOCK on Saturday evening MT.'));
  }
  if (Object.keys(hookDecision(SUN_NOON_MT)).length !== 0) {
    findings.push(finding('P0', 'stop-guard hook regression: hookDecision did not allow the stop on Sunday MT.'));
  }

  if (findings.length === 0) {
    findings.push(finding('info', 'stop-guard logic sound: refuses on Saturday (incl. Saturday-evening-MT / Sunday-UTC boundary), permits on Sunday; hook mirrors it.'));
  }
  return findings;
}

export function run() {
  return { name, findings: analyze() };
}

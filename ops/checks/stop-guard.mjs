// stop-guard.mjs — the red team on every stop attempt.
//
// The human's rule (2026-05-30): the ONLY acceptable reason for the
// operator to stop its own work is "stopping because it is no longer
// Saturday" (the schedule window has closed). Before any operator-
// initiated stop, the operator states that reason and this guard
// ADVERSARIALLY verifies it against the real system clock. If the claim
// is false — i.e. it is still Saturday (the work window) — the guard
// returns a P0 violation and the operator MUST NOT stop: it discards the
// stop and pulls the next queue item.
//
// This is deliberately a *different mandate against the claim itself*
// (cf. CLAUDE.md 5.7.8): the operator asserts "I can stop"; the guard
// independently checks the date and refuses to take the assertion on
// trust. "I'm out of work" / "diminishing returns" / "it's a good
// checkpoint" are NOT the reason and are not even evaluated — the only
// question is whether it is genuinely no longer Saturday.
//
// Exit code 0 = stopping is permitted (it is genuinely not Saturday).
// Exit code 1 = STOP REFUSED (still Saturday / work window open).
//
// Usage:
//   node ops/checks/stop-guard.mjs            # report current status
//   node ops/checks/stop-guard.mjs --stopping # assert a stop; red-team it

import { finding } from './lib.mjs';

export const name = 'stop-guard';

/**
 * The work window is Saturday (the scheduled Routine day). Computed in UTC
 * from the real clock — NOT from any operator-supplied value, so the
 * operator cannot talk its way past it. Returns the red-team verdict.
 */
export function redTeamStop(now = new Date(), claimedReason = '') {
  const dow = now.getUTCDay(); // 0=Sun .. 6=Sat
  const isSaturday = dow === 6;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[dow];
  const findings = [];

  if (isSaturday) {
    // The only valid stop claim is "no longer Saturday" — and it is FALSE.
    findings.push(
      finding(
        'P0',
        `STOP REFUSED. The system clock says it is ${today} (${now.toISOString()}), i.e. still the Saturday work window. The only permitted stop reason is "it is no longer Saturday" and that claim is FALSE. Per CLAUDE.md 5z / GUARDRAILS #16: do NOT stop, do NOT summarize-and-wait, do NOT ask to continue — discard the stop and pull the next queue item.`,
      ),
    );
    // Address an operator trying to launder a different reason through the
    // permitted phrasing.
    if (claimedReason && !/no longer saturday|not saturday|schedule window (closed|ended)/i.test(claimedReason)) {
      findings.push(
        finding('P0', `Rejected stop reason: "${claimedReason}". The ONLY acceptable operator-stop reason is "it is no longer Saturday" — every other reason (queue exhausted, diminishing returns, gated, natural checkpoint) is a guardrail violation.`),
      );
    }
    return findings;
  }

  // Not Saturday → the schedule window has genuinely closed; stopping is
  // legitimate (write the digest first, per the session-end sequence).
  findings.push(
    finding('info', `Stop permitted: it is ${today} (${now.toISOString()}) — no longer the Saturday work window. Complete the session-end sequence (consolidate brain + WEEKLY_DIGEST) before exiting.`),
  );
  return findings;
}

export function run() {
  return { name, findings: redTeamStop(new Date()) };
}

// CLI: red-team an actual stop attempt and exit non-zero if refused.
if (import.meta.url === `file://${process.argv[1]}`) {
  const stopping = process.argv.includes('--stopping');
  const reasonArg = process.argv.find((a) => a.startsWith('--reason='));
  const reason = reasonArg ? reasonArg.slice('--reason='.length) : '';
  const findings = redTeamStop(new Date(), reason);
  const refused = findings.some((f) => f.level === 'P0');
  for (const f of findings) console.log(`${f.level}: ${f.message}`);
  if (stopping && refused) {
    console.log('\n=> STOP REFUSED by the red team. Keep working.');
    process.exit(1);
  }
  process.exit(refused ? 1 : 0);
}

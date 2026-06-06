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

import { finding, exists } from './lib.mjs';

export const name = 'stop-guard';

/**
 * Human kill-switch (added 2026-06-06, human-approved — see
 * human/APPROVALS.md and brain/DECISIONS.md). If human/ROUTINE_DISABLED.md is
 * present, the human has PAUSED autonomous Saturday operation: the stop red
 * team stands down and permits stopping regardless of weekday, so the
 * `.claude/settings.json` Stop hook no longer forces all-day work. This is the
 * no-approval, in-repo off-switch for the runaway Routine (it was generating a
 * flood of Render build-failure emails). Re-arming = the human deletes the
 * file (a session must not delete it itself).
 *
 * Deliberately kept OUT of the pure redTeamStop()/hookDecision() weekday logic
 * (which the logic tests pin against synthetic instants) and applied only at
 * the live CLI boundary below, so pausing the Routine never alters the
 * verified Saturday-vs-Sunday logic.
 */
export function routineDisabled() {
  return exists('human/ROUTINE_DISABLED.md');
}

/**
 * The schedule window is the HUMAN's local Saturday. The human runs in
 * Mountain Time (America/Denver), so the work day must be evaluated in that
 * timezone — NOT in UTC. This matters at the boundary: e.g. Sat 18:48 MDT is
 * already Sun 00:48 UTC, so a UTC weekday check would (wrongly) report Sunday
 * and authorize a stop while it is still Saturday evening for the human. The
 * weekday is derived from the real clock — NOT from any operator-supplied
 * value — so the operator cannot talk its way past it.
 *
 * Override only for testing via KENDAMA_TZ; defaults to America/Denver.
 */
const WORK_TZ = process.env.KENDAMA_TZ || 'America/Denver';

/** The weekday name in the work timezone for an absolute instant. */
export function weekdayInZone(now = new Date(), timeZone = WORK_TZ) {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(now);
}

/** A human-readable local timestamp in the work timezone, for messages. */
function localStamp(now, timeZone = WORK_TZ) {
  // Explicit fields (not dateStyle/timeStyle) so timeZoneName can be included
  // — Intl rejects combining the style shortcuts with timeZoneName.
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(now);
}

export function redTeamStop(now = new Date(), claimedReason = '') {
  const today = weekdayInZone(now); // weekday in the human's timezone
  const isSaturday = today === 'Saturday';
  const findings = [];

  if (isSaturday) {
    // The only valid stop claim is "no longer Saturday" — and it is FALSE.
    findings.push(
      finding(
        'P0',
        `STOP REFUSED. It is ${localStamp(now)} — still the Saturday work window in the human's timezone (${WORK_TZ}). The only permitted stop reason is "it is no longer Saturday" and that claim is FALSE. Per CLAUDE.md 5z / GUARDRAILS #16: do NOT stop, do NOT summarize-and-wait, do NOT ask to continue — discard the stop and pull the next queue item. (Note: this is evaluated in ${WORK_TZ}, NOT UTC — a Saturday evening in Mountain time is already Sunday in UTC, and a UTC check would wrongly authorize a stop.)`,
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

  // Not Saturday in the work timezone → the schedule window has genuinely
  // closed; stopping is legitimate (write the digest first, per the
  // session-end sequence).
  findings.push(
    finding('info', `Stop permitted: it is ${localStamp(now)} (${WORK_TZ}) — no longer the Saturday work window. Complete the session-end sequence (consolidate brain + WEEKLY_DIGEST) before exiting.`),
  );
  return findings;
}

export function run() {
  return { name, findings: redTeamStop(new Date()) };
}

/**
 * Claude Code `Stop`-hook adapter. The hook fires whenever the agent tries
 * to end a turn; this turns the red team into a TECHNICAL INTERLOCK, not a
 * rule the operator must remember. On Saturday it emits the block decision
 * (forcing the agent to keep working); otherwise it allows the stop. The
 * `stop_hook_active` payload flag is intentionally ignored — on Saturday we
 * block every time (that is the entire point: never stop on Saturday). The
 * platform's hard duration limit remains the real backstop.
 */
export function hookDecision(now = new Date()) {
  const refused = redTeamStop(now).some((f) => f.level === 'P0');
  if (refused) {
    return {
      decision: 'block',
      reason:
        'STOP BLOCKED by the stop-guard red team: it is still Saturday (the work window). Per CLAUDE.md 5x you may NOT stop — do not summarize, do not wait, do not ask to continue. Pull the next item from the standing work source in ops/loop.md (hardening, fuzzing, first-principles ideation, playbooks, factory self-improvement, docs, polish, "nothing is ever done" reviews) and keep working. Only "it is no longer Saturday" authorizes a stop.',
    };
  }
  return {}; // not Saturday → allow the stop
}

// CLI: --hook (Stop-hook adapter, JSON out) | --stopping (manual red-team).
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--hook')) {
    // Human kill-switch: if the Routine is disabled, never block a stop.
    if (routineDisabled()) {
      process.stdout.write(JSON.stringify({}));
      process.exit(0);
    }
    // Drain stdin (the hook payload) but we only need the real clock.
    let buf = '';
    process.stdin.on('data', (d) => (buf += d));
    process.stdin.on('end', () => {
      void buf;
      process.stdout.write(JSON.stringify(hookDecision(new Date())));
      process.exit(0); // exit 0; the JSON `decision` does the blocking
    });
    // If no stdin is piped, still emit a decision promptly.
    setTimeout(() => {
      process.stdout.write(JSON.stringify(hookDecision(new Date())));
      process.exit(0);
    }, 250);
  } else {
    if (routineDisabled()) {
      console.log('info: Autonomous Saturday operation is DISABLED by the human (human/ROUTINE_DISABLED.md present). Stop permitted; the build loop must not run, and no auto commit/push. Delete that file to re-arm Saturday enforcement.');
      process.exit(0);
    }
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
}

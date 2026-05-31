# ops/checks — Kendama factory-level checks

Automated integrity checks for the **factory itself** (the brain,
the governance documents, the guardrails) — distinct from any
product's own test suite.

These exist because, until now, every consistency invariant of the
factory (brain files present, no GitHub Actions, the 5.7.N rules in
sync with their cadences) was policed only by human attention or by
the META loop reading files by hand. That is exactly the kind of
silent drift `SELF_IMPROVEMENT.md` #6 and #7 were written to close.

## Running

From the repository root:

```bash
node ops/checks/run-all.mjs          # run every check, human-readable report
node --test ops/checks/checks.test.mjs   # run the checks' own test suite
```

`run-all.mjs` exits `0` when there are no blocking (P0/P1) findings
and `1` otherwise.

## When they run

At **session start**, as part of `ops/loop.md`'s brain-reconciliation
step (queue priority 1). A blocking finding is the highest-priority
queue item — the factory fixes brain/guardrail integrity before
pulling anything else.

They are **dependency-free** (Node ESM + `node:test`, no `npm
install`, no build step) so they run on a fresh Saturday clone before
any product toolchain is installed.

## Hard constraint (GUARDRAILS.md #1-2)

This is **not** a CI surface. It is run by the Kendama session itself.
It must never be wired into GitHub Actions or any other CI scheduler.
The `no-github-actions` check enforces this for the whole repo.

## The checks

| Check | Enforces | Highest level |
|---|---|---|
| `brain-integrity` | Every load-bearing brain/governance/human file exists, is non-empty, and `STATE.md` keeps its handoff sections (PART 2.4). | P0 |
| `no-github-actions` | No `.github/workflows/` and no CI-scheduler config (GUARDRAILS.md #1-2). | P0 |
| `rule-cadence-consistency` | The `5.7.N` maximization rules in `CLAUDE.md` are contiguous, each has an operational home in `ops/loop.md`/`CRITIQUE_AGENTS.md`, and no doc references a non-existent rule (SELF_IMPROVEMENT.md #6). | P0/P1 |
| `human-queue` | `human/NEED_FROM_HUMAN.md` items are uniquely numbered and contiguous from 1 (the check-in walks the list by number). Added after a real duplicate-`## 4.` defect. | P1/P2 |
| `no-forbidden-markers` | No `TODO`/`FIXME`/`XXX`/`HACK` in any product's shipped `src/` (GUARDRAILS #10) — unless recorded as a documented human-gated blocker. Excludes tests; avoids `XX.XXX`-style false positives. | P1 |
| `governance-integrity` | No corruption of factory markdown (`CLAUDE.md`, `governance/`, `ops/`, `brain/`): leaked operator narration ("there appears to be an issue…", "let me read it directly", "as an AI") or the same substantial line repeated 3+× (mangled-edit signature). Added after a real `ops/loop.md` corruption. | P1 |
| `stop-guard-logic` | The stop-guard's own logic is sound, checked against **synthetic** instants (never the live clock): it refuses a stop on Saturday — including the Saturday-evening-MT / Sunday-UTC boundary — and permits one on Sunday, in the human's timezone (`America/Denver`). Added after a real UTC-vs-local-time bug caused a false session-end (CLAUDE.md 5x). | P0 |
| `checks-registry` | Meta-check: every `ops/checks/*.mjs` check (excluding the known infrastructure files) is registered in `run-all.mjs`'s `CHECKS` array and documented in this README. Prevents an added-but-unregistered check from silently never running. | P1/P2 |

### The stop-guard red team (separate — run at STOP time, not session start)

`stop-guard.mjs` is **not** in `run-all` (it is P0-by-design while it is
Saturday, which is the whole point — it must not block the session-start
gate). It is the red team on every stop attempt (CLAUDE.md 5x): the only
permitted operator-stop reason is "it is no longer Saturday," and this
guard verifies that claim against the **real system clock**, not the
operator's word.

```bash
node ops/checks/stop-guard.mjs --stopping   # exit 1 (REFUSED) while it is Saturday
```

Before contemplating any stop, the operator runs it; exit 1 ⇒ discard the
stop and pull the next queue item.

#### Technical interlock: the Claude Code `Stop` hook

Beyond the manual `--stopping` check, the red team is wired into a
Claude Code **`Stop` hook** (`.claude/settings.json`) so it is not a rule
the operator must *remember* — it fires automatically on every turn-end
attempt:

```bash
node ops/checks/stop-guard.mjs --hook   # reads the hook payload on stdin,
                                        # writes the Stop-hook decision JSON
```

On Saturday `hookDecision()` returns `{"decision":"block","reason":…}`,
which Claude Code honours by refusing the stop and feeding the reason back
to the operator (forcing it to pull the next queue item). Once it is no
longer Saturday it returns `{}` and the stop proceeds. The platform's hard
duration limit remains the real backstop; the spend cap is the budget
backstop. Removing the hook is a *weakening* change — log it in
`human/APPROVALS.md` (GUARDRAILS #12).

## Adding a check

1. Create `ops/checks/<name>.mjs` that exports `name` (string) and
   `run()` returning `{ name, findings: Finding[] }`. A `Finding` is
   `{ level: 'P0'|'P1'|'P2'|'info', message: string }` — use the
   `finding()` helper in `lib.mjs`. P0/P1 are blocking.
2. Prefer separating pure analysis from file I/O (see
   `rule-cadence-consistency.mjs`'s `analyze()`) so the logic is unit
   testable on synthetic input.
3. Register it in the `CHECKS` array in `run-all.mjs`.
4. Add tests to `checks.test.mjs`: synthetic failure cases plus a
   regression assertion that the real repo passes.
5. The roster of checks only grows — same spirit as the critique
   roster (Section 5.7.3). A new class of factory defect should
   leave behind a check that would have caught it.

# SELF_IMPROVEMENT.md — ranked backlog of factory self-improvements

> The META loop (PART 11) works the top of this list every cycle.
> Each item is a proposed improvement to the factory itself —
> brain structure, loops, critique roster, playbooks — scored by
> expected impact on output quality, speed, or cost.
>
> The factory may make itself **stronger** autonomously. Items
> that would make it weaker require a human approval entry
> (PART 11.3 / `governance/GUARDRAILS.md` #12).

Format per item:

```
## <rank>. <title>

**Type:** brain | loop | critic | playbook | tooling
**Expected impact:** quality | speed | cost | rigor — and why.
**Cost to implement:** session-time estimate.
**Strengthens or weakens the factory?** stronger | weaker (the
latter requires human approval).
**Status:** proposed | in-progress | done | reverted.
**Reasoning trace:** what observation produced this proposal.
```

---

## 1. Reconstruct the full prior idea ranking into IDEA_BACKLOG.md

**Type:** brain

**Expected impact:** rigor / quality — the seeded backlog only
carries the top two ideas from prior research. The original
research produced a longer ranked list that should be present
here so the BUILD loop has a real second and third choice when
the top idea cannot be approved.

**Cost to implement:** ~one session of research-loop time.

**Strengthens or weakens?** stronger.

**Status:** proposed.

**Reasoning trace:** Bootstrap acknowledged the seeding is
partial (see `brain/IDEA_BACKLOG.md`'s "seeding placeholder"
row).

## 2. First META-loop self-audit of the bootstrap brain

**Type:** brain

**Expected impact:** rigor — verifies that every brain file
actually contains what its description says it contains, and
that none has already drifted from the spec.

**Cost to implement:** <half a session.

**Strengthens or weakens?** stronger.

**Status:** **done.** The bootstrap session ran the first META
self-audit (1 P0 + 5 P1 + 4 P2, all P0/P1 fixed; `brain/META_LESSONS.md`
2026-05-27), and the 5.7.7/5.7.8 audit now runs every cycle
(2026-05-30 entry). Brain integrity is also automated
(`ops/checks/brain-integrity.mjs`). Was never marked done — corrected
2026-05-30.

**Reasoning trace:** Standard hygiene after any structural
change. The migration was a structural change.

## 3. Research current best practices for autonomous-agent operation

**Type:** brain / loop

**Expected impact:** quality — the factory's loop arbitration,
critique roster, and brain structure are first-principles
designs. The META loop should read how other autonomous-agent
systems (AI software factories, large-scale agentic platforms,
multi-agent critique frameworks) are structured and import what
applies.

**Cost to implement:** several research-loop cycles spread over
weeks.

**Strengthens or weakens?** stronger.

**Status:** proposed.

**Reasoning trace:** PART 11.1 ("Research how to improve
itself") prescribes this as a standing META-loop task.

## 4. Strengthen the Domain-Expert Critic for federal-procurement specifically

**Type:** critic

**Expected impact:** quality — BidDiff is the active product
and the Domain-Expert Critic's checklist is currently generic.
A federal-procurement-specific checklist (FAR/DFARS familiarity,
solicitation lifecycle terminology, agency-specific quirks)
would catch issues a generic check would not.

**Cost to implement:** ~half a session to draft + critique +
land.

**Strengthens or weakens?** stronger.

**Status:** **done (2026-05-30).** Added a "Federal-procurement
specialization" block to Domain-Expert Critic #5 in
`governance/CRITIQUE_AGENTS.md` (UCF section literacy, amendment
mechanics, the critical-change categories a capture manager scans
incl. the BD2 gaps, terminology precision, practitioner workflow),
from public FAR/DFARS knowledge. The generic checklist is retained.
Roster-growth row logged. Note: this strengthens the *critic's
lens*; extending the *code* ruleset (`critical.ts`) still awaits the
human-gated practitioner validation (`human/NEED_FROM_HUMAN.md` #4).

**Reasoning trace:** BidDiff is the active build; the critic
roster should specialize for the product currently in front of
it without losing its generic version.

## 5. Build the first PLAYBOOK from the BidDiff experience

**Type:** playbook

**Expected impact:** speed — the next Chrome MV3 extension the
factory builds inherits BidDiff's learned playbook (extraction
discipline, content-script lifecycle, side-panel + offscreen +
service-worker pattern, license/telemetry isolation, "reports,
never advises" enforcement). PART 2.3 / 11.1 prescribes that
playbooks compound the factory's speed over time.

**Cost to implement:** ~one session to draft and critique.

**Strengthens or weakens?** stronger.

**Status:** **done (2026-05-30).** Shipped
`brain/PLAYBOOKS/chrome-mv3-critical-change-diff.md`. The original
"defer until ship" reasoning was satisfied early: an exhaustive
two-pass critique of the whole codebase (manual read + property
fuzz) produced the post-mortem learning a playbook codifies, and the
D1–D5 derivative family needs the engine playbook NOW to be
deep-evaluable. Captures both halves: the reusable critical-change
diff engine (A) and the MV3 extension shell (B), plus the 5 recurring
bug archetypes.

**Reasoning trace:** BidDiff is the first product through the
factory; its playbook is the first one to write.

---

## 6. Add a rule/cadence consistency check between CLAUDE.md and CRITIQUE_AGENTS.md

**Type:** tooling

**Expected impact:** rigor — prevents silent drift between the
5.7.N maximization rules in `CLAUDE.md` and the cadence table
in `governance/CRITIQUE_AGENTS.md`. If a future session edits
one without the other, today nothing flags the divergence.

**Cost to implement:** small. A test that parses both files
and asserts every `5.7.N` rule has a matching cadence row, and
every cadence row maps to a rule. Lives at
`ops/checks/rule-cadence-consistency.test.ts` or similar (the
ops/ directory needs a checks subdir for Kendama-level
automated audits — adding the structure is part of this item).

**Strengthens or weakens?** stronger.

**Status:** **done (2026-05-30).** Shipped as
`ops/checks/rule-cadence-consistency.mjs` with unit + regression
tests in `ops/checks/checks.test.mjs` (8/8 passing). The check is
bidirectional (contiguity, defined-but-unreferenced, dangling
reference) and wired into `ops/loop.md` session start. See
`brain/DECISIONS.md` 2026-05-30.

**Reasoning trace:** Surfaced by the 5.7.8 pass on this
session's META audit (logged in `brain/META_LESSONS.md`). The
META audit found 10 gaps but did not detect this kind of
drift-between-files risk; the adversarial re-read did. This is
exactly the kind of finding 5.7.8 was added to produce.

## 7. Build the first Kendama-level CI check infrastructure

**Type:** tooling

**Expected impact:** rigor — currently every consistency check
(rule/cadence sync, brain integrity, no-Github-Actions, etc.)
is policed only by human attention or by the META loop reading
files. A small set of automated checks runs on every commit
without invoking the prohibited CI surface — the Kendama
session itself runs them as part of `ops/loop.md`'s
session-start brain-reconciliation step.

**Cost to implement:** medium. Lives under `ops/checks/`.
Triggered by `ops/loop.md` at session start, not by any CI.
Must NOT use GitHub Actions or any prohibited surface (per
`governance/GUARDRAILS.md` #1-2).

**Strengthens or weakens?** stronger.

**Status:** **done (2026-05-30).** Shipped the `ops/checks/`
scaffolding: a dependency-free runner (`run-all.mjs`), shared
helpers (`lib.mjs`), the first three checks (`brain-integrity`,
`no-github-actions`, `rule-cadence-consistency`), a test suite,
and `README.md` with an "adding a check" guide. Triggered by
`ops/loop.md` at session start, never by CI (the
`no-github-actions` check enforces that). See
`brain/DECISIONS.md` 2026-05-30. Follow-on check ideas
(branch-policy, NEED_FROM_HUMAN status-format, APPROVALS
auto-proceed-window arithmetic) are logged as future roster
growth in the README's "Adding a check" section.

**Reasoning trace:** Item #6 above motivates the first check;
others (brain integrity, branch policy, guardrails compliance)
follow naturally. This is the right scaffolding to grow.

## Notes for the META loop

- The META loop pulls the top item from this list each cycle,
  subject to the loop arbitration priority order in PART 4.6.
- Every change committed to the factory itself is also subject
  to the critique system (PART 11.4); changes the critique cannot
  justify are reverted.
- Items here may be re-ranked freely; like the product ranking,
  the reasoning for the order is documented (here in the item
  bodies; aggregate trends in `brain/META_LESSONS.md`).

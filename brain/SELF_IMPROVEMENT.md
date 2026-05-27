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

**Status:** proposed.

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

**Status:** proposed.

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

**Status:** proposed (deferred until BidDiff ships — playbooks
codify post-mortem learning).

**Reasoning trace:** BidDiff is the first product through the
factory; its playbook is the first one to write.

---

## Notes for the META loop

- The META loop pulls the top item from this list each cycle,
  subject to the loop arbitration priority order in PART 4.6.
- Every change committed to the factory itself is also subject
  to the critique system (PART 11.4); changes the critique cannot
  justify are reverted.
- Items here may be re-ranked freely; like the product ranking,
  the reasoning for the order is documented (here in the item
  bodies; aggregate trends in `brain/META_LESSONS.md`).

# DECISIONS.md — every significant decision, dated, with reasoning

> Append-only log. Every non-trivial choice the factory makes is
> recorded here with the alternatives considered and why this one
> won. This is how Kendama stays coherent across hundreds of
> sessions.
>
> Format per entry:
>
> ```
> ## YYYY-MM-DD — <short title>
>
> **Decision:** what was decided.
> **Alternatives considered:** what was rejected and why.
> **Reasoning:** the case for the decision.
> **Reversibility:** how to undo if it turns out wrong.
> **Where applied:** files / loops affected.
> ```

---

## 2026-05-27 — Migration from `Kendama_site` (BidDiff in-progress) to Kendama factory

**Decision:** Execute PART 12 of the founding spec on the
existing repository: backup branch + dated tag, then erect the
Kendama structure alongside BidDiff, then `git mv` BidDiff into
`products/biddiff/`, then clean the root.

**Alternatives considered:**

- **Fresh repository.** Rejected. The founding spec explicitly
  states the repository name `Kendama_site` is kept and the URL
  preserved. A fresh repo would break the existing clone and
  remote, and lose the BidDiff history in the most awkward way.
- **Rename `Kendama_site` to `kendama`.** Rejected per
  PART 0.5 — the repository keeps its existing name and URL
  for stability. The system is "Kendama" in every internal
  document; the repository name is treated as historical.
- **Begin building in a `kendama/` subdirectory and leave the
  root alone.** Rejected. The founding spec is explicit that
  the factory's brain, governance, ops, and human interface
  live at the repository root. Burying them in a subdirectory
  would defeat the discoverability the design depends on.

**Reasoning:** PART 12 is the path the spec prescribes for
exactly this situation. The safety branch + tag make the
migration fully reversible, the `git mv`s preserve BidDiff's
file history, and the root cleanup leaves a recognizably
Kendama-shaped repository for every future session.

**Reversibility:** Full. `git checkout pre-kendama-backup`
restores the entire pre-migration tree. The dated tag
`pre-kendama-migration-20260527` resolves to the same commit.

**Where applied:** repository root; `products/biddiff/`;
`MIGRATION_LOG.md`.

## 2026-05-27 — Branch policy during migration

**Decision:** Perform the migration on the current working
branch `claude/biddiff-extension-ijZiE`, then land the final
migration state on `main`.

**Alternatives considered:**

- **Cut a new `migration/kendama` branch.** Rejected. The
  existing `claude/biddiff-extension-ijZiE` branch already
  holds the BidDiff polish history that should travel into
  Kendama. Cutting a new branch would either lose that
  history or require an immediate merge anyway.
- **Commit directly to `main`.** Rejected for the migration
  step itself — the binding instruction at session start was
  to develop on `claude/biddiff-extension-ijZiE`. The migration
  is staged on that branch and then landed on `main` so the
  Routine reads from a clean canonical branch.

**Reasoning:** Staging on a working branch preserves the
existing review discipline; landing the final state on `main`
puts Kendama's brain on the branch the Routine will read from
when it wakes.

**Reversibility:** Full (the safety branch + tag).

**Where applied:** push policy; final merge to `main`.

## 2026-05-27 — Tag-push limitation noted, branch deemed sufficient

**Decision:** The `pre-kendama-migration-20260527` tag exists
locally but the remote returned HTTP 403 on tag push.
`pre-kendama-backup` (pushed) provides the same recovery
capability and is the formal safety mechanism.

**Alternatives considered:**

- **Halt migration until tags can be pushed.** Rejected. The
  backup branch provides identical recovery semantics. Halting
  the migration on a metadata limitation would be wasteful.
- **Switch the remote.** Rejected. Out of scope; this
  environment's remote configuration is what it is.

**Reasoning:** The safety property (any future session can
restore the pre-migration tree) is satisfied by the pushed
branch. The tag is a convenience that can be re-pushed later.

**Reversibility:** Tag can be re-pushed from any environment
with tag-push permission.

**Where applied:** `MIGRATION_LOG.md`.

## 2026-05-27 — Founding scoring weights

**Decision:** Adopt the initial weights in
`governance/SCORING_MODEL.md`: 18 / 14 / 14 / 10 / 10 / 8 /
8 / 10 / 8. Hard filters: distribution-without-marketing,
self-serve monetization, autonomous-agent build feasibility,
inside the spend cap.

**Alternatives considered:**

- **Uniform weights.** Rejected. The factory's most distinctive
  constraint is "no marketing surface," which makes
  distribution and self-serve monetization dominant. Uniform
  weights would let an idea with a great product but no
  distribution path beat an idea with both.
- **Heavier defensibility weight.** Considered. Decided
  against for v1 — defensibility is hard to assess at the idea
  stage and tends to be a rationalization. The META loop is
  permitted to retune based on outcomes.

**Reasoning:** First-principles fit to the constraint set;
META loop will tune based on which shipped products actually
make money.

**Reversibility:** One edit to `governance/SCORING_MODEL.md`,
logged here when retuned.

**Where applied:** `governance/SCORING_MODEL.md`;
`brain/IDEA_BACKLOG.md` scoring.

# SCORING_MODEL.md — how ideas are scored and ranked

Every candidate product idea lives in `brain/IDEA_BACKLOG.md` and
carries the score computed by this model. The ranking in
`brain/RANKING.md` is the sort of the backlog by total score
(descending), filtered by the hard requirements below.

The score is a **transparent weighted sum** of sub-scores. Each
idea displays every sub-score. The ranking is therefore auditable,
never a black box.

The factors and their initial weights are below. The META loop
(PART 11) is permitted to retune weights based on which shipped
products actually succeeded; every retune is logged in
`brain/DECISIONS.md` with before / after / reasoning, and is
itself subject to critique.

---

## Hard requirements (filters — fail any of these and the idea is
scored near zero regardless of other factors)

- **Distribution-without-marketing.** A marketplace, registry,
  search surface, or built-in discoverability mechanism delivers
  buyers to the product. Ideas that require running ads, doing
  outbound sales, or building an audience from scratch are
  filtered. (This is the single most important factor for an
  autonomous solo operation.)
- **Self-serve monetization.** Billing is fully automated. No
  sales calls. No invoicing pipeline.
- **Build feasibility for an autonomous agent.** Claude Code can
  build this well *without* domain knowledge it lacks. (An idea
  that requires undocumented insider knowledge of a niche
  industry fails this unless that knowledge can be acquired
  through public sources.)
- **Buildable inside the spend cap.** Realistic compute and API
  budget to ship the product is inside the monthly cap, with
  margin for the critique loop.

---

## Scored factors (each 0–10; weighted sum is the total)

| Factor | Weight | What 10/10 looks like | What 0/10 looks like |
|---|---:|---|---|
| Revenue ceiling | 18 | $20k+/mo realistic mature MRR for this category | <$200/mo |
| Probability of reaching the ceiling | 14 | Proven comparable products at that revenue exist | Wishful; no evidence anyone has done this |
| Distribution quality | 14 | Top-of-search in a marketplace with real intent traffic | Requires audience-building from zero |
| Maintenance fit | 10 | Runs on a few $ of compute/month, no ongoing human ops | Requires daily human attention |
| Build feasibility | 10 | Claude Code can build well-documented, well-bounded scope | Requires deep, hard-to-acquire domain knowledge |
| Self-serve monetization | 8 | Stripe + a license server; no humans in the loop | Requires invoicing, contracts, or sales calls |
| Defensibility | 8 | Hard moat (data, distribution, network) lasting >12mo | Will be commoditized by a better model in 3mo |
| Evidence quality | 10 | Proven (real comparables with real revenue documented) | Speculative (a bet on an emerging market) |
| Strategic fit | 8 | Compounds a playbook, surfaces WISHLIST ideas, builds factory leverage | One-off; no compounding |

**Total possible:** 100 × 10 = 1000 raw, normalized to a 0–100 score.

The current weights live here and are the source of truth. The
META loop may propose retunes; any retune commits to this file with
before / after weights and the reasoning. Retunes are themselves
subject to critique.

---

## The deep-evaluation requirement (PART 3.3)

An idea cannot advance from "candidate" to "approved for build" on
score alone. It must first receive a **deep evaluation** — a
dedicated file under `brain/RESEARCH/` named
`YYYY-MM-DD-<product-slug>.md` containing:

1. **Competitor teardown.** Real products in the space, their
   pricing, their distribution, their strengths and weaknesses.
   Cite URLs.
2. **Realistic revenue model.** Pricing strategy, conversion
   assumptions, comparable benchmarks, ceiling vs. floor.
3. **Distribution analysis.** Exactly how buyers find this. Which
   marketplace? Which search query? Which registry? What does
   "discoverable" mean here?
4. **Build-effort estimate.** Phase plan, estimated build cycles,
   risk areas, dependencies that need human action
   (`NEED_FROM_HUMAN.md`).
5. **Risk register.** What could kill this? Platform policy
   change, regulatory shift, AI commoditization, incumbent
   response, market timing.
6. **Honest "why might this fail" section.** Mandatory. Not a
   formality — the idea's score is reduced by every plausible
   failure mode not addressed.
7. **Evidence tier (Proven / Plausible / Speculative).** Defined
   below. Affects scoring.

A deep evaluation that does not include all seven sections is
incomplete; the idea does not advance.

---

## The honest-evidence tiers (PART 3.5)

Every idea carries a labelled tier:

- **Proven.** Real comparable products exist with documented
  revenue at or near the projected ceiling. The market is
  established and the buyer is identifiable.
- **Plausible.** Sound reasoning supports the idea; no direct
  comparable exists at the projected ceiling.
- **Speculative.** A bet on an emerging market or an unproven
  buyer. May still be worth building, but as a deliberate
  high-upside minority of capacity, not as the bulk of the
  portfolio.

**Portfolio rule (enforced):** the active build slate stays
majority-Proven. Speculative ideas are built only as a clearly
labelled minority of capacity. The factory is not permitted to
fill itself with confident nonsense from an optimistic agent
grading its own work.

---

## Re-ranking cadence (PART 3.4)

The ranking is **not static**. Every event below triggers a
re-rank of the entire backlog:

- A research cycle completes.
- A new entry lands in `brain/MARKET_SIGNALS.md`.
- A shipped product produces an outcome (revenue, churn, signal).
- A lesson lands in `brain/LESSONS.md`.
- A new idea is added to the backlog from any source.
- A weight in this file is retuned by the META loop.

After every re-rank, the top of the backlog is what the next
BUILD-loop cycle picks up. `brain/RANKING.md` records the
**reasoning** for the current order — not just the order — so a
future session understands the why.

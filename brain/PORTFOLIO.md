# PORTFOLIO.md — every product Kendama operates

> Current portfolio. One row per product. Updated whenever a
> product changes phase, ships, retires, or its metrics change.

| Product | One-line | Status | Build % | Critique status | Shipped | MRR | Notes |
|---|---|---|---:|---|---|---|---|
| **BidDiff** (`products/biddiff/`) | Chrome extension that diffs amended U.S. federal solicitations against prior versions for proposal / capture teams. | `build` (active) | ~92% | Many internal critique passes converged on the BidDiff branch under the prior loose process. First **formal Kendama panel pass** is the next session's P0 task. | Not yet — preparing for Chrome Web Store submission as the next ship-gate task. | $0 (pre-launch) | Carried over via migration; relocated into `products/biddiff/` with full history. |

---

## Status legend

- `build` — actively under development.
- `critique` — paused on a critique cycle to converge findings.
- `blocked` — a human-gated dependency is unresolved
  (`human/NEED_FROM_HUMAN.md`).
- `shipped` — passed the ship gate (Section 5.5). Now subject to
  the recurring re-critique cadence and the "nothing is ever done"
  review.
- `polishing` — shipped, currently in the POLISH loop.
- `retired` — no longer maintained. Reason recorded in
  `brain/DECISIONS.md`.

## Re-critique cadence tracking

For every `shipped` product, the row above must include the date of
the most recent full panel re-critique. If the date is older than
the cadence set in `governance/CRITIQUE_AGENTS.md` (default:
monthly), the product is automatically P1 and preempts new building
per Section 5.7.1.

| Product | Last full re-critique | Next due | Status |
|---|---|---|---|
| BidDiff | (none yet under Kendama panel) | Next session | due |

## Outcomes feed scoring

When a shipped product begins producing revenue or usage, that
outcome feeds back into `governance/SCORING_MODEL.md` weight tuning
via the META loop. Confident-but-wrong predictions get the
projected/actual delta logged in `brain/META_LESSONS.md`.

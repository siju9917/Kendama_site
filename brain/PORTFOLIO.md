# PORTFOLIO.md — every product Kendama operates

> Current portfolio. One row per product. Updated whenever a
> product changes phase, ships, retires, or its metrics change.

| Product | One-line | Status | Build % | Critique status | Shipped | MRR | Notes |
|---|---|---|---:|---|---|---|---|
| **BidDiff** (`products/biddiff/`) | Chrome extension that diffs amended U.S. federal solicitations. (Audience: positioning under review per `human/APPROVALS.md` proposal #1.) | `build` (active) | ~93% — code complete + hardened; K1 not converged (3 P1 gated). 2026-05-30: exhaustive 2-pass critique (manual + fuzz), 5 bugs + 2 security fixes, K2 ship-gate dry run, all *unblocked* gaps closed. 262/262 tests + clean build. | K1 (2026-05-27) did NOT converge — 3 P1 open (Research Quality / Domain-Expert / Ambition), all human/cap-gated. 2026-05-30: K1 got 2 independent hard passes (read + property-fuzz) → 5 bugs + 2 P3 security + 2 extraction + maintainability fixed, Product-Sense P2 closed; K2 dry run defended every QUALITY_BAR item w/ evidence (`docs/ship-gate-dry-run.md`). Remaining: 3 K1 P1s + 2 K1 P2s (a11y contrast, SAM e2e), all human/cap/browser-gated. | Not yet — ship gate not reachable until the gated P1s close + human store step. | $0 (pre-launch) | All 2026-05-30 work is on branch `claude/saturday-task-kickoff-AfDAa`, not yet merged to `main` (`NEED_FROM_HUMAN.md` item 5). |

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
| BidDiff | 2026-05-30 (K1: 2 independent hard passes — manual read + property fuzz; + K2 ship-gate dry run) | Re-critique once the gated P1s clear; monthly cadence applies after ship | open — phase not converged (3 P1s + 2 P2s human/cap/browser-gated) |

## Outcomes feed scoring

When a shipped product begins producing revenue or usage, that
outcome feeds back into `governance/SCORING_MODEL.md` weight tuning
via the META loop. Confident-but-wrong predictions get the
projected/actual delta logged in `brain/META_LESSONS.md`.

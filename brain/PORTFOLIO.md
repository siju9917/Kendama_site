# PORTFOLIO.md — every product Kendama operates

> Current portfolio. One row per product. Updated whenever a
> product changes phase, ships, retires, or its metrics change.

| Product | One-line | Status | Build % | Critique status | Shipped | MRR | Notes |
|---|---|---|---:|---|---|---|---|
| **BidDiff** (`products/biddiff/`) | Chrome extension that diffs amended U.S. federal solicitations. (Audience: positioning under review per `human/APPROVALS.md` proposal #1.) | `build` (active) | ~92% — code complete, but Kendama Phase K1 panel pass found 3 P1 + 3 P2 product findings; phase has not converged. | First formal Kendama panel pass ran 2026-05-27; did NOT converge. Three P1 open: Research Quality (no market evidence), Domain-Expert (critical-rule coverage gap), Ambition (audience-vs-scope mismatch). | Not yet — ship gate not reachable until P1s close. | $0 (pre-launch) | Carried over via migration; relocated into `products/biddiff/` with full history. K1 details in `products/biddiff/CRITIQUE_LOG.md`. |

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
| BidDiff | 2026-05-27 (Phase K1 pass 1, did NOT converge) | Re-critique once P1s addressed; monthly cadence applies after ship | open — phase not converged |

## Outcomes feed scoring

When a shipped product begins producing revenue or usage, that
outcome feeds back into `governance/SCORING_MODEL.md` weight tuning
via the META loop. Confident-but-wrong predictions get the
projected/actual delta logged in `brain/META_LESSONS.md`.

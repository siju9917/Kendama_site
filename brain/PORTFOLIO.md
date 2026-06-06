# PORTFOLIO.md — every product Kendama operates

> Current portfolio. One row per product. Updated whenever a
> product changes phase, ships, retires, or its metrics change.

| Product | One-line | Status | Build % | Critique status | Shipped | MRR | Notes |
|---|---|---|---:|---|---|---|---|
| **BidDiff** (`products/biddiff/`) | Chrome extension that diffs amended U.S. federal solicitations for proposal managers. | `build` (active, blocked on human gates) | ~97% — code complete + hardened, 586/586 tests; all unblocked POLISH done (N-A21); Vite 6 + Vitest 4 toolchain bumped; DiffView + SamAttachments have full component test coverage; 5 genuine bugs + 2 security fixes + 14 polish items since K2. K1 not converged (1 P1 gated: privacy copy). | 2026-06-06: Research Quality P1 CLOSED ($45K–$315K ARR, PLAUSIBLE); Domain-Expert P1 effectively resolved (sub-CLIN, SET_ASIDE, page-limit); Ambition P1 → repositioning applied (proposal managers, auto-proceeded 2026-06-06). Remaining P1: Compliance (privacy policy server-claim overstating on-device reality, NEED #7). K2 ship-gate dry run complete (`docs/ship-gate-dry-run.md`) — engineering bar met on every axis; only human content-gate blockers remain. | Not yet — ship blockers: privacy copy decision (NEED #7) → submit (NEED #6). Store listing update applies post-decision. | $0 (pre-launch) | On `claude/intelligent-faraday-FnmJn` (current session); merge to `main` at session end per CLAUDE.md rule 6. |
| **OpenAPI Breaking-Change Lens** (`products/openapi-lens/`) | VS Code extension that classifies breaking changes in OpenAPI schemas inline as you edit. | `build` (Phase 0 done + critique-panel cleared + 5.7.5 bug-hunt done + 5.7.4 "nothing is done" review done; awaiting Proposal #3 auto-proceed 2026-06-13) | Phase 0 complete: pure TypeScript diff engine, **307/307 tests**, 60+ BREAKING/INFO rules, YAML + JSON + Swagger 2.0 support. Coverage: property-level diff (type/nullable/format/enum/readOnly/writeOnly/constraints), recursive property diff (5 levels), items-level diff (type/format/enum/nullable/constraints), parameter diff (type/format/enum/nullable/deprecated/constraints), nested required fields (recursive), nested items (array-typed properties), allOf composition flattening, circular $ref protection, `#/components/parameters` $ref resolution, completeness guard (TYPE_STUBS exhaustiveness). VS Code extension shell not yet built. | 2026-06-06: Full 14-critic panel + 5.7.2 escalating critique PASSED. 5.7.4/5.7.5 continuation: allOf flattening, recursive property diff, all constraint fields (property/items/parameter), nested required fields, nested property items, parameter nullable — all resolved. 307 tests, zero known correctness gaps for Phase 0 scope. | Not yet — Proposal #3 auto-proceeds 2026-06-13; marketplace publisher reg needed (NEED #10). | $0 (pre-launch) | On `claude/intelligent-faraday-FnmJn` (current session); merge to `main` at session end per CLAUDE.md rule 6. |

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

# Kendama

An autonomous software product factory.

This repository is **Kendama** — a self-operating system in which
Claude Code leads a continuous build / research / rank / critique /
ship operation, generating and improving a portfolio of software
products with minimal human involvement.

The repository's GitHub URL is historical: it was previously the
`Kendama_site` repository (holding in-progress work on a Chrome
extension called BidDiff, built over earlier retired code). The
URL is preserved on purpose. The system inside has been
restructured into Kendama on 2026-05-27 per
`MIGRATION_LOG.md`.

---

## What this repository does

- Researches markets and generates product ideas continuously.
- Ranks them by a transparent scoring model (see
  [`governance/SCORING_MODEL.md`](governance/SCORING_MODEL.md)).
- Posts the top-ranked idea to a fast human approval gate
  ([`human/APPROVALS.md`](human/APPROVALS.md)).
- Builds approved products to the absolute professional standard
  in [`governance/QUALITY_BAR.md`](governance/QUALITY_BAR.md),
  enforced by a 14-critic adversarial panel in
  [`governance/CRITIQUE_AGENTS.md`](governance/CRITIQUE_AGENTS.md).
- Ships, then keeps polishing — "done" is permanently provisional.
- Improves itself: brain, loops, critique roster, playbooks.
- Runs on a weekly Claude Code Routine (no GitHub Actions, no CI
  scheduler, no machine left on) — see
  [`ops/SCHEDULE_SETUP.md`](ops/SCHEDULE_SETUP.md).

## Where to read next

If you are the human:

- **Start here:** [`human/HOW_TO_USE.md`](human/HOW_TO_USE.md).
- **Sunday/Monday check-in:** send a short message in a Claude
  Code session — see Section 7.6 in `HOW_TO_USE.md`.
- **What needs your action right now:**
  [`human/NEED_FROM_HUMAN.md`](human/NEED_FROM_HUMAN.md).
- **This week's digest:**
  [`human/WEEKLY_DIGEST.md`](human/WEEKLY_DIGEST.md).

If you are a Claude Code session starting in this repository:

- **Read [`CLAUDE.md`](CLAUDE.md) first.** Every session.
- Follow the operating loop in [`ops/loop.md`](ops/loop.md).
- Quality is non-negotiable; the bar is in
  [`governance/QUALITY_BAR.md`](governance/QUALITY_BAR.md) and
  the critique roster in
  [`governance/CRITIQUE_AGENTS.md`](governance/CRITIQUE_AGENTS.md).
- The factory's standing instruction is to work the entire
  scheduled window, fill the queue with productive work, never
  declare "done" before a real limit hits.

## Repository layout

```
.
├── CLAUDE.md                  master operating instruction
├── MIGRATION_LOG.md           audit trail of the one-time migration
├── README.md                  (this file)
│
├── brain/                     persistent knowledge of the factory
├── governance/                rules the factory operates under
├── human/                     the (narrow) human interface
├── products/                  one directory per product
│   └── biddiff/               first product — Chrome extension
├── play/experiments/          side-projects for surfacing wishlist items
└── ops/                       loop definition, schedule setup, launch script
```

The full spec for each directory is PART 1 of the founding
document, preserved in `MIGRATION_LOG.md` and codified across the
files above.

## Current portfolio

| Product | Status | Path |
|---|---|---|
| BidDiff — Chrome extension that diffs amended U.S. federal solicitations | `build` | [`products/biddiff/`](products/biddiff/) |

## Prohibitions (binding on every session)

- **No GitHub Actions, ever.** No `.github/workflows/`. The
  factory's scheduling is a Claude Code Routine with the
  *scheduled* trigger type only.
- **No CI-based schedulers.** Local OS cron is the sole permitted
  fallback.
- **No spending past the spend cap** in
  [`governance/SPEND_CAP.md`](governance/SPEND_CAP.md).
- **No weakening of guardrails / quality bar / critique rigor
  without a human approval entry.**
- See [`governance/GUARDRAILS.md`](governance/GUARDRAILS.md) for
  the full list.

## The philosophical core

Kendama exists to defeat critique fatigue. The factory **will
never** decide it has done enough and stop. It works until a real
limit (the spend cap, the platform duration limit, the schedule
window) is reached — and it expects to fill 24+ hour windows of
continuous deep work as the normal case. The Section 5.7
maximization rules in `CLAUDE.md` make this structural, not
aspirational.

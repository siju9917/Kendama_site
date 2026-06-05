# Chrome Web Store Listing

## Title (max 75 chars)

**BidDiff — Federal Solicitation Amendment Diff for Proposal & Capture Teams**

## Short description (max 132 chars)

Diff amended U.S. federal solicitations against prior versions. Categorized changes, critical-flagged, on-device. Never miss an amendment.

## Description (full)

**See every change in a federal solicitation amendment in 30 seconds.**

BidDiff is built for proposal managers and capture managers at companies bidding on U.S. federal contracts. When SAM.gov posts an amendment, BidDiff compares it against the prior version and produces a categorized, critical-flagged list of every change — clause additions, due-date shifts, evaluation criteria edits, page-limit moves, CLIN changes, attachment updates.

No more side-by-side page flipping under deadline pressure. No more team-wide "what changed?" emails. No more risk that a critical change slipped through.

### What BidDiff catches

- **Dates and deadlines** — proposal due dates, period of performance, milestone changes.
- **FAR / DFARS clauses** — clauses added, removed, or amended in Section I.
- **Evaluation criteria** — Section M factor changes, reweighting, basis-for-award edits.
- **Submission instructions** — Section L page limits, format changes, volume structure.
- **CLIN structure** — Section B additions, removals, quantity and unit changes.
- **Attachments** — Section J additions and removals.
- **Statement of Work** — Section C scope changes, requirement adds, technical revisions.

### How it works

1. Open the BidDiff side panel from SAM.gov or anywhere.
2. Drop in the new amendment file and the prior version (PDF or DOCX).
3. Review the categorized change list. Critical changes are flagged at the top.
4. Export a branded PDF report or copy a summary for your capture team.

### Privacy by design

- **Everything runs on your device.** Your documents are parsed, compared, and
  rendered entirely in your browser. **No document content is ever uploaded to
  any server** — there is no BidDiff server.
- **The only network activity** is downloading an attachment from SAM.gov when
  *you* click "Compare with BidDiff" on an opportunity page — the same file your
  browser would download anyway. Nothing else leaves your machine.
- **No accounts, no tracking, no telemetry.** BidDiff does not phone home.
- **Minimum Chrome permissions.** Storage, side panel, offscreen, and the SAM.gov host — nothing else.

### Designed for federal procurement reality

Built on the Uniform Contract Format (UCF) — Sections A through M — with a curated FAR/DFARS clause dataset so every clause change comes with its title and a neutral plain-language note. **BidDiff reports what changed. It never advises. The original source documents remain the authoritative reference.**

### Pricing

**Free.** Every feature, no account, no trial clock, no upsell. BidDiff runs
entirely on your device, so there's nothing to meter — install it and use it.

---

**BidDiff identifies textual differences to assist professional review. It does not provide legal, contracting, or capture advice.**

## Keywords (for SEO / Web Store search)

- RFP amendment comparison
- federal solicitation diff
- compare SAM.gov amendments
- RFP version compare
- government bid amendment changes
- proposal management tool
- FAR clause tracker
- DFARS clause tracker
- federal contracting tool
- Section L M comparison
- capture management
- amendment redline
- solicitation tracker

## Category

Productivity. (Secondary category: Workflow & Planning.) The audience is
proposal and capture managers, not developers — this is intentionally not
listed under Developer Tools.

## Languages

English (initial). Additional locales in roadmap.

## Permissions justification (required by Chrome Web Store)

| Permission       | Why                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------ |
| `storage`        | Save user settings and the local history of diffs done — on your device only.        |
| `sidePanel`      | Open the main BidDiff workspace as a side panel next to SAM.gov.                     |
| `offscreen`      | Run heavy PDF/DOCX processing in an offscreen document so the UI stays responsive.   |
| `host_permissions: https://sam.gov/*`, `https://*.sam.gov/*` | Detect SAM.gov opportunity pages (https only) and offer a contextual affordance. |

No `<all_urls>`, no `tabs`, no `webRequest`. The extension never reads pages outside SAM.gov.

## Support URL

(populate with support@biddiff.example before submission)

## Privacy policy URL

See `docs/privacy-policy.md`.

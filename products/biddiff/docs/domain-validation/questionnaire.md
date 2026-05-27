# BidDiff — Domain-Expert Validation Questionnaire

> **For the human to forward** to 2-3 federal proposal/capture
> practitioners per `human/NEED_FROM_HUMAN.md` item 4.
>
> **Estimated time per respondent:** ~10 minutes. The
> questionnaire is short on purpose; the goal is validation,
> not a full interview.
>
> **Where responses live:** save each response as
> `respondent-1.md`, `respondent-2.md`, etc. in this folder.
> Anonymize as needed. The next Kendama session reads them and
> updates `products/biddiff/src/core/diff/critical.ts` plus the
> `governance/CRITIQUE_AGENTS.md` Domain-Expert Critic checklist.

---

## What BidDiff does (one paragraph for the respondent)

BidDiff is a Chrome extension that, given the new and the prior
version of a federal solicitation (SAM.gov amendment), produces
a categorized, criticality-flagged diff of what changed.
Categories include Dates & Deadlines, Clauses, Pricing/CLINs,
Submission Instructions, Evaluation Criteria, Attachments, and
Scope/SOW. It runs entirely on-device. It reports what changed;
it does not advise.

## What we are validating

We want to confirm we are flagging the right things as
**critical** — i.e., the changes a real proposal/capture
professional would drop everything to investigate the moment
the amendment posts. Today, BidDiff flags as critical:

1. A date or deadline change.
2. A page-limit change or mandatory format requirement change.
3. A FAR/DFARS clause added, removed, or modified.
4. An evaluation criteria change.
5. A CLIN structure or value change.
6. An attachment added or removed.

We suspect we are missing some categories. The questions below
target the gaps we suspect.

---

## Questions

**Q1.** When an amendment posts and you have 15 minutes before a
team huddle, what is the **first thing** you scan the amendment
for? (Free response.)

---

**Q2.** Below are six categories of change we currently flag as
critical. Which (if any) feel **wrong** to you — either too
narrowly defined, too broadly flagged, or named in a way that
would confuse your team?

- Date or deadline change
- Page-limit / format-requirement change
- FAR/DFARS clause added, removed, or modified
- Evaluation-criteria change
- CLIN structure or value change
- Attachment added or removed

(Free response — call out anything you would refine.)

---

**Q3.** Below are categories we are considering **adding** to
the critical-flagged set. For each, please answer: **flag as
critical / flag as normal / context-dependent**. Add a short
note explaining context where useful.

- **Source-selection-timeline changes** beyond a pure date
  shift (e.g., bid opening time, oral-presentation scheduling,
  Q&A window opens / closes).
  Your answer: ____
- **Key-personnel / responsibility updates** (prime contractor
  named/changed, subcontractor key personnel added).
  Your answer: ____
- **Compliance-certification additions** new in this
  amendment (ITAR, EAR, cybersecurity attestations like CMMC
  level, SBOM requirements).
  Your answer: ____
- **Non-CLIN contract-value changes** (task-order caps,
  exercise-option pricing, min/max quantities not in
  structured CLIN lines).
  Your answer: ____
- **Past-performance / experience requirement changes** (new
  minimum years, new project-type requirements).
  Your answer: ____
- **Site-visit / pre-proposal-conference changes** (new visit
  scheduled, attendance now mandatory, location change).
  Your answer: ____
- **Set-aside / NAICS changes** (small-business set-aside
  added or removed, NAICS code shift).
  Your answer: ____

---

**Q4.** Is there a category of amendment change you'd flag as
critical that is **not** on either list above? (Free response.)

---

**Q5.** When you are reviewing amendments today, what tool are
you using? (One word is fine — Acrobat, Word's compare, a paid
product like CompareDocs / Litéra, etc.)

---

**Q6.** Roughly, how many amendments per week do you read
across the opportunities your team is pursuing?

---

**Q7.** If a tool flagged something as "critical" but you
disagreed once a week, would that erode your trust in it?
(Yes / no / depends on what.)

---

**Q8.** Last one: if BidDiff did exactly what is described in
the one-paragraph summary at the top, at a fair monthly price,
and your team had budget for it — would you / your team adopt
it? (Honest is more useful than polite. Yes / no / it depends.)

If "it depends," depends on what?

---

## Respondent metadata (the responder fills in)

- **Role:** _e.g. Senior Capture Manager, Proposal Coordinator_
- **Years in federal proposal/capture work:** ___
- **Primary agencies bid:** _e.g. DoD, GSA, DHS_
- **Team size:** ___
- **OK to follow up with clarifying questions?** (yes / no)

Thank you. Your input materially changes what BidDiff flags and
saves real time for every future BidDiff user.

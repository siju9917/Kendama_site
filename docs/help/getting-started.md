# Getting started with BidDiff

BidDiff compares two versions of a federal solicitation and tells you,
in 30 seconds, exactly what changed.

## Install

1. Install BidDiff from the Chrome Web Store.
2. Click the BidDiff icon in your Chrome toolbar and choose **Open
   side panel**. A panel slides in from the right.

## Your first diff

1. In the side panel, drop the **new amendment file** into the top
   dropzone (PDF or .docx).
2. Drop the **prior version** into the second dropzone.
3. Click **Compare versions**.

In 10–30 seconds (depending on document size) you'll see:

- **Summary card** — total changes, critical count, confidence.
- **Filters** — All changes / Critical only.
- **Change cards** — one per change, with the section, the before/after
  text, and (for clauses) the clause title and a neutral plain-language note.

## Reading the results

- **Red left-border** = critical change. The full reasons are listed at
  the top of the card.
- **MODIFY** cards show a word-level diff: green = inserted, red strike
  = removed.
- **MOVE** cards mean the content was relocated — usually between
  sections or to a new position within the same section.

## Exporting

- **Export PDF** — branded PDF report with a contents page for longer
  diffs. The filename is derived from the solicitation ID.
- **Copy text** — plain-text summary for an email or doc.
- **Copy Markdown** — rich-formatted summary that survives backticks
  in the source text. Paste into Slack, GitHub, Notion, or Linear.

Every export carries the BidDiff disclaimer.

## Working through a long amendment

- **Mark reviewed** — each change card has a Mark-reviewed button; the
  card grays out and the running counter ("3/12 reviewed") tracks your
  progress.
- **Side by side** — for MODIFY changes, the Side-by-side button shows
  the prior and new text in two columns instead of the default
  word-level inline diff.
- **Filters** — Severity (All / Critical), UCF section, and free-text
  search. The filter bar sticks to the top of the panel while you scroll.
- **Keyboard navigation** — `J` and `K` (or arrow keys) move between
  changes; `R` toggles reviewed on the change in focus; `/` jumps to
  the text filter. Press `Got it` on the tip footer to hide it.

## On SAM.gov

When you're logged into SAM.gov on an opportunity page, BidDiff drops a
**Compare with BidDiff** button into the bottom-right corner. Click it
to open the side panel; any attachments BidDiff detected on the page
appear in the side panel as one-click "Use as new" / "Use as prior"
buttons.

## Privacy

Your documents do not leave your device. The only exception is the
opt-in server OCR path, which you confirm per-document if a scanned PDF
needs OCR.

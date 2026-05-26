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

- Click **Export PDF report** for a branded report you can email to your
  capture team.
- Click **Copy summary** to put a structured text summary on your
  clipboard — paste it into a Slack message, an email, or a doc.

Both exports carry the BidDiff disclaimer: BidDiff reports what changed.
It does not advise. Always confirm with the original source documents.

## On SAM.gov

When you're logged into SAM.gov on an opportunity page, BidDiff drops a
small **Compare with BidDiff** button into the corner. Click it to open
the side panel. (You still pick the files manually — the next release
adds in-page attachment selection.)

## Privacy

Your documents do not leave your device. The only exception is the
opt-in server OCR path, which you confirm per-document if a scanned PDF
needs OCR.

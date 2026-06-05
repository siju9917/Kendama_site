# Frequently asked questions

## Does BidDiff send my solicitation files anywhere?

No. BidDiff parses and compares your documents entirely on your device, and
there is no BidDiff server to send them to. The only network activity is
downloading an attachment from SAM.gov when you click **Compare with BidDiff** on
an opportunity page.

## What if a clause number isn't in your dataset?

You'll still see the change — the clause number, the section, and what
text changed. The plain-language note will be empty for clauses outside
the bundled FAR/DFARS dataset. We keep the dataset updated; you can
help by emailing us the missing clause number.

## What if BidDiff misses a change?

Tell us. We measure accuracy against a labeled corpus on every build and
track every miss as a bug. Our enforced bar: **zero missed *critical*
changes** (a hard gate — the build fails if any critical change is missed)
and **≥98% overall recall** (it currently measures 100% on the synthetic
corpus). We work hard to hold real-world recall to the same standard. If you
find a real-world miss, email support@biddiff.example with the (redacted) docs.

## Can I use BidDiff on non-SAM.gov solicitations?

Yes — drop any PDF or .docx into the side panel and it works. The
SAM.gov affordance is a convenience.

## My document didn't fully extract. What happened?

If a PDF is scanned (image-only), it has no text layer for BidDiff to read, so
the extraction-confidence warning appears and you can still proceed with whatever
text was recovered. To compare a scanned PDF, first run it through your own OCR
(for example, Word or Acrobat's "make searchable" / export-to-text) and drop in
the resulting text-layer PDF or .docx. BidDiff does no OCR itself — it stays
fully on-device.

## Does BidDiff support .doc (legacy Word) files?

Save the file as .docx in Word first. Legacy .doc isn't supported.

## How much does BidDiff cost?

Nothing — BidDiff is free. There are no accounts, no license keys, no tiers, and
no trial clock. Install it from the Chrome Web Store and use every feature.

## Is there a paid or team version?

Not today. BidDiff runs entirely on your device, so there's nothing to meter or
bill. Each person who wants it just installs it free from the Chrome Web Store.

## Does BidDiff replace my contracts team's review?

No. BidDiff reports what changed. Your contracts, capture, and legal
teams remain responsible for the final review. The disclaimer is on
every diff view, every export, and is a deliberate product principle.

## How do I track which changes I've already looked at?

Each change card has a **Mark reviewed** button. A running counter
("3/12 reviewed") shows your progress through the diff. Marking a
change reviewed grays out the card but keeps it in the list. You can
unmark it the same way.

## What keyboard shortcuts does BidDiff have?

- `J` / down arrow — next change
- `K` / up arrow — previous change
- `R` — toggle reviewed on the focused change
- `/` — focus the text filter

The tip footer shows these the first time you open a diff and can be
dismissed.

## Can I get a side-by-side view of a modified paragraph?

Yes — on any MODIFY change card, click **Side by side** to switch from
the default word-level inline diff to a two-column before/after view.

## Where do I see saved diffs?

Saved diffs appear in the **Recent diffs** list on the side panel's
empty state. Click one to reopen the diff without re-running
extraction. A small blue dot marks diffs you haven't yet opened. Click
the ✕ on the right of an item to delete it (with confirmation).

## I dismissed the welcome card. How do I bring it back?

**Settings → Reset onboarding.**

## I hid the disclaimer banner. How do I bring it back?

**Settings → Show disclaimer again.**

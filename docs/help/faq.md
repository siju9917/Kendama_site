# Frequently asked questions

## Does BidDiff send my solicitation files anywhere?

No, with one specific exception: if you click the per-document consent
button for a scanned PDF that needs server OCR, that document goes to
the OCR endpoint to extract its text. Anything else stays on your
device.

## What if a clause number isn't in your dataset?

You'll still see the change — the clause number, the section, and what
text changed. The plain-language note will be empty for clauses outside
the bundled FAR/DFARS dataset. We keep the dataset updated; you can
help by emailing us the missing clause number.

## What if BidDiff misses a change?

Tell us. We measure accuracy against a labeled corpus and track every
miss as a bug. The corpus has 100% recall on synthetic amendments and
we work hard to keep real-world recall at the same level. If you find
a real-world miss, support@biddiff.example with the (redacted) docs.

## Can I use BidDiff on non-SAM.gov solicitations?

Yes — drop any PDF or .docx into the side panel and it works. The
SAM.gov affordance is a convenience.

## My document didn't fully extract. What happened?

If a PDF is scanned (image-only), BidDiff can't read it without OCR. If
you opt in to server OCR for that document, BidDiff sends it to the OCR
endpoint and recovers the text. Otherwise the extraction-confidence
warning appears and you can still proceed with the partial extraction.

## Does BidDiff support .doc (legacy Word) files?

Save the file as .docx in Word first. Legacy .doc isn't supported.

## How many seats does a license cover?

Each tier has a stated seat count. Solo = 1, Team = 5, Enterprise = 25+.
All tiers are self-serve purchase — no sales call required.

## Can I cancel my subscription?

Yes, anytime, through the customer portal link in the extension's
Settings page. Cancellation takes effect at the end of the current
billing period.

## Does BidDiff replace my contracts team's review?

No. BidDiff reports what changed. Your contracts, capture, and legal
teams remain responsible for the final review. The disclaimer is on
every diff view, every export, and is a deliberate product principle.

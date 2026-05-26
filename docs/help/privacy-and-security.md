# Privacy and security

BidDiff is built to keep your documents on your device.

## What stays on your device

- Every solicitation file you pick or drop into BidDiff.
- The structured diff result and any saved history.
- Your settings, including license key.

These are stored in Chrome's per-extension storage and IndexedDB. They
never get sent to a BidDiff server. Clear them anytime from
**Settings → Clear stored diff history**.

## What does leave your device, and why

- **License validation.** When BidDiff checks your subscription status,
  it sends your license key (and nothing else) to the licensing
  endpoint to verify the signature. No document content is included.
- **Anonymous usage statistics (opt-out).** Counts like "an extraction
  succeeded" or "an extraction failed with code X". Never file names,
  never document content. Turn it off from Settings.
- **Opt-in server OCR.** If you click the consent button for a specific
  scanned PDF, that document is sent to the OCR endpoint to recover its
  text. You choose per-document. The document is not retained.

## Permissions BidDiff asks for

| Permission   | Purpose                                                            |
| ------------ | ------------------------------------------------------------------ |
| storage      | Save your settings, license, and diff history locally.             |
| sidePanel    | Show the BidDiff workspace as a side panel.                        |
| offscreen    | Run heavy PDF/DOCX work in an offscreen document so the UI stays responsive. |
| sam.gov host | Detect SAM.gov opportunity pages and offer a contextual affordance. |

No `<all_urls>` permission. No tabs permission. BidDiff cannot read any
page outside SAM.gov.

## License piracy and tampering

We use server-side validation of cryptographically signed license keys.
A short offline grace period exists so a brief network outage does not
lock you out, but the extension expects a periodic online check.

## Reporting a vulnerability

security@biddiff.example (placeholder — populate before submission).

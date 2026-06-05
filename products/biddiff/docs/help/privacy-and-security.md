# Privacy and security

BidDiff is built to keep your documents on your device.

## What stays on your device

- Every solicitation file you pick or drop into BidDiff.
- The structured diff result and any saved history.
- Your settings.

These are stored in Chrome's per-extension storage and IndexedDB. They
never get sent to a BidDiff server — there is no BidDiff server. Clear them
anytime from **Settings → Clear stored diff history**.

## What leaves your device, and why

Only one thing, and only when you start it: when you click **Compare with
BidDiff** on a SAM.gov opportunity page, BidDiff downloads that attachment
directly from SAM.gov so it can compare it on your device. No document content —
and no usage data, license check, or telemetry — is ever sent to BidDiff,
because BidDiff runs no server. It does not phone home.

## Permissions BidDiff asks for

| Permission   | Purpose                                                            |
| ------------ | ------------------------------------------------------------------ |
| storage      | Save your settings and diff history locally on your device.        |
| sidePanel    | Show the BidDiff workspace as a side panel.                        |
| offscreen    | Run heavy PDF/DOCX work in an offscreen document so the UI stays responsive. |
| sam.gov host | Detect SAM.gov opportunity pages and offer a contextual affordance. |

No `<all_urls>` permission. No tabs permission. BidDiff cannot read any
page outside SAM.gov.

## Reporting a vulnerability

security@biddiff.example (placeholder — populate before submission).

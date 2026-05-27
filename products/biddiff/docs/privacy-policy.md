# BidDiff Privacy Policy

**Last updated:** 2026-05-26

BidDiff is a Chrome extension for proposal and capture professionals
working on U.S. federal solicitations. This policy explains what the
extension does and does not do with information that passes through it.

## Plain-language summary

- BidDiff processes documents **on your device**. It does not upload your
  solicitation files or amendments to any server.
- The only situations where information leaves your device are:
  - Activating a paid license: the extension sends your license key (no
    document content) to the BidDiff licensing endpoint to verify the
    signature.
  - Optional anonymous usage statistics: aggregate counts and error
    types only, with no document content and no personally identifying
    information. Turned off from the Settings page.
  - The explicit opt-in server-side OCR path: only when you click the
    consent button on a specific scanned PDF, BidDiff sends that
    document to the OCR endpoint to recover its text. You decide per
    document.

## What information BidDiff handles

1. **Solicitation documents you provide.** PDF and Word files you pick or
   drop into the extension. Stored locally on your device in extension
   storage and IndexedDB. You can clear them from the Settings page.
2. **The structured diff result.** The computed comparison between two
   versions. Stored locally on your device. You can clear it.
3. **Settings.** License key, telemetry-opt-out preference, export
   preferences. Stored locally on your device.

## What BidDiff sends to its servers (limited cases only)

1. **License validation calls.** When the extension validates your
   license key, it sends the key — and only the key, with a request
   timestamp — to the licensing endpoint. The endpoint replies with a
   signed status. No document content is included.
2. **Anonymous usage statistics (opt-out).** Counters such as "an
   extraction succeeded," "an extraction failed with code X." Never
   document content, never file names, never identifying information.
   Off when you flip the toggle.
3. **Opt-in server OCR.** Only when you specifically consent to send a
   particular scanned document. The document is processed and the
   extracted text returned; the document itself is not retained.

## What BidDiff does **not** do

- It does not read pages outside SAM.gov.
- It does not upload your solicitation files unless you explicitly
  consent per file for OCR.
- It does not store your document content centrally.
- It does not sell or share data with third parties.
- It does not use document content to train any model.

## Cookies / tracking

The extension does not set cookies on the web. The marketing site uses
only essential cookies for billing checkout.

## Children

BidDiff is intended for professional use by adults in their work. It is
not directed at children under 13 and we do not knowingly collect
information from them.

## Changes to this policy

Material changes will be announced in the in-product Settings page and
the Web Store listing description before they take effect.

## Contact

privacy@biddiff.example (placeholder — populate before submission).

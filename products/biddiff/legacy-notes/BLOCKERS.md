# Blockers (human action required)

The spec treats these as legitimate external blockers — they cannot be resolved
by code. Each is stubbed behind an interface so the build proceeds.

> **Updated 2026-06-05.** BidDiff ships **free and fully on-device**
> (`brain/DECISIONS.md`). That **removed** the billing-provider, cloud-deploy,
> domain, and production-API-endpoint blockers entirely — there is no server, no
> license, and no telemetry. The license/telemetry/OCR code and the `server/`
> directory were deleted. The remaining human items are small and listed below.

## Human action items

- [ ] **Chrome Web Store developer account.** One-time $5; required for submission (human-only).
- [ ] **Host a privacy-policy URL + set a real support URL.** Publish
      `docs/privacy-policy.md` (e.g. GitHub Pages) and replace the
      `*@biddiff.example` placeholders in the listing/help with real addresses.
- [ ] **Privacy policy / ToS legal review (optional).** Drafts are written and
      now describe an on-device, no-data-collection product; a counsel skim is
      optional, not blocking.
- [ ] **Chrome Web Store submission.** Submission itself requires a human at the developer dashboard.
- [ ] **Validate SAM.gov attachment hosts vs. manifest `host_permissions`.**
      The "Compare with BidDiff" affordance downloads attachments from URLs
      it finds on the opportunity page. If SAM serves files from a host
      OTHER than `*.sam.gov` (e.g. a CDN like S3), the `fetch` will fail
      with a CORS error and the user will see "Couldn't download". After
      observing a real SAM.gov page in production, either: (a) the URLs
      remain on `*.sam.gov` — no change; (b) widen `host_permissions` in
      `manifest.config.ts` to the actual CDN host.

## In-progress investigations (NOT blockers, just to track)

- **Real-world corpus acquisition from SAM.gov.** Will attempt programmatic download via SAM.gov Opportunities API in Phase 1. If network is restricted or the API requires an authenticated key, a synthetic high-fidelity corpus will be generated and labeled. Either path closes Phase 1; the choice is recorded in `DECISIONS.md` when finalized.

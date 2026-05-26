# Blockers (human action required)

The spec treats these as legitimate external blockers — they cannot be resolved
by code. Each is stubbed behind an interface so the build proceeds.

## Human action items

- [ ] **Buyer validation (Phase 0 of the original plan, before Phase 0 here).**
      Confirm proposal/capture managers actually want this product.
- [ ] **Chrome Web Store developer account.** Required for submission. Anthropic Console / Google account creation is human-only.
- [ ] **Billing-provider account & production API key.** Merchant-of-record (e.g., Paddle, Lemon Squeezy). Stub: licensing service has a mock-backed `ILicenseClient`.
- [ ] **Cloud deployment credentials.** Serverless host + managed DB. Stub: `server/` contains the implementation and deployment config but is not deployed.
- [ ] **Domain registration & DNS.** For the marketing site and licensing API endpoint.
- [ ] **Privacy policy / ToS legal review.** Drafts are written but should be reviewed by counsel before publication.
- [ ] **Add the production API endpoint to manifest `host_permissions`.**
      The license-validation, telemetry, and opt-in OCR fetches need a
      reachable origin. Once the API URL is decided (e.g.
      `https://api.biddiff.com/*`), add it to `manifest.config.ts`
      and replace the `biddiff.example` placeholder in
      `TelemetryClient` and the license client so the extension can
      call the deployed backend.
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

# BidDiff — Chrome Web Store submission prep

> Single source of truth for getting BidDiff live. Builds on
> `docs/release-runbook.md` (mechanical pre-flight) and `docs/store-listing.md`
> (the listing copy). Status verified by a full local build on 2026-06-05.

## ✅ Verified green this session (the artifact is built and ready)

A complete production build + all gates ran clean locally:

| Gate | Result |
|---|---|
| `npm run typecheck` (strict TS) | ✅ pass |
| `npm test` (Vitest) | ✅ **455 / 455** tests pass (72 files) |
| `npm run lint` (ESLint, max-warnings=0) | ✅ pass |
| `npm run build` (Vite + CRXJS, MV3) | ✅ built |
| `bash scripts/package.sh` | ✅ wrote **`dist-zips/biddiff-v0.1.0.zip`** (1.8 MB) |

**Manifest sanity (from the built `dist/manifest.json`):** Manifest V3 · name
"BidDiff — Federal Solicitation Amendment Diff" · v0.1.0 · permissions
`["storage","sidePanel","offscreen"]` · host_permissions limited to
`https://sam.gov/*`, `https://*.sam.gov/*`. No `<all_urls>`, no `tabs`, no
`webRequest` — least-privilege, which reviewers like.

The upload artifact is therefore **mechanically ready**. To regenerate it on any
machine: `cd products/biddiff && npm ci && bash scripts/package.sh`.

## ⛔ Content/decision gates that must close BEFORE you submit

These cannot be auto-resolved — they're human calls (and the existing critique
panel flagged them). They are the real blockers, not the build.

1. **Server-claim copy must match v1 reality — HARD BLOCKER**
   (`human/NEED_FROM_HUMAN.md` #7). The store listing, privacy policy, options
   page, help, and support copy currently describe **license-validation,
   telemetry, and opt-in OCR server flows** plus **three paid tiers** — none of
   which v1 actually performs (v1 is effectively **fully on-device**, with a
   local-only trial license). Submitting copy that overstates server
   interactions is a Web-Store-review + misrepresentation risk.
   - **Option A (recommended — fastest, most accurate, no infrastructure):**
     scope all user-facing copy to on-device reality — "BidDiff runs entirely on
     your device; the only network activity is downloading a SAM.gov attachment
     you click." Drop the telemetry/OCR/tiered-billing claims. This is both
     accurate AND a *stronger* privacy story, and it removes every
     infrastructure blocker below. Say the word and the factory makes these
     edits across all copy locations (it will not rewrite legal copy unilaterally).
   - **Option B:** actually deploy the server (license/telemetry/OCR) and wire
     billing — pulls in the infrastructure blockers in item 3.

2. **Positioning decided** (`human/APPROVALS.md` #1): individual-tool vs
   capture-team framing for the listing. Auto-default is "reposition" after the
   7-day window, but settling it sharpens the listing.

3. **Monetization/infrastructure — only if you pick Option B above.** A real
   paid extension needs a merchant-of-record (Paddle/Lemon Squeezy), a deployed
   serverless backend, a domain + DNS, and the production API origin added to
   `manifest.config.ts` (`legacy-notes/BLOCKERS.md`). **Note:** this is "running
   a business," which the human has said they want to avoid — so unless a
   marketplace fully handles billing, **Option A (on-device, no server) is the
   path that matches the zero-business-ops preference.**

4. **Real URLs before submission:** a hosted **Privacy Policy URL** (publish
   `docs/privacy-policy.md` — e.g. GitHub Pages / the marketing site) and a real
   **Support URL** (the listing currently has the `support@biddiff.example`
   placeholder).

## 👤 Human-only steps at submission time

1. **Chrome Web Store developer account** — one-time **$5** registration
   (within the pre-approved ≤$5 signup policy; `governance/SPEND_CAP.md`).
2. Open <https://chrome.google.com/webstore/devconsole> and **upload**
   `dist-zips/biddiff-v0.1.0.zip`.
3. Paste the **listing** and **permission justifications** from
   `docs/store-listing.md` (after the copy decision in gate #1).
4. Set the **Privacy Policy URL** (gate #4) and **Support URL**.
5. **Submit for review.** (Then the staged-rollout plan in
   `docs/release-runbook.md` applies.)

## Recommended fastest path to live

Pick **Option A** (on-device, free/trial, no server, no billing) → the factory
scopes all copy to match v1 → you host the privacy policy, create the $5 dev
account, upload the already-built zip, and submit. That route has **zero**
infrastructure/business blockers and is the cleanest match to the
"no business to run" preference.

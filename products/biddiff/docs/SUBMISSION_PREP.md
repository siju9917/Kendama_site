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

## ✅ Resolved this session — Option A executed (free, on-device, no server)

The strategy decision (`brain/DECISIONS.md` 2026-06-05): **BidDiff ships FREE and
fully on-device.** Chrome can't process payments (it removed them in 2020), so a
paid Chrome extension would force a self-run billing business — which the human
has refused. Free on Chrome delivers real value with zero business ops; a future
paid version would move to a merchant-of-record marketplace.

What the factory already did (the former hard blockers, now closed):

- **Scoped ALL user-facing copy to the on-device, free reality** — removed every
  license / telemetry / OCR-server / paid-tier claim from: `store-listing.md`,
  `privacy-policy.md`, `help/getting-started.md`, `help/privacy-and-security.md`,
  `help/faq.md`, `support-macros.md`, `terms-of-service.md`, `site/index.html`,
  `store-assets/specs.md`, `security-audit.md`, and the **options page** +
  **side-panel license chip** in the shipped UI.
- **Deleted the dead server-calling code** so the privacy claim is literally true
  in the bundle: removed `src/core/telemetry/`, `src/core/licensing/`, and the
  unshipped `server/`. **Verified** the rebuilt bundle contains no
  server/license/telemetry strings and only `sam.gov` as a BidDiff origin.
- Rebuilt + re-verified green and repackaged the zip.

## ⛔ What still gates submission (human-only — small)

1. **Positioning** (`human/APPROVALS.md` #1): individual-tool vs capture-team
   framing for the listing. Auto-defaults after the window; settling it just
   sharpens the copy. Not a hard blocker.
2. **Real URLs:** a hosted **Privacy Policy URL** (publish `docs/privacy-policy.md`
   — e.g. GitHub Pages) and a real **Support URL** (the listing/help still carry
   `*@biddiff.example` placeholders). These must be real before submission.

## 👤 Human-only steps at submission time

1. **Chrome Web Store developer account** — one-time **$5** registration
   (within the pre-approved ≤$5 signup policy; `governance/SPEND_CAP.md`).
2. Open <https://chrome.google.com/webstore/devconsole> and **upload**
   `dist-zips/biddiff-v0.1.0.zip`.
3. Paste the **listing** and **permission justifications** from
   `docs/store-listing.md`.
4. Set the **Privacy Policy URL** and **Support URL** (real addresses).
5. **Submit for review.**

There is **no** billing, server, domain, or merchant-of-record work — the product
is free and on-device, so those blockers no longer exist.

# Release Runbook

## Pre-flight (before any release)

> The authoritative gating order (incl. the human-gated decisions) is the
> **"Ship sequence (the critical path)"** section of `PROGRESS.md`. This
> checklist is the mechanical pre-flight; the two content gates below are the
> hard blockers it must not skip.

- [ ] **Server-claim copy matches v1 reality** (`human/NEED_FROM_HUMAN.md` #7).
      The privacy policy / store listing / options page / help / support copy
      must NOT describe license/telemetry/OCR server flows v1 doesn't perform.
      Submitting with overstated server interactions is a Web-Store-review +
      misrepresentation risk. **Hard blocker.**
- [ ] **Positioning decided** (`human/APPROVALS.md` #1) — the listing framing
      (individual vs team tool) is settled.
- [ ] `bash scripts/ci.sh` is green locally (typecheck + lint + tests + build).
- [ ] Corpus miss-rate audit passes (`test/integration/corpus.test.ts`).
- [ ] Adversarial tests pass (`test/integration/reformatting-noise.test.ts`,
      `noise-plus-change.test.ts`, `handcrafted-adversarial.test.ts`,
      `anchor-recall.test.ts`).
- [ ] `CHANGELOG.md` updated.
- [ ] `manifest.config.ts` version bumped.

## Submission to Chrome Web Store

1. `npm run build`.
2. Zip `dist/`: `cd dist && zip -r ../biddiff-v<x.y.z>.zip . && cd ..`.
3. Upload to the Chrome Web Store developer dashboard (human-only step).
4. Paste the **store listing** from `docs/store-listing.md`.
5. Paste the **permissions justifications** from the same file.
6. Set the **Privacy Policy URL** to the public copy of `docs/privacy-policy.md`.
7. Submit for review.

## Staged rollout

- Initial: release to 10% of users.
- Watch the in-product error dashboard (Phase 7.9) for 48 hours.
- If error rate < 1%, ramp to 50%, then 100%.

## Rollback

- The Chrome Web Store lets you revert to the previous version directly
  from the dashboard. Do that first.
- Communicate via the in-product Settings banner (use a feature flag
  configured server-side) and via the marketing site status page.
- Open a postmortem under `docs/postmortems/<date>-<slug>.md`.

## Cadence

- Patch releases: as needed for bug fixes, no minimum cadence.
- Minor releases: monthly.
- Major releases: announced 30 days in advance via the Settings page
  and the marketing site.

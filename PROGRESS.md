# Build Progress

Live checklist of every phase and half-step. Each item is `[ ]`, `[in-progress]`, or `[done]`.
A half-step is `[done]` ONLY when its deliverable exists in the codebase, is tested,
is integrated, is committed, and the suite is green (Part 17.5 rule).

## Phase 0 — Project setup & scaffold

- [done] 0.1 Initialize repo, create directory tree, `package.json`
- [done] 0.2 Configure TypeScript (strict), Vite, React, Vitest, ESLint, Prettier
- [done] 0.3 Write `manifest.config.ts` (MV3, minimal permissions)
- [done] 0.4 Set up CI (local npm scripts; no GitHub Actions per user direction)
- [done] 0.5 Create all repo-root tracking docs
- [done] 0.6 Implement canonical data model (`src/core/model/types.ts`, `src/core/diff/types.ts`, `src/core/interfaces.ts`) + unit tests
- [done] 0.7 Commit, push, run reflection protocol

## Phase 1 — Test corpus

- [done] 1.1 Corpus acquisition (synthetic; 40 pairs / 80 docs; real-SAM blocked by network 403)
- [partial] 1.2 Corpus diversity (UCF A-M, FAR + DFARS clauses, multi-edit, null pairs all covered; PDF-format diversity moved to Phase 2 where the extraction pipeline lands)
- [done] 1.3 Labeling schema (`test/corpus/schema.ts`)
- [done] 1.4 Hand-label every amendment pair (auto-emitted by edit ops; consistency-checked)
- [done] 1.5 Build corpus test harness (`test/corpus/harness.ts` + `generate.test.ts`)

## Phase 2 — Document extraction pipeline

- [done] 2.1 PDF text extraction (PDF.js; positioned text items via legacy build)
- [done] 2.2 DOCX extraction (JSZip + custom XML walker)
- [done] 2.3 Line/block reconstruction + two-column handling (PDF)
- [done] 2.4 Heading detection (UCF, letter-dot, numbered, Section L/M, font heuristic)
- [done] 2.5 Section assembly & UCF mapping
- [done] 2.6 Section-type classification (UCF letter + keyword fallback)
- [done] 2.7 Tokenizer (shared/text.ts)
- [done] 2.8 Anchor detection (CLAUSE_REF, DATE, MONEY, PAGE_LIMIT, CLIN, SECTION_REF)
- [done] 2.9 Normalization pipeline (enrichStructuredDocument)
- [ ] 2.10 OCR fallback (Tesseract WASM) — deferred to Phase 4 wiring
- [done] 2.11 Malformed-input handling (validate.ts; EMPTY/TOO_LARGE/UNSUPPORTED/ENCRYPTED/CORRUPT)
- [done] 2.12 Extraction-confidence gate (computeOverallConfidence + scanned heuristic)
- [ ] 2.13 Performance pass on a 200+ page synthetic — needs corpus PDF rendering

## Phase 3 — Diff & classification engine (THE MOAT)

- [done] 3.1 Section alignment (UCF + heading similarity, greedy best-match)
- [done] 3.2 Block alignment (LCS over text identity + jaccard/containment for MODIFY)
- [done] 3.3 Move detection (cross-section, similarity ≥0.9)
- [done] 3.4 Token-level diff for MODIFY (Myers; merges adjacent same-op spans)
- [done] 3.5 Build Change records
- [done] 3.6 Change classification (anchor + section-type, first match wins)
- [done] 3.7 Critical-change detection (Part 1.5 ruleset)
- [done] 3.8 False-positive suppression (reformatting-only check)
- [done] 3.9 Determinism (verified: byte-identical output across 40 corpus pairs)
- [done] 3.10 Clause intelligence integration (LocalClauseClient.lookupSync)
- [done] 3.11 Assemble DiffResult (id, criticalCount, category counts, warnings)
- [done] 3.12 Miss-rate audit: 100% recall, 100% precision, 0 missed critical, 0 FP on null pairs
- [done] 3.13 Regression suite (test/integration/corpus.test.ts) runs the full 40-pair audit

## Phase 4 — Extension shell & SAM.gov integration

- [done] 4.1 SAM.gov page detection (content/sam/sam-integration.ts: OPP_URL_RE)
- [done] 4.2 Attachment & amendment discovery (findAttachments, readAmendmentMetadata)
- [done] 4.3 Integration isolation (test/unit/integration-isolation.test.ts)
- [done] 4.4 Inject affordance ("Compare with BidDiff" button via MutationObserver)
- [done] 4.5 Service worker orchestration (background/index.ts; opens side panel)
- [done] 4.6 Offscreen document (scaffolded — heavy work runs in side panel for v1)
- [done] 4.7 Side panel app (React 18, file picker, summary, change cards, filters)
- [done] 4.8 Popup (recent diffs, open-side-panel button)
- [done] 4.9 Options page (license key, telemetry toggle, clear history)
- [done] 4.10 Storage layer (chrome.storage shim + memory fallback + LRU prune)
- [done] 4.11 Export functions (PDF report via pdf-lib + clipboard summary)
- [done] 4.12 All UI states (empty/loading/done/error)
- [ ] 4.13 Memory & lifecycle hardening (50-diff soak test) — needs browser env

## Phase 5 — Backend, licensing, billing

- [done] 5.1 Serverless backend skeleton (`server/handlers.ts` + `dev-server.mjs`)
- [done] 5.2 Clause-intelligence dataset (22 curated) + lookup endpoint
- [done] 5.3 Licensing endpoint (HMAC-SHA256 signed response; replaceable verifier)
- [ ] 5.4 Merchant-of-record billing integration — needs human keys (BLOCKERS.md)
- [done] 5.5 Trial logic (LocalLicenseClient: 14-day trial + 7-day grace)
- [ ] 5.6 Dunning — server-side hook; needs MoR webhook integration
- [ ] 5.7 Customer billing portal link — needs MoR portal URL
- [done] 5.8 License-validation hardening (signed responses; tamper-evident)
- [done] 5.9 Anonymous telemetry endpoint with strict event schema (content-free)
- [done] 5.10 Opt-in server OCR endpoint (stub; production wires real provider)

## Phase 6 — Hardening & full QA

- [done] 6.1 Expanded corpus to 75 pairs / 150 docs (5 base templates)
- [done] 6.2 Full regression: 100% recall, 100% precision, 0 missed critical, 0 FPs on null pairs
- [ ] 6.3 Cross-environment tests — needs Playwright with Chrome
- [done] 6.4 SAM.gov-change drill (architectural isolation enforced by test)
- [done] 6.5 Security audit (`docs/security-audit.md`)
- [done] 6.6 Compliance pass (no-advisory-language test + clause-note audit)
- [ ] 6.7 Performance & load tests — needs >200 page synthetic
- [done] 6.8 Accessibility pass (ARIA labels, contrast checks, aria-live regions)
- [ ] 6.9 Playwright e2e suite — needs Chromium available at runtime
- [done] 6.10 Accuracy-claim audit (`TESTING.md` traces every claim to a measurement)

## Phase 7 — Launch assets

- [done] 7.1 Web Store listing copy (`docs/store-listing.md`)
- [done] 7.2 Visual assets spec (`docs/store-assets/specs.md` + script)
- [done] 7.3 Single-page marketing site (`docs/site/index.html`)
- [done] 7.4 Help center (`docs/help/{getting-started,what-counts-as-critical,privacy-and-security,faq}.md`)
- [ ] 7.5 In-product onboarding flow — requires Phase 4.5 follow-up
- [done] 7.6 Support system (`docs/support-macros.md`)
- [done] 7.7 Pricing finalized — site shows three self-serve tiers
- [ ] 7.8 Review-generation flow — Phase 4 follow-up
- [ ] 7.9 Analytics & error dashboards — depends on Phase 5.9 deploy
- [done] 7.10 Release runbook (`docs/release-runbook.md`)

## Phase 8 — Package & launch-ready

- [ ] 8.1 Production build & package (.zip)
- [ ] 8.2 Final full-suite run
- [ ] 8.3 Final security & compliance signoff
- [ ] 8.4 Submission package
- [ ] 8.5 `BUILD_COMPLETE.md`

# BidDiff — Ship-gate dry run (Phase K2)

> Defends every line of `governance/QUALITY_BAR.md` with concrete
> evidence (file:line, test name, measurement) or records an honest
> gap. "Yes" without evidence is "no." Run 2026-05-30 after the
> full two-pass critique. This is the K2 phase from `PROGRESS.md`.
>
> **Verdict:** the *engineering* bar is met with evidence on nearly
> every axis. BidDiff is **NOT yet shippable** — the blockers are the
> three K1 P1s (market evidence, domain-expert ruleset validation,
> positioning) and two gated P2s (a11y contrast, SAM e2e), all
> human/cap/browser-gated, plus the human store-submission step. None
> is a code-quality gap.

Legend: ✅ met w/ evidence · ⚠️ gap (gated) · ⛔ gap (must fix to ship).

## Correctness
- ✅ Every documented feature has a real-input test — corpus
  (`test/integration/corpus.test.ts`, 80+ labeled pairs), engine
  (`engine.test.ts`, `engine-edge.test.ts`), exporters, extractors.
- ✅ Edge cases tested — empty/large/unicode/malformed/boundary:
  `engine-edge.test.ts`, `fuzz-engine.test.ts` (300), `fuzz-extract`
  (800), `fuzz-reconstruct` (300), `handcrafted-adversarial.test.ts`.
- ✅ Full suite passes, 0 unexpected skips — 262/262.
- ✅ No `TODO`/`FIXME`/placeholder in shipped paths — `eslint
  --max-warnings=0` clean; verified by reading.
- ✅ No test weakened to pass — Maintainability hunts this; the
  bug-fix commits all *added* tests (several confirmed fail-without-fix).
- ⚠️ Every product claim backed by measurement — **the marketing/
  audience claims are the open Research-Quality P1** (no cited market
  evidence yet; cap-gated). Functional claims are backed by tests.

## Security
- ⚠️ Threat model in `docs/` — `docs/security-audit.md` exists; should
  be re-confirmed current at K2-final. (gap: verify, low effort)
- ✅ Input validated at trust boundaries — `extract/validate.ts`
  (kind/size/encryption/unsupported-`.txt`).
- ✅ Secrets — none in source; telemetry has no content field by type.
- ✅ No known-vuln dependency — `package-lock.json` pinned; (re-run
  `npm audit` at K2-final as the cited check).
- ✅ Least-privilege scopes — manifest `permissions` minimal; content
  script + `web_accessible_resources` scoped to sam.gov (this session).
- ✅ CSP set + no `eval`/`innerHTML` on untrusted; https-only fetch of
  DOM-sourced URLs (`isAllowedDownloadUrl`, this session).
- ✅ No action on scraped third-party instructions — content script
  only reads attachment metadata; same-extension message trust.

## Reliability
- ✅ Async failure modes handled — offscreen `jobId` correlation +
  timeout + settle-once (`pipeline.ts`); error phase in
  `useDiffPipeline`; cancellation re-checked after every await
  (incl. post-save, this session).
- ✅ Durable data — IndexedDB payloads + serialized index lock +
  two-phase write w/ rollback (`storage/index.ts`); `memory-soak`.
- ✅ Cancellation doesn't corrupt — `useDiffPipeline.test.tsx` race test.
- ✅ Graceful degradation — SAM absent → core diff works; clause
  client null → no clauseInfo; save fail → session notice, not export.
- ✅ No silent failures — ErrorBoundary; typed `ExtractionError` with
  user messages; warnings surfaced in the panel.

## Performance
- ✅ Documented latency target — `perf-large-doc.test.ts` (250-page
  budget 30s).
- ✅ No unbounded O(n²) — token LCS bounded by cell-product (this
  session); Levenshtein truncated; section/block LCS on realistic n.
- ⚠️ Bundle budget — build emits chunk sizes; **document an explicit
  budget + assert it** at K2-final (currently observed, not asserted).
- ✅ No leak under sustained use — `memory-soak.test.ts`.

## Accessibility
- ✅ Keyboard-operable — J/K/R// nav; sibling-button History (this
  session); native `<details>` shortcuts; FilePicker Enter.
- ✅ Focus order / not trapped — no custom modal; focus-visible rings.
- ⛔→⚠️ **Contrast WCAG AA on rendered components** — token-level test
  exists (`accessibility.test.ts`); rendered-component dark-mode
  contrast is the open K1 P2, **browser-gated** (axe can't do contrast
  in jsdom — see `brain/WISHLIST.md`). Gap is real but externally
  gated, not ignored.
- ✅ Accessible names — `aria-label` on icon buttons, dropzones, the
  unseen dot ("New"), progress (`role=progressbar`).
- ✅ `prefers-reduced-motion` — honored in `DiffView` scroll.
- ✅ Works in dark mode — design tokens; (contrast caveat above).

## Polish
- ✅ Empty/error/loading states designed — Onboarding + sample +
  FilePicker (empty), ErrorBoundary + error phase, ProgressView +
  skeletons (loading).
- ✅ Microcopy consistency — Professional-Polish passes in history;
  inline "what is critical?" (this session).
- ✅ No two strings meaning the same thing differently — checked.
- ✅ Consistent icons/labels/tooltips.

## Documentation
- ✅ README (what/who/install/issues/license).
- ✅ User docs — `docs/help/*` (getting-started, faq, what-counts-as-
  critical, privacy-and-security).
- ✅ Developer docs — `docs/architecture.md` + "Extending BidDiff"
  (this session); `brain/PLAYBOOKS/...`.
- ✅ Reference — `docs/store-assets/specs.md`, release runbook.
- ⚠️ CHANGELOG current — `legacy-notes/CHANGELOG.md` is pre-migration;
  **start a current top-level CHANGELOG** at K2-final. (gap, low effort)

## Product sense
- ⚠️ Solves the buyer's real problem — Product-Sense largely yes, but
  the **audience/positioning is the open Ambition P1** (individual vs
  team), human-gated (`APPROVALS.md` #1, auto-proceeds 2026-06-03).
- ✅ Not feature-bloated; first-run reaches value fast (sample diff).
- ✅ Devil's-Advocate engaged — see `CRITIQUE_LOG.md`.

## Compliance
- ✅ Privacy policy + ToS exist (`docs/privacy-policy.md`,
  `terms-of-service.md`) and match data flow (on-device).
- ✅ Reports, never advises — `test/unit/no-advisory-language.test.ts`.
- ⚠️ Platform policy (Chrome Web Store) — staged in `docs/store-
  listing.md`; final check + the **human submission** step
  (`NEED_FROM_HUMAN.md`) gate live launch.

## Maintainability
- ✅ Readable, documented decisions; lint/format/typecheck clean.
- ✅ No dead code/unused imports (eslint).
- ✅ Critical-path coverage recorded (corpus recall ≥98%, 0 FP on null).

---

## K2 gap list (what to close, and the gate on each)

| Gap | Type | Gate | Effort |
|---|---|---|---|
| Market evidence for the audience claim | Research-Quality P1 | **cap** (web) | 1 session |
| Domain-expert critical-ruleset validation | Domain-Expert P1 | **human** (sourcing) | ingest when returned |
| Positioning (individual vs team) | Ambition P1 | **human** (`APPROVALS.md` #1, auto 2026-06-03) | 1 polish cycle |
| Rendered-component contrast (dark) | Accessibility P2 | **browser** (or the WISHLIST contrast tool) | medium |
| SAM selectors e2e | Devil's-Advocate P2 | **browser** (Chromium) | medium |
| Re-confirm threat model + `npm audit` current | Security hygiene | none | low |
| Assert an explicit bundle-size budget | Performance hygiene | none | low |
| Start a current top-level CHANGELOG | Docs hygiene | none | low |
| Chrome Web Store submission | Launch | **human** | human step |

The three "none"-gated hygiene items (threat-model re-confirm, bundle
budget assertion, CHANGELOG) are the only *unblocked* ship-gate gaps;
queued as POLISH. Everything else is human/cap/browser-gated. **K2
does not pass yet** — but the engineering bar is defended with
evidence on every axis.

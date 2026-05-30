# PLAYBOOK — Chrome MV3 "critical-change diff" products

> First playbook. Codifies what BidDiff (`products/biddiff/`) taught,
> so the next Chrome MV3 extension AND the next critical-change-diff
> product (the D1–D5 family in `brain/IDEA_BACKLOG.md`) inherit the
> hard-won patterns instead of re-deriving them. Written 2026-05-30
> after an exhaustive two-pass critique of the BidDiff codebase
> (manual read + property-based fuzz; see
> `products/biddiff/CRITIQUE_LOG.md`).

This playbook has two halves:
**(A)** the reusable *critical-change diff engine* shape, and
**(B)** the *Chrome MV3 extension* shell. D1/D5 (library, VS Code)
need only A; D2/D4 (GitHub/Shopify apps) need A + a server; a new
browser extension needs A + B.

---

## A. The critical-change diff engine

**Core competency:** diff two versions of a structured document and
classify which changes are *materially critical* to a specific
professional, then **report — never advise.**

### Pipeline (each stage pure + deterministic)

```
bytes → validate → extract (PDF/DOCX) → reconstruct lines →
assemble sections → enrich anchors → DIFF ENGINE → classify →
flag-critical → suppress-reformatting → render / export
```

- **Keep every stage a pure function.** IDs are content hashes
  (`shared/hash.ts`), never random; no `Date.now()` / `Math.random()`
  in the engine; the one non-deterministic field (`generatedAt`) is
  set by the caller. This makes the whole engine fuzzable and
  golden-testable.
- **Determinism discipline (load-bearing):**
  - Content-hash IDs — and the hash must actually deliver its width
    in entropy (BidDiff bug: a "salted" second pass that re-hashed
    the same input gave 32-bit, not 64; move-detection dedups by id,
    so a collision drops a change).
  - **No `localeCompare` in any determinism-critical sort** — use
    code-point comparison; `localeCompare` varies by host locale.
  - Pin any library's embedded timestamps (BidDiff pins pdf-lib's
    `/CreationDate` + `/ModDate` to the DiffResult's `generatedAt`)
    so exported bytes are reproducible.
- **Two similarity passes:** LCS over block-text equality for
  alignment, then pair adjacent DELETE+INSERT into MODIFY by
  `max(jaccard, containment)` similarity. Move detection runs ACROSS
  sections on the leftover INSERT/DELETE set.
- **The critical-rule pack is the only domain-specific layer.** Keep
  `classify` (category) and `evaluate-criticality` (severity)
  data-driven so a new vertical (protobuf, Shopify theme, OpenAPI,
  contracts) is a new rule pack, not an engine fork. This is the
  whole thesis of the D1–D5 family.

### Resource bounds (Performance/Adversarial)

- Any O(n·m) **space** algorithm (LCS dp) must be bounded on the
  **product** n·m, not per dimension. BidDiff bug: a per-dimension
  10k cap still allowed a 10k×10k = ~400 MB dp. Use a cell budget
  (~4M ≈ 16 MB) and degrade gracefully (whole-block diff, no token
  spans) above it.
- Truncate Levenshtein/LCS inputs (e.g. headings) to a max length.

### Suppression (the most dangerous correctness surface)

- "Reformatting-only" suppression hides a change permanently. It
  must **never collapse two distinct numeric values** to equal.
  BidDiff bug: stripping all punctuation made `$1.5M` == `$15M`.
  Preserve digit-flanked punctuation; only strip value-preserving
  marks (en-US thousands commas). **Bias toward surfacing** — a false
  positive (showing a non-change) is far cheaper than a false
  negative (hiding a real one) for a "never miss a change" tool.

### Extraction gotchas (from the PDF/DOCX work)

- Normalize once, centrally: ligatures, soft/zero-width chars, NBSP,
  control chars, EOL-hyphen rejoin, clause-number rewrap. Both
  extractor and engine MUST use the same normalizer.
- Validate calendar dates (reject Feb 30) — a regex-shaped date isn't
  a real one.
- Parse magnitude suffixes in money (`$1.5M`, `$2.3 million`).
- DOCX: a tiny tag-aware regex walker beats bundling a heavy lib;
  decode numeric XML entities BEFORE named ones and clamp code points
  (`&#x110000;` would throw `String.fromCodePoint`). Nested tables
  parse approximately — document the limitation.
- Reject recognized-but-unsupported kinds (`.txt`) at the trust
  boundary; never let them fall through to the wrong extractor.

### Compliance: "reports, never advises"

- One canonical disclaimer string, reused in UI + every export.
- An **automated test** greps all BidDiff-authored prose (UI JSX,
  export templates, clause notes, engine warnings) for advisory
  phrasing ("you should", "we recommend", "please ensure"). This is
  cheap and catches drift forever.

### Testing strategy (what actually caught bugs)

- A **labeled synthetic corpus** (prior/current pairs + expected
  critical changes) for recall/precision + null pairs for zero false
  positives.
- **Integration tests** that run real changes buried in reformatting
  noise (proves suppression doesn't eat real changes).
- **Property-based fuzz** (seeded PRNG) asserting invariants for ALL
  input: never throws, deterministic, self-diff empty, counts
  consistent, confidence ∈ [0,1], well-formed output. Fuzz the
  engine AND the untrusted-input parsers (DOCX XML, anchors).
- Memory soak (50 sequential diffs, RSS bounded) + perf budget.

---

### `regdiff` extraction map (the portfolio play, grounded in code)

The thesis "engine is horizontal, rule-pack is federal-specific" is
validated by
`products/biddiff/test/integration/engine-domain-agnostic.test.ts`.
When a derivative (`brain/IDEA_BACKLOG.md` D-family / rank-2) is
approved, extract the **core** below into a shared `regdiff` package
*as a byproduct of building that product* (do not build the library as
a standalone product first — it monetizes weakly; see the
portfolio-sequencing insight in `IDEA_BACKLOG`). Each BidDiff module is
one of three layers:

| Layer | Modules | Reuse |
|---|---|---|
| **Domain-agnostic CORE** (→ `regdiff`) | `core/diff/*` (engine, align, myers, tokens, suppress), `shared/text.ts`, `shared/hash.ts`, `core/model/*`, `core/extract/sections/*`, `core/extract/pdf/reconstruct.ts`, `core/extract/normalize.ts` | Verbatim — the reusable engine + structured-doc model. |
| **Rule-pack** (federal — swap per vertical) | `core/diff/classify.ts`, `core/diff/critical.ts`, `core/extract/anchors/index.ts` (DATE/MONEY/CLAUSE_REF/CLIN/PAGE_LIMIT/SECTION_REF), `core/clauses/*` | Replace with the new vertical's anchors + categories + criticality + reference dataset. This is the per-product work. |
| **Product SHELL** (per distribution surface) | `sidepanel/*`, `popup/*`, `options/*`, `background/*`, `offscreen/*`, `content/*`, `core/storage/*`, `core/export/*`, `core/{licensing,telemetry}/*`, `manifest.config.ts` | Rewrite per surface (MV3 extension vs. GitHub App vs. MCP server vs. JetBrains plugin). Section B is the MV3 sub-playbook. |

Decoupling work to extract cleanly (do it *as* the first derivative is
built, not speculatively): make the rule-pack data-driven (the rank-5
"rule-pack loader" — `classify`/`critical` become a loaded ruleset, not
hard-coded `if`s) and parameterize the anchor set. The core already has
no federal coupling (the thesis test proves it), so the extraction is
mechanical, not a rewrite.

## B. The Chrome MV3 extension shell

- **Surfaces:** side panel (workspace), popup (quick open + recent),
  options (settings), background service worker (thin), offscreen
  document (heavy CPU).
- **Offscreen for CPU:** run extraction+diff in
  `chrome.offscreen` so the panel UI never blocks. Correlate
  responses by a **`jobId`** — the panel listener ignores any message
  whose jobId ≠ the current job, so a superseded job's late result is
  dropped. Always include a **timeout safety net** and a settle-once
  guard. The offscreen worker is NOT cancellable across the boundary;
  the panel just drops stale results.
- **MV3 SW is ephemeral** (~30s idle kill): keep any cross-message
  state in `chrome.storage.session`, never module globals.
- **`sidePanel.open` needs a user gesture** consumed by `await` — do
  any storage write WITHOUT awaiting, then call open in the same
  click handler.
- **Async cancellation:** re-check the abort signal after **every**
  await — including post-success persistence (BidDiff bug: a late
  `setState(DONE)` after `saveDiff` clobbered the user's "Start
  over").
- **Storage:** small index in `chrome.storage.local`, large payloads
  in IndexedDB (10 MB local quota is per-extension). Two-phase write
  with rollback; serialize index mutations through a single
  promise-chain lock (chrome.storage has no transactions); LRU prune.
- **Security/least-privilege:**
  - Restate the CSP in the manifest (`script-src 'self'`).
  - Scope content scripts AND `web_accessible_resources` to the
    minimum origins — not `<all_urls>` (that exposes a
    extension-detection fingerprint to every site).
  - Scheme-allowlist (https) any `fetch` of a DOM-sourced URL.
  - Isolate licensing/telemetry from document content (an automated
    integration-isolation test forbids the import).
  - Telemetry: no content field in the event type at all; ephemeral
    session id; opt-out honored.
- **A11y baseline:** keyboard-operable everything, `role`/`aria` on
  custom controls, `prefers-reduced-motion`, designed empty/loading/
  error states, an ErrorBoundary that truncates error text (no path
  leakage) and stays recoverable.

### Distribution / monetization

- The store submission is a **human-gated** step (GUARDRAILS #11) —
  the factory stages the package; the human submits.
- Trial/license: local trial client for v1, server-validated signed
  keys later; the local clock-skew trial-extension is a known
  limitation the server closes.
- The playbook generalizes to Edge and Firefox stores — cheap
  distribution expansion once Chrome ships.

---

## The recurring bug archetypes (pre-empt these on every product)

From `brain/LESSONS.md` 2026-05-30 — bugs cluster at invariants that
*look* settled:

1. **Over-normalization** collapsing distinct inputs (esp. numbers).
2. **Resource caps** on the wrong metric (per-dimension vs product).
3. **Trust boundaries** — recognized ≠ supported; allowlist schemes.
4. **Async cancellation** — re-check after every await.
5. **"Self-evidently correct" primitives** — a hash, a comment that
   lies about its own code.

These are now Correctness/Performance/Reliability/Security checklist
items in `governance/CRITIQUE_AGENTS.md`; this playbook is the
product-build-time companion to that panel.

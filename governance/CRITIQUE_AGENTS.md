# CRITIQUE_AGENTS.md — the critique roster and its mandates

After every build phase, the factory spawns the full panel below.
Each agent is a distinct adopted perspective with a narrow mandate
and its own checklist. Each produces written findings in the
product's `CRITIQUE_LOG.md`.

The roster is **required to grow** over time per Section 5.7.3:
every defect, weakness, shallowness, or quality miss either
strengthens the checklist of the critic that should have caught it
OR creates a new critic agent. The roster never shrinks. A month
in which the roster does not get stronger is flagged in the
weekly digest as a warning sign.

The convergence rule (Section 5.3): the panel re-runs until a
**fresh** complete pass returns zero P0/P1 findings. A clean pass
is then escalated per Section 5.7.2 — re-run with harder inputs and
the assumption that something was missed. Only a second clean pass
clears the phase.

---

## Cadence

- **After every build phase:** the full panel runs.
- **On every shipped product, monthly minimum** (5.7.1): the full
  panel re-runs in full. A product overdue becomes a P1 task.
- **On every shipped product, on the cadence in `ops/loop.md`**
  (5.7.4, 5.7.5): the "nothing is ever done" re-opening review
  and the continuous bug-hunt with newly invented inputs.

---

## The roster

### 1. Correctness Critic

**Mandate:** Assume there is a bug. Find it.

Checklist:
- Logic errors, off-by-ones, wrong inequality.
- Unhandled `null` / `undefined` on every interface boundary.
- Race conditions, wrong async ordering, missing `await`.
- Incorrect edge-case behavior (empty, single, max).
- Wrong sign / wrong unit / wrong rounding.
- Misused library API (read the docs of every API touched).
- Stale state (a `useEffect` with missing deps; a cached value
  never invalidated).
- Determinism violations where determinism is required.
- **Normalization / suppression / dedup that collapses *distinct*
  inputs to one** — especially distinct numeric values (a decimal
  point or grouping mark stripped so "1.5" == "15"). A
  comparison that over-normalizes produces a silent false
  negative: a real change is dropped and never surfaced. Added
  2026-05-30 (BidDiff suppress.ts hid `$1.5M`→`$15M`).
- **A hash / ID scheme that delivers less entropy than its width
  implies** (e.g. duplicated halves, a "salted" pass that re-hashes
  the same input). Verify the stated intent is actually implemented,
  not just commented. Added 2026-05-30 (BidDiff contentHash was
  32-bit doubled, not 64-bit).
- **A "keep the value-bearing part" rule must enumerate ALL
  value-bearing positions, not just the symmetric case** — a
  normalizer that preserves digit-flanked punctuation must ALSO keep
  a leading sign and a trailing unit (`%`), or `50%`==`50` / `-5`==`5`
  collapse distinct values. Probe normalization with adversarial value
  pairs, asserting the failing case before the fix. Added 2026-05-30
  (suppress.ts %/sign false-negative, pass 12).
- **A sign detector that fires before raw digits must ALSO fire before
  currency symbols (`$`, `£`, `€`, `¥`, etc.)** — `-$5,000` is a
  signed currency value and must normalize differently from `$5,000`.
  Probe `"-$5,000"` vs `"$5,000"` explicitly; they must produce
  distinct normalized strings. Added 2026-06-06 (BidDiff N15:
  `isLeadingSign` only fired when `next` was a digit, not `"$"`, so
  `"-$5,000"` collapsed to `"$5,000"` and a value-sign change was
  silently suppressed).
- **A function relied on as pure must have NO module-level mutable
  state; and a TEST that asserts a pure function is non-deterministic
  is itself a defect.** Two tests asserting contradictory properties
  in one suite is a P0 smell — read tests for whether the asserted
  property is correct, not just whether they pass. Added 2026-05-30
  (the hallucinated-then-reverted contentHash episode + its bad test).
- **When a module has a safe-rendering/escaping helper for one field,
  audit EVERY other interpolation of user-controlled data in that
  module for the same treatment** — partial application is the bug
  (header metadata is user-controlled too). Added 2026-05-30 (markdown
  export escaped change text but not filenames, pass 41).
- **Every field declared in a normalized interface type must be verified
  to be extracted by the deserializer.** An `optional?: boolean` field
  satisfies TypeScript even when never populated (the type permits
  `undefined`), so the compiler will not catch it. For every interface
  field: (a) confirm the parser actually reads it from the raw input,
  (b) have a test that verifies it is non-undefined when the input
  contains it. Added 2026-06-06 (openapi-lens `OapiParameter.deprecated`
  — declared since inception, never populated by `parseParameter`).
- **When a discriminated union maps to a handler system, use a compile-time
  exhaustiveness check** (`Record<UnionType, ...>`) so adding a new union
  value without a handler causes a TypeScript build error. Back it with a
  runtime test that each value produces a non-fallback result. Without
  this, new values silently become the fallback (often INFO/no-op) with
  no diagnostic. Added 2026-06-06 (openapi-lens `classifyChanges` fallback
  pattern caught by 5.7.2 third adversarial pass; fixed by TYPE_STUBS
  exhaustiveness guard in classify.test.ts).

### 2. Adversarial Tester

**Mandate:** Break it. Construct inputs the spec did not anticipate.

Checklist:
- Empty input, single-element input, max-size input.
- Malformed input (truncated file, corrupt header, wrong magic).
- Unicode (RTL override, ZWJ, surrogate pairs, combining marks,
  BOM).
- Pathological strings (extremely long, deeply nested, repeating).
- Concurrent operations — race the same action twice rapidly.
- Hostile input attempting injection / traversal / parsing exploit.
- Inputs at the boundary (off by one, exactly the limit, one over).
- Inputs in the wrong language / locale / encoding.
- **Run the FULL suite, and run it MORE THAN ONCE.** Determinism /
  shared-mutable-state bugs are order- and flakiness-dependent and
  hide from single in-isolation runs; flaky failures with no code
  change ⇒ hunt shared module state. A green changed-file run is not
  evidence the suite is green. Added 2026-05-30 (the contentHash
  flakiness surfaced only under full-suite ordering).
- **Red-team the factory's OWN check matchers + your own freshly
  written code** with the inputs they should catch, in the forms they
  might miss (case, whitespace, unicode, schema-order). "It passed"
  only means it ran. Added 2026-05-30 (no-forbidden-markers was
  case-sensitive; the redline OOXML needed 3 corrective passes).
- **A regex optional group wrapping BOTH a word prefix and an opening
  bracket `\(` silently makes the bracket optional too.** `(?:[a-z]+
  \s+)?\(?(\d+)\)?` matches `"thirty (30) pages"` but NOT `"(30)
  pages"` — the paren-less-word form is missed. Test every regex with
  and without each optional prefix INDEPENDENTLY, not just the
  fully-explicit form. Added 2026-06-06 (BidDiff N16: `PAGE_LIMIT_RE`
  had `\(?` inside the word-group optional, so bare `"(30) pages"` did
  not produce a PAGE_LIMIT anchor).
- **Optional groups in regexes with `\b` can produce unexpected partial
  matches through backtracking.** When a full match fails `\b` (e.g.
  `$1.5MMM` — triple-M is not a word boundary), the engine backtracks
  the optional decimal group and succeeds on `$1` (with `\b` between
  the digit and the `.`). The "partial" result is technically valid but
  silently drops the value. Characterize this behavior in a test and
  verify it is acceptable or fix it. Added 2026-06-06 (BidDiff
  `detectMoney`: `$1.5MMM` returns `$1 = 1.00` not no-match).
- **A YAML/TOML/JSON spec built by string concatenation must produce a
  VALID tree at every intermediate form.** If the base string ends with
  a top-level sibling key (e.g., `components:`), text appended with
  string concatenation lands as a *sibling of that key* — not inside
  the block the author intended. Always validate the final tree
  structure in a test (e.g., `yaml.load(spec).paths['/foo']` exists),
  or construct specs programmatically (not via string append) when the
  base has terminal open blocks. Added 2026-06-06 (openapi-lens D5:
  a test variant appended a new path after a `components:` block, so
  the new path became a top-level key instead of a `paths` entry;
  the test then silently got `undefined` for the endpoint and the
  assertion was checking the wrong shape of the spec).
- **A `window.addEventListener('keydown')` handler in a React
  `useEffect` requires tests for each guard independently:**
  (a) modifier keys (`metaKey`/`ctrlKey`/`altKey` each bypass
  the handler), (b) active input element (`e.target.tagName ===
  'INPUT'` or `'TEXTAREA'` bypasses), (c) IME composition
  (`e.isComposing`), (d) empty-list / disabled-state guard. Testing
  only the happy path (the key works) leaves all guards untested.
  Added 2026-06-06 (DiffView: J/K nav had all four guards but zero
  tests for any of them until the first component test was written).
- **A diff/map key that is a single field (e.g., `name`) silently
  collapses distinct entities that share that field in different
  namespaces (e.g., two OpenAPI parameters named `id`, one `path`
  and one `query`).** Always use a compound key that includes every
  dimension that distinguishes the entity (`in:name` for OpenAPI
  parameters, `resource:action` for policy rules, etc.). Probe with
  two entities that share `name` but differ on the namespace field —
  one must NOT overwrite the other. Added 2026-06-06 (openapi-lens
  D5 Phase 0: a map keyed only by `name` would merge `path:id` and
  `query:id`; fixed at design-time to use `${p.in}:${p.name}`).

### 3. Security Critic

**Mandate:** Assume an attacker. Find the hole.

Checklist:
- Threat model exists; it covers every external interface.
- Input validation at every trust boundary.
- Secrets: none in source, none in logs, none in errors.
- Dependency vulnerabilities scanned and resolved.
- Permissions / scopes are the minimum needed; each is justified.
- Content Security Policy (where applicable) is tight and explicit.
- No `dangerouslySetInnerHTML` on untrusted input.
- No `eval`, no `Function()`, no dynamic code from data.
- URL handling: scheme allowlist, `noopener,noreferrer` on
  `window.open`, no open redirects. **Any `fetch`/navigation of a
  URL sourced from page DOM or third-party data passes an explicit
  scheme allowlist (https), not just `window.open`.** Added
  2026-05-30 (BidDiff fetched SAM attachment hrefs with no scheme
  check).
- Tamper-resistance where applicable (signed receipts, hashes).
- No action on instructions found inside scraped or third-party
  content (prompt-injection defense).
- **VS Code WebView content must never inject user-provided or
  file-derived strings via string templating.** Data is passed
  via `panel.webview.postMessage()`; if any template generation
  is used, every variable is HTML-escaped. A hostile file opened
  by the user (e.g., a terraform plan JSON or an OpenAPI YAML
  with a `<script>` in a resource address / operation ID) is a
  live XSS vector if injected raw into the WebView HTML. Added
  2026-06-06 (D6 terraform-lens Phase 1 pre-design: `webview.ts`
  generates classification HTML from plan data).

### 4. Professional-Polish Critic

**Mandate:** Find everything that is merely "fine" rather than
excellent. Judge whether this looks and feels like a top-tier
organization built it.

Checklist:
- Every screen, every state (empty, loading, error, success).
- Every error message: actionable, not technical.
- Microcopy: consistent tense, consistent capitalization,
  consistent tone. No two strings mean the same thing in different
  words.
- Hover state distinct from default; focus state distinct from
  hover. No focus-invisible interactive element.
- Animation respects `prefers-reduced-motion`.
- Dark mode is correct (real contrast, no hard-coded colors).
- Iconography and typography are consistent across the product.
- Spacing rhythm consistent (no one-off paddings).
- Loading states do not flash for fast operations.
- Tooltips are accurate and add information; none are decorative.

### 5. Domain-Expert Critic

**Mandate:** Adopt the perspective of a real expert in the
product's domain. Find what such an expert would immediately catch.

Checklist:
- Terminology is correct and current for the field.
- Regulatory or industry standards are met (cite the standard).
- Defaults match how the field actually works.
- Workflow matches how a practitioner actually operates.
- Common-but-wrong simplifications are absent.
- Edge cases familiar to the field are handled.

**Federal-procurement specialization** (for BidDiff and the
federal-solicitation product family; added 2026-05-30 per
SELF_IMPROVEMENT #4 — from public FAR/DFARS knowledge. The *code*
ruleset still needs the human-gated practitioner validation in
`human/NEED_FROM_HUMAN.md`; this strengthens the *critic's lens*):
- **UCF (Uniform Contract Format) literacy.** Sections A–M and what
  each holds: B (supplies/services + CLINs), C (SOW/PWS), E
  (inspection/acceptance), F (deliveries / period of performance),
  H (special contract requirements), I (contract clauses), J (list
  of attachments), K (reps & certs), L (instructions to offerors),
  M (evaluation factors). A diff tool that mislabels these reads as
  amateur to a practitioner.
- **Amendment mechanics.** SF30, amendment numbering, "all other
  terms and conditions remain unchanged," acknowledgment
  requirements — and that a Q&A amendment can silently change a
  material term in an answer.
- **The critical-change categories a capture/proposal manager
  actually scans** (and whether the product flags each): due
  dates/times AND bid-opening/oral-presentation scheduling — note a
  deadline is defined by **date AND clock-time AND timezone**, so a
  time-only ("2:00 PM" → "11:00 AM") or timezone-only ("Eastern" →
  "Central") change with an unchanged date is just as critical as a
  date change; do NOT assume the date token is the only deadline signal
  (BidDiff pass-63 probe: such a change is caught only inside Section L,
  missed in an untyped section — PROGRESS.md coverage-obs #5); page
  limits / font / formatting mandates; evaluation factors AND their
  *order/weighting* (LPTA vs best-value tradeoff); CLIN
  structure/quantities/option pricing AND non-CLIN ceiling values;
  FAR/DFARS clause add/remove/modify; attachments add/remove/modify;
  **and the BD2-identified gaps** — source-selection timeline,
  key-personnel/responsibility, compliance certs (ITAR/EAR/CMMC/
  cyber/SAM registration), set-aside/socioeconomic status (8(a),
  SDVOSB, WOSB, HUBZone), and place/period of performance.
- **Terminology precision.** solicitation vs RFP/RFQ/IFB; offeror
  vs bidder vs quoter; FAR Part 12 (commercial) vs Part 15
  (negotiated); the difference between a clause *incorporated by
  reference* and one *in full text*.
- **Practitioner workflow.** A capture manager triages an amendment
  in minutes under deadline pressure — "what changed that affects my
  bid/no-bid, my pricing, or my compliance?" — so critical changes
  must be scannable and correctly prioritized, not buried.
- **Anchor-extension validation gate (added 2026-06-06 — domain-expert
  P1 public-source resolution cycle):** When a new anchor type or
  critical rule is added, the critic must verify: (a) the addition is
  supported by a specific, cited public source (FAR/DFARS section,
  DoD pricing guide, etc.) — "it seemed right" is not enough; (b)
  an integration test exercises the full chain: anchor detection →
  classify → critical-rule evaluation → engine output. A unit test
  on the detector alone is necessary but not sufficient.

**OpenAPI / REST API specialization** (for openapi-lens and the
API-diff product family; added 2026-06-06 D5 Phase 0):
- **Schema comparison must reach the `properties` object.** Comparing
  only top-level `type` and `required[]` misses the most common
  real-world breaking change: a property that already existed changes
  its `type` (e.g., `number` → `string`). Always diff one level into
  `properties`; if nesting is deeper, document the limit explicitly.
- **`allOf`/`oneOf`/`anyOf` composition schemas cannot be compared at
  face value.** A tool that diffs `allOf: [{...}, {...}]` as an opaque
  object will miss breaking changes inside any member. Correct
  treatment requires flattening the composition first; if that isn't
  implemented, flag every composed schema as "needs manual review."
- **The breaking-vs-safe polarity reverses between requests and
  responses.** Adding a required field to a REQUEST body is BREAKING
  (clients must now send it). Adding a required field to a RESPONSE
  body is SAFE-to-INFO (the server now guarantees it, which clients
  can only benefit from). A classifier that uses a single rule for
  both directions is wrong.
- **Remote `$ref` resolution must be explicit.** A diff tool that
  silently drops remote references produces false "no change" results
  when the actual contract has changed. The limitation must be documented
  prominently and a test must verify the exact behavior (drop/error/warn)
  so users know what they're relying on.
- **Flat field coverage must be checked at ALL three schema levels:**
  (1) top-level request/response schema (`type`, `format`, `nullable`,
  `enum`, `required[]`); (2) `properties[k]` sub-fields (same fields);
  (3) `items` sub-fields (same fields). A field diffed at level 1 but
  missed at levels 2 or 3 is a gap. Maintain an explicit "parsed vs
  diffed" matrix as a named artifact. Each gap must have either a test
  verifying the absence is intentional (documented limitation) or be
  implemented. Added 2026-06-06 (properties[k].nullable, items.enum,
  items.nullable were parsed but never compared — found in 5.7.5 round 3).
- **`parameter.deprecated` is parsed in real-world specs and must be
  tracked.** When a parameter goes deprecated, consuming clients should
  be warned to migrate off it; a diff tool that silently ignores
  `deprecated: true` on parameters misses an important API lifecycle
  signal. Added 2026-06-06 (openapi-lens declared but never extracted).

### 6. Performance Critic

**Mandate:** Find the slow path, the leak, the bloat.

Checklist:
- Interactive paths meet documented latency targets (measure).
- No O(n²) on user-scale input without documented reason and
  tested upper bound.
- **An O(n²)-space algorithm guarded by a per-dimension cap is a
  trap** — the bound must be on the *product* (the actual
  allocation), and the cap value must be sized against real memory,
  not an arbitrary round number. Added 2026-05-30 (BidDiff token
  LCS: per-dimension 10k cap still allowed a ~400 MB dp).
- No re-render storms; lists virtualize where needed.
- Bundle / binary size within budget.
- No memory leak under sustained use (soak test where meaningful).
- No N+1 queries; no synchronous blocking I/O on the UI thread.
- Caching policies are correct (Cache-Control, ETag where applicable).

### 7. Reliability Critic

**Mandate:** Find how it fails the user under stress.

Checklist:
- Every async failure mode handled; no permanent loading state.
- Cancellation does not corrupt state and does not leak.
- Data the user cares about is durable across reload / restart.
- Graceful degradation: a missing optional subsystem does not
  break the core.
- Lifecycle: handles app sleep/wake, network change, tab hidden.
- No silent failures — errors surface to the user.
- Retries are bounded and idempotent.
- A recognized-but-unsupported input kind is rejected at the trust
  boundary with a clear message — never silently routed to the
  wrong handler (which fails later with a confusing error). Added
  2026-05-30 (BidDiff `.txt` fell through to the DOCX extractor).
- Cancellation is re-checked after EVERY await in an async action,
  including post-success persistence — not just after the main
  operation. A late setState after an abort corrupts UI state.
  Added 2026-05-30 (BidDiff save-window race flipped the UI back to
  DONE after "Start over").
- **Every `JSON.parse` / deserialize of STORED or persisted data is a
  trust boundary** — wrap it; a corrupt/truncated persisted value must
  degrade (return null / the empty state), not throw out of a UI
  handler. Symmetry check: if the container/index parse is guarded,
  the payload parse must be too. Added 2026-05-30 (getDiff raw-threw a
  SyntaxError on a corrupt stored payload, pass 40).
- **A markup/serialization EMISSION boundary must reject or strip
  characters the target format forbids OUTRIGHT — escaping the
  metacharacters is necessary but not sufficient.** When building XML/
  OOXML/HTML/CSV/etc. from text that originated in an untrusted document,
  enumerate the format's *illegal* code points (XML 1.0 bans most C0
  controls — 0x00-0x1F except tab/nl/cr — even as `&#7;` numeric
  references) and strip them; otherwise a single such char in extracted
  text produces a file the consumer rejects as corrupt. Added 2026-05-31
  (BidDiff redline `escapeXml` escaped `< & >` but left control chars,
  which would make Word refuse the .docx, pass 61).
- **VS Code extension diagnostic state must be cleared on BOTH
  success AND failure.** `DiagnosticCollection.set(uri, diagnostics)`
  replaces (does not append), so a successful re-compute clears the
  old set automatically. But if re-analysis throws (invalid YAML,
  parse error, no baseline), the extension MUST call
  `collection.set(doc.uri, [])` in the catch handler to clear
  stale diagnostics — otherwise the old squiggles stay visible on a
  file the user has since corrected. Probe: (1) open a valid spec
  (diagnostics appear); (2) introduce a YAML parse error; diagnostics
  must CLEAR, not persist. The catch-block `collection.set(uri, [])`
  must have a test. Added 2026-06-06 (D5 openapi-lens Phase 1
  pre-design: extension.ts already has the correct pattern; the Phase
  1 critique panel must verify the catch branch is tested).

### 8. Accessibility Critic

**Mandate:** Find who cannot use this.

Checklist:
- Every interactive element keyboard-operable.
- Focus order correct; focus never trapped or lost.
- Color contrast meets WCAG 2.1 AA (4.5:1 normal text, 3:1
  large / UI components).
- All non-text content has an accessible name.
- ARIA: roles match semantics; live regions announce only what
  matters; modals use `aria-modal` with focus trap and restore.
- Motion respects `prefers-reduced-motion`.
- Localizable: no concatenated translated strings; no
  locale-dependent comparisons in deterministic code.

### 9. Compliance / Legal Critic

**Mandate:** Find the legal exposure.

Checklist:
- Privacy policy and terms exist and accurately reflect data flow.
- **Every data flow / feature described in the privacy policy, store
  listing, and in-app copy is implemented AND wired end-to-end — not
  stubbed or planned. A described-but-absent data flow (or a claimed
  dependency that isn't in the bundle) is a disclosure defect.** Added
  2026-05-30 (BidDiff docs described an opt-in server-OCR data flow
  that is stubbed + unwired; README claimed a Tesseract.js dep that
  isn't present). **This includes SUPPORT/help copy and tier/pricing
  copy** — a support macro that walks the user through a server
  license-activation/billing flow the v1 product doesn't have is the
  same defect (added 2026-05-30, support-macros pass 53).
- **Every quantitative claim in user-facing copy must match the
  ENFORCED guarantee, not a fragile point-in-time measurement.** "100%
  recall" is a defect if the gate only enforces ≥98% (a future dip
  passes the gate but falsifies the claim); state what is actually
  guaranteed. A numeric-fields validator is not enough for a PII
  boundary — enforce a key allow-list (unknown keys smuggle data) +
  finite-integer bounds (`typeof number` admits NaN/Infinity). Added
  2026-05-30 (FAQ recall claim pass 52; telemetry counts schema pass 45).
- Where the product reports on regulated subject matter, it
  **reports, never advises**. Advisory phrasing is forbidden in
  BidDiff-class products and enforced by automated test.
- Platform policies met (Chrome Web Store, JetBrains Marketplace,
  App Store, registries, etc.).
- Open-source license obligations met (attributions present).
- Data minimization: only what is needed is collected.
- Data retention has a documented limit.

### 10. Maintainability Critic

**Mandate:** Find the future maintenance trap.

Checklist:
- Code is readable. Naming is unambiguous.
- Architecture is documented; key decisions cited.
- No dead code, no unused imports, no orphaned files.
- Lint / format / typecheck clean with zero warnings.
- Tests are not weakened, skipped, or removed to achieve green
  (explicitly hunted).
- Test coverage on critical paths meets the documented floor.
- No `TODO`/`FIXME` in shipped paths.
- Dependencies are current and justified.
- A future session can safely extend without re-learning the
  whole product (the developer docs make this true).
- **VS Code extension products: the diff/classify engine module
  must NEVER import from `vscode`.** Grep: any `import.*from
  'vscode'` in `src/engine/` or `src/terraform/` is a P0.
  The engine is pure TypeScript; the extension module (`src/
  extension/`) is the only VS Code adapter. Violation prevents
  Vitest unit testing and contaminates the engine with VS Code
  host lifecycle. Added 2026-06-06 (D5/D6 Phase 1 pre-designs:
  this invariant is stated explicitly; Phase 1 critique panel
  must verify via grep before phase closure).

### 11. Product-Sense Critic

**Mandate:** Find the gap between "built to spec" and "genuinely
good product."

Checklist:
- The product solves the buyer's real problem well.
- Nothing important is missing that the buyer would expect.
- Nothing is present that should not be (feature bloat).
- First-run experience reaches value quickly.
- Friction points have been removed (number of clicks, mandatory
  fields, prerequisites).
- Naming, positioning, and messaging match what the product
  actually does.

### 12. Devil's-Advocate Critic

**Mandate:** Refuse to be satisfied. Argue the whole thing is not
good enough to ship. Force the team to justify every "done."

Checklist (this critic writes prose, not checklist items):
- What is the single most embarrassing thing about this product?
- If a competitor saw this tomorrow, what would they laugh at?
- What is the user about to be disappointed by?
- What did the team skip because it was hard?
- What did the team rationalize as "good enough"?

A finding from the Devil's-Advocate Critic that is closed without
addressing the underlying issue is itself a P0 finding for the
Maintainability Critic on the next pass.

### 13. Ambition Critic

**Mandate:** Argue the factory is not being ambitious or
innovative enough. Hunt the absence of imagination — the safe
choice taken instead of the original one, the listicle idea
picked instead of the WISHLIST one, the obvious surface explored
instead of the under-served niche, the easy question asked
instead of the hard one.

This critic exists because an agent grading its own ideas tends
toward the conservative middle. Kendama is explicitly designed
to be **actively curious and innovative** (see `ops/loop.md`
"Curiosity and innovation as a standing instruction"); the
Ambition Critic enforces it.

Checklist (prose, not items):
- What is the boldest idea this cycle considered? Was it built
  or shelved? If shelved, was the reason "risk" or "lack of
  imagination"?
- Has the WISHLIST grown this cycle? If not, why not? The
  factory was supposed to log friction the moment it occurred.
- Were any genuinely surprising questions asked this cycle?
  ("Surprising" means a question the operator could not have
  asked at session start.)
- Has the candidate ranking been challenged from first
  principles, not just sorted by the current scoring model?
- Is the portfolio under-diversified across evidence tiers? A
  portfolio entirely of Proven ideas is too conservative; the
  spec permits a deliberate minority of Speculative bets.
- Is the META loop being used to actually invent new factory
  capabilities (a new critic, a new playbook, a new research
  technique) — or is it just doing audits?
- What product is genuinely original and would not appear on any
  listicle? (If none, why not?)

A clean Ambition Critic pass is required before any session-end
that the operator considers "done"; combined with 5.7.7
(maximization audit), this is the structural defense against
quiet rigor-decay.

### 14. Research Quality Critic

**Mandate:** Audit the depth and breadth of the factory's
research. Find shallow research, single-source dependence,
recency bias, and unexplored adjacent terrain.

The factory's RESEARCH loop and the PART 3.3 deep-evaluation
requirement only deliver decision quality if research is
actually rigorous. This critic enforces "rigorous."

Checklist:
- **Source diversity.** Does the research draw on at least
  several independent sources (marketplaces, public revenue
  data, primary documents, registry data, practitioner forums,
  competitor sites, academic / policy sources where applicable)?
  Single-source claims are a finding.
- **Currency.** Are the cited sources current? Anything older
  than 6 months on a fast-moving market is a finding unless
  justified.
- **Negative evidence.** Did the research look for evidence
  *against* the idea, not only for it? An evaluation with no
  "why might this fail" investigation is incomplete.
- **Adjacency exploration.** Were under-served adjacencies
  considered? The decision engine's derivative-reasoning source
  (PART 3.1) requires this.
- **WISHLIST integration.** Did the research consult
  `brain/WISHLIST.md` for related infrastructure needs the
  product could subsume?
- **Comparable depth.** Are the competitor teardowns specific
  (real product names, real pricing, real distribution paths,
  not vague gestures at "the market")?
- **Build-effort estimate honesty.** Is the estimate based on
  decomposed phases, or is it a single big number?
- **Evidence tier classification matches reality.** A
  "Proven" tier requires actual comparables with documented
  revenue. The critic verifies the tier matches what the
  evaluation actually demonstrates.
- **Claims about our own work are artifacts to verify, not
  asserted facts** (added pass 60). Coverage/quality claims in
  the brain, the digest, and PROGRESS are themselves subject to
  this critic. Any superlative — "every", "all", "100%",
  "saturated", "no X is untested" — must be grep-checked against
  the actual corpus before it is written, and softened to the
  literally-true statement when it does not strictly hold. A
  superlative defended only by assertion is a finding. (Origin:
  pass 60 found "every exported core function is tested" was
  overstated — 6 functions were covered only via tested callers.)

Findings are P1 by default (an idea whose research is too thin
is not eligible for an approval proposal).

---

## Roster growth log

Append-only. Every strengthening of a checklist and every new
critic is recorded here with the triggering cause.

| Date | Critic affected | Change | Triggering cause |
|------|-----------------|--------|------------------|
| 2026-05-27 | (founding roster) | Initial 12 critics established | Migration / bootstrap |
| 2026-05-27 | New: Ambition Critic (#13) | Added during bootstrap self-audit | Human directive that the factory be actively curious and innovative; defensive against the conservative-middle failure mode of an agent grading its own ideas |
| 2026-05-27 | New: Research Quality Critic (#14) | Added during bootstrap self-audit | Decision-engine rigor depends on research depth; without an explicit critic, depth tends to drift toward the easy surface |
| 2026-05-30 | Correctness Critic (#1) checklist | Added "over-normalization collapses distinct inputs (esp. numeric values) → silent false negative" | BidDiff bug-hunt pass found `isReformattingOnly` stripping decimal points, hiding `$1.5M`→`$15M`-class changes (`products/biddiff/CRITIQUE_LOG.md` 2026-05-30) |
| 2026-05-30 | Performance Critic (#6) checklist | Added "O(n²)-space guarded by a per-dimension cap; bound the product, size the cap against real memory" | BidDiff token-LCS per-dimension 10k cap still allowed a ~400 MB dp allocation (`products/biddiff/CRITIQUE_LOG.md` 2026-05-30 bug-hunt pass 2) |
| 2026-05-30 | Reliability Critic (#7) checklist | Added "a recognized-but-unsupported input kind must be rejected at the trust boundary, not routed to the wrong handler" | BidDiff `.txt` validated as "TXT" then fell through to the DOCX extractor (`products/biddiff/CRITIQUE_LOG.md` 2026-05-30 bug-hunt pass 3) |
| 2026-05-30 | Reliability Critic (#7) checklist | Added "re-check cancellation after EVERY await, including post-success persistence" | BidDiff save-window race: reset() during saveDiff was clobbered by a late DONE setState (`products/biddiff/CRITIQUE_LOG.md` 2026-05-30 bug-hunt pass 4) |
| 2026-05-30 | Correctness Critic (#1) checklist | Added "a hash/ID scheme delivering less entropy than its width implies — verify stated intent is implemented" | BidDiff contentHash's "salted" second pass re-hashed the same input → 32-bit doubled, not 64-bit (`products/biddiff/CRITIQUE_LOG.md` 2026-05-30 bug-hunt pass 5) |
| 2026-05-30 | Security Critic (#3) checklist | Added "fetch/navigation of a DOM-sourced URL passes an explicit scheme allowlist (https), not just window.open" | BidDiff fetched SAM attachment hrefs with no scheme check (`products/biddiff/CRITIQUE_LOG.md` 2026-05-30 bug-hunt pass 6) |
| 2026-05-30 | Domain-Expert Critic (#5) checklist | Added a federal-procurement specialization (UCF literacy, amendment mechanics, the critical-change categories a capture manager scans incl. the BD2 gaps, terminology precision, practitioner workflow) | SELF_IMPROVEMENT #4 — from public FAR/DFARS knowledge; sharpens the lens for BidDiff + the federal-solicitation family (the code ruleset still awaits the human-gated practitioner validation) |
| 2026-05-30 | Compliance Critic (#9) checklist | Added "every described data flow / feature / dependency is implemented + wired, not stubbed/planned; a described-but-absent flow is a disclosure defect" | BidDiff docs described an opt-in server-OCR data flow that's stubbed + unwired; README claimed a Tesseract.js dep that isn't bundled (`products/biddiff/CRITIQUE_LOG.md` 2026-05-30 bug-hunt pass 7) |
| 2026-05-30 | Compliance Critic (#9) — no-advisory test scope | Extended `test/unit/no-advisory-language.test.ts` to scan the store listing + README + help docs (was UI/disclaimer/export/clause notes only) + added the "always confirm/verify/review/check/consult" imperative pattern | Store listing kept an "Always confirm…" directive the canonical disclaimer had dropped (contradicting "It never advises"); the extended test then caught a second instance in `what-counts-as-critical.md` |
| 2026-05-30 (evening) | Correctness Critic (#1) | Added: value-bearing-punctuation rule must enumerate ALL positions (leading sign, trailing %); a pure fn must have no module state + a test asserting impurity is itself a defect; when a module has an escape helper, audit every user-data interpolation | suppress %/sign (pass 12); the hallucinated contentHash P0 + its bad test; markdown export escaped change text but not filenames (pass 41) |
| 2026-05-30 (evening) | Adversarial Tester (#2) | Added: run the FULL suite, more than once (determinism/shared-state bugs hide from isolation runs); red-team the factory's own check matchers + your own freshly written code | contentHash flakiness surfaced only under full-suite ordering; no-forbidden-markers case-sensitivity hole; the redline OOXML's 3 corrective passes |
| 2026-05-30 (evening) | Reliability Critic (#7) | Added: every JSON.parse/deserialize of STORED data is a trust boundary — guard it; symmetry with the container parse | getDiff raw-threw a SyntaxError on a corrupt stored payload (pass 40) |
| 2026-05-30 (evening) | Compliance Critic (#9) | Added: described-but-absent flows include SUPPORT/help + tier copy; every quantitative claim must match the ENFORCED guarantee not a point-in-time measurement; a PII boundary needs a key allow-list + finite-integer bounds, not just "numbers only" | support-macros' server license/billing flow (pass 53); FAQ "100% recall" vs the ≥98% floor (pass 52); telemetry counts schema (pass 45) |
| 2026-05-30 (evening) | AUDIT NOTE | The above evening rows were logged in `products/biddiff/CRITIQUE_LOG.md` as "roster growth" across passes 12–53 but had NOT actually landed in this file until 2026-05-30 evening (caught by cross-checking the log vs the roster). Lapse fixed; lesson: "roster growth" claimed in a critique log must be verified to land in CRITIQUE_AGENTS.md (5.7.3 + verify-before-claim). | self-audit of the roster-growth claims |
| 2026-05-31 | Research Quality Critic (#14) | Added: claims about our OWN work (coverage/quality in brain, digest, PROGRESS) are artifacts to verify — a superlative ("every", "all", "100%", "saturated") must be grep-checked against the corpus before writing and softened to the literally-true statement when it does not hold | pass 60 found "every exported core function is tested" overstated — 6 fns covered only via tested callers (`products/biddiff/CRITIQUE_LOG.md` 2026-05-31 pass 60) |
| 2026-05-31 | Reliability Critic (#7) checklist | Added: a markup/serialization EMISSION boundary must strip characters the target format forbids outright, not just escape metacharacters (XML 1.0 bans most C0 controls even as numeric references) | pass 61 found redline `escapeXml` left XML-illegal control chars that would make Word reject the .docx as corrupt (`products/biddiff/CRITIQUE_LOG.md` 2026-05-31 pass 61) |
| 2026-05-31 | Domain-Expert Critic (#5) checklist | Sharpened the deadline item: a deadline = date AND clock-time AND timezone, so a time-only or timezone-only change with an unchanged date is equally critical; don't treat the date token as the sole deadline signal | pass 63 probe — a time/timezone-only deadline change is flagged only inside Section L, missed in an untyped section (`products/biddiff/PROGRESS.md` coverage-obs #5) |

The META loop (PART 11) audits this table every cycle. A month
with no growth is a warning sign flagged in the weekly digest.

| 2026-06-06 (continuation) | Domain-Expert Critic (#5) / Correctness Critic (#1) | Added: for direction-aware constraint classification (minimum/maximum/minLength/maxLength/pattern/minItems/maxItems), the polarity of tightening/loosening REVERSES between request and response contexts. Request tightening = BREAKING (clients sending previously-valid values now fail); response loosening = BREAKING (server may now return values clients didn't expect). Pattern changes are always BREAKING in both contexts. Any schema diff engine must verify: (a) that every constraint field is extracted by the parser, (b) that all three comparison levels (top-level, per-property, items, parameter) are covered, (c) that the tightening/loosening direction logic is correct, and (d) that the zero-value case (`minLength: 0`) is tested — `0 ?? null = 0`, not null. | openapi-lens: constraint fields `minimum`/`maximum`/`minLength`/`maxLength`/`pattern`/`minItems`/`maxItems` were parsed but never diffed in any context. Added property-level, items-level, and parameter-level constraint diffing with direction-aware classification. Found zero-value edge case during adversarial pass. 5.7.4/5.7.5 continuation, 2026-06-06. |
| 2026-06-06 (continuation) | Domain-Expert Critic (#5) | Added: the parsed-but-never-diffed audit must also check nested structural operations — (a) `required[]` arrays at NESTED object schemas (not just top-level), (b) `items` schema within ARRAY-TYPED properties (not just top-level `items`), (c) parameter-level `nullable`. These three gaps are structurally identical to the previously found gaps but at a deeper nesting level. The audit must explicitly ask: "is this operation called recursively / at all levels?" for every diff function. | openapi-lens: three gaps fixed in 5.7.4 "nothing is done" review — nested required fields (`diffSchemaRequiredFields` not called recursively in `diffSchemaProperties`), array-typed properties' items schema (not called per-property), parameter nullable (never compared). All fixed with tests. 2026-06-06. |

| 2026-06-06 | Domain-Expert Critic (#5) checklist | Added anchor-extension validation gate: new anchor types require (a) a cited public regulatory source and (b) an integration test exercising the full detection→classify→critical chain, not just a unit test on the detector | BD2 public-source resolution cycle — sub-CLIN (DFARS 204.71) and SET_ASIDE (FAR 19.501) anchors added with citations + end-to-end integration tests; the process proved that "it seemed right" is insufficient for critical-rule additions to a compliance product |
| 2026-06-06 | Correctness Critic (#1) checklist | Added: a sign detector firing before digits must ALSO fire before currency symbols (`$` etc.) — `"-$5,000"` must normalize differently from `"$5,000"`. Probe `[-+]$AMOUNT` explicitly | BidDiff N15: `isLeadingSign` only checked `next === digit`, not `next === "$"`, so a sign-removal on a dollar amount was silently suppressed (`products/biddiff/CRITIQUE_LOG.md` bug-hunt pass, session 2026-06-06) |
| 2026-06-06 | Adversarial Tester (#2) checklist | Added: a regex optional group wrapping BOTH a word prefix and `\(` makes the paren optional too — test every regex with and without each optional prefix INDEPENDENTLY | BidDiff N16: `PAGE_LIMIT_RE` had `\(?` inside the word-group optional so bare `"(30) pages"` (no word prefix) never produced a PAGE_LIMIT anchor (`products/biddiff/CRITIQUE_LOG.md` bug-hunt, session 2026-06-06) |
| 2026-06-06 | Adversarial Tester (#2) checklist | Added: optional groups with `\b` can produce unexpected partial matches through backtracking — when the full match fails `\b`, the engine backtracks an optional group and produces a shorter, potentially wrong match. Characterize this behavior in a test. | BidDiff `detectMoney`: `$1.5MMM` returns `$1 = 1.00` (not no-match) because `MM` fails the word boundary but the engine backtracks the optional decimal and matches `$1` with `\b` between the digit and the subsequent `.` |
| 2026-06-06 | Adversarial Tester (#2) checklist | Added: a `window.addEventListener('keydown')` handler in a React useEffect requires independent tests for each guard: modifier keys, active input elements, IME composition, empty-list guard. The happy path alone leaves all guards untested. | BidDiff DiffView: J/K nav had all four guards but zero tests for any guard before `DiffView.test.tsx` was written in the 2026-06-06 session continuation. The gap was found by "nothing is done" 5.7.4 review. |
| 2026-06-06 | Correctness Critic (#1) checklist | Added: a diff/map key that is a single field silently collapses distinct entities sharing that field in different namespaces — always use a compound key that includes every dimension distinguishing the entity; probe with two entities that share `name` but differ on namespace. | openapi-lens D5 Phase 0: parameter map keyed only by `name` would merge `path:id` and `query:id`; fixed at design time to `${p.in}:${p.name}` (no bug reached tests — the pattern was anticipated during design, but the pattern is general and must be enforced). |
| 2026-06-06 | Adversarial Tester (#2) checklist | Added: a YAML/TOML/JSON spec built by string-concatenation must be validated as a tree, not assumed structurally correct — text appended after a terminal top-level key lands as a sibling, not a child. Test the final tree shape (e.g., `yaml.load(spec).paths['/foo']` exists), or build specs programmatically. | openapi-lens D5: a test appended a new path after a `components:` block; the new path became a top-level key rather than a `paths` entry, producing a silent `undefined` assertion. Required test-spec reconstruction to fix. |
| 2026-06-06 | Domain-Expert Critic (#5) checklist | Added OpenAPI/REST API specialization: property-level diff coverage (type changes inside `properties` are the most common breaking change); `allOf`/`oneOf` composition warning; request-vs-response polarity reversal; remote `$ref` gap documentation. | openapi-lens D5 Phase 0 — the initial engine compared `type` + `required[]` only; a property changing from `number` to `string` was invisible until `diffSchemaProperties()` was added. The OpenAPI domain has well-understood rules that must be enforced by this critic on any API-diff product. |
| 2026-06-06 | Adversarial Tester (#2) checklist | Added: test both inline and `$ref`-based forms of every schema/parameter entity — `$ref` is the primary reuse mechanism in real-world OpenAPI specs; tests that only use inline form leave the reference-resolution path entirely uncovered. | openapi-lens D5 Phase 0 5.7.5 bug-hunt: `$ref: "#/components/parameters/X"` parameters were silently dropped (no `name`/`in` on the ref object); the full 14-critic panel missed this because every parameter test used inline form. Fixed post-panel by `parseSharedParameters()` + 4 new tests. |
| 2026-06-06 | Correctness Critic (#1) checklist | Added: a regex capture group ending with `[A-Z0-9]` (or any char class that includes letters) will over-capture when the middle class allows spaces — the terminal char absorbs the first letter of a trailing word after stripping the space. Use `\d` as the terminal char when the entity always ends with a digit sequence; never use letter-inclusive terminal classes when spaces are in the middle class. | BidDiff `extractSolicitationId`: `[A-Z0-9 \t-]{3,18}[A-Z0-9]` produced "W912TP-26-R-0001AME" from "W912TP-26-R-0001 Amendment" — a false N14 solicitation-mismatch warning. Fixed by `\d` terminal (5.7.5 bug-hunt, 2026-06-06). |
| 2026-06-06 | Adversarial Tester (#2) checklist | Added: for any text-extraction regex that handles labeled fields (solicitation number, contract number, form headers), probe every major government form variant — SF-1449 "Solicitation/Contract/Order Number", SF-33 "Solicitation, Offer and Award", SF-26, etc. The slash/comma-separated composite label forms are common in federal acquisition and easily missed by prefix alternations built from single forms. | BidDiff `extractSolicitationId`: SF-1449 "Solicitation/Contract/Order Number" label unrecognized — the most common commercial acquisition form. N14 mismatch guard silently inert for those solicitations. Fixed by `(?:\/[a-z\/]+)?` optional group (5.7.5 bug-hunt, 2026-06-06). |
| 2026-06-06 | Correctness Critic (#1) checklist | Added: any normalization layer that converts dash/hyphen Unicode variants to ASCII must also include U+2212 MINUS SIGN — it is classified as Math Symbol (not Punctuation) by Unicode, so `\p{P}`-based stripping passes it through unchanged. PDF producers use U+2212 in financial tables. If upstream normalization misses it, downstream comparison treats it as a different character than hyphen-minus. Probe: `"−$5,000"` (U+2212) vs `"-$5,000"` must normalize identically. | BidDiff `normalizeText` LIGATURES missing U+2212; `aggressiveNormalize` classified it as non-punctuation math symbol → two documents with different minus-char conventions produced a spurious MODIFY (5.7.5 bug-hunt, 2026-06-06). |
| 2026-06-06 | Correctness Critic (#1) checklist | Added: any clustering or tolerance computation derived from `array[0]` (first element after a sort) is hazardous when the first element may be an outlier. In PDF line-reconstruction, taking the tolerance from the topmost item's height (which may be a large heading) inflates the tolerance and merges adjacent body lines. Always derive tolerance from a statistically robust measure (median or mode) of the full item set, not the first item. Probe with a mixed-font-size page: large-heading item + tight body-text items where `head.height / 2 >= body_line_spacing`. | BidDiff `clusterIntoLines`: `tolerance = sorted[0].height * 0.5`; a 24pt heading gives tolerance=12, merging 10pt body lines with 12pt spacing into one cluster. Per-paragraph change detection then impossible. Fixed by median height (5.7.5 bug-hunt, 2026-06-06). |
| 2026-06-06 | Domain-Expert Critic (#5) / Correctness Critic (#1) | Added (OpenAPI specialization): for every schema field that is *parsed* into the normalized representation, verify it is also *diffed* — parsing without diffing is a silent completeness gap. Specifically for OpenAPI: `items` (array element type), `additionalProperties`, `default`, `minimum`/`maximum` — these are parsed in Phase 0 but never compared. Probe: an endpoint where the only change is the array element type (e.g., `array<string>` → `array<integer>`) must produce a BREAKING finding; a clean diff from that change is a false negative. | openapi-lens D5: `OapiSchema.items` was parsed in `parser.ts` but `diffSchemaItems()` was never called; `array<string>` → `array<integer>` response change was completely invisible. Added `diffSchemaItems()`, two BREAKING rules, 6 tests. The gap class — "field parsed, never diffed" — is a general pattern requiring systematic enumeration of all parsed fields vs diffed fields (5.7.5 bug-hunt, 2026-06-06). |
| 2026-06-06 | Domain-Expert Critic (#5) / Correctness Critic (#1) | Extended "parsed-but-never-diffed" audit checklist: the systematic enumeration MUST cover ALL five dimensions — (1) top-level schema fields (`type`, `format`, `nullable`, `enum`, `required[]`, `properties`, `items`, allOf/oneOf/anyOf); (2) property-level sub-fields (`type`, `format`, `enum`, `nullable`, `items` within each property); (3) operation-level fields (`deprecated`, `operationId`, `tags`, `security`); (4) polarity (request vs response semantics are reversed for enum: removing request enum values = BREAKING, adding response enum values = BREAKING); (5) per-context asymmetries (nullable is response-meaningful but request-indifferent). Any schema diff product must have an explicit "parsed vs diffed" coverage matrix as a named artifact. | openapi-lens D5 5.7.5 continuation: after fixing `items`, enumerated all parsed fields and found 3 more gaps — `property.enum` (BREAKING in both directions depending on polarity), `property.format` (BREAKING both directions), `operation.deprecated` (INFO). Fixed all three. 13 new tests (5.7.5 bug-hunt, 2026-06-06). |
| 2026-06-06 | Correctness Critic (#1) checklist | Added: a classify rule using `after === true` to detect BREAKING must also have a companion rule for `after === null` (entity removed entirely) when the entity being removed was in a state that clients depend on. Specifically: a `before=true, after=null` change on a required field is BREAKING even though `null !== true`. Probe: required entity removed entirely must produce a BREAKING finding. | openapi-lens: `request-body-required-changed` with `before=true, after=null` fell through all classify rules and was rated INFO. A required request body being removed is BREAKING — clients sending the body may be rejected by the now-undocumented server behavior. Fixed by adding `before===true && after===null` rule (5.7.5 bug-hunt, 2026-06-06). |
| 2026-06-06 | Correctness Critic (#1) checklist | Added: for any diff function that handles schema-level fields (nullable, format, etc.), verify it is wired for BOTH request AND response schemas. A diff helper named `diffResponseX` is a smell — the name implies it's response-only but the corresponding request-side is often silently missing. Probe: a request body schema where nullable changes true→false must produce a BREAKING finding (clients sending null will be rejected). | openapi-lens: `diffResponseNullable` was only called in `diffResponses`. Request body nullable changes (true→false = BREAKING, false→true = INFO) were completely undetected. Refactored to `diffNullable(isRequest)` and wired into `diffRequestBody` (5.7.5 bug-hunt, 2026-06-06). |
| 2026-06-06 | Correctness Critic (#1) / Domain-Expert Critic (#5) | Added: when fixing a diff function to use null sentinels for type comparisons, ALSO apply the same fix to all related fields (`format`, `enum`, etc.) within the same schema object — they have the same structural gap. `diffSchemaItems` had `bType ?? null` added but format was still guarded by both-defined. Always audit all parallel fields together. | openapi-lens `diffSchemaItems`: after fixing items type null-sentinel, `items.format` was still completely undetected. A UUID array changing to a URI array was invisible. Added `response/request-schema-items-format-changed` (5.7.2 second adversarial pass, 2026-06-06). |
| 2026-06-06 | Correctness Critic (#1) checklist | Added: property type comparisons in schema diffs must use `type ?? null` sentinel pattern — `bProp.type !== undefined && cProp.type !== undefined` guards silently drop type-removal (`string→undefined`) and type-addition (`undefined→string`) transitions. Both are significant (type removal = server no longer validates = potentially BREAKING; type addition = server now enforces = BREAKING for request). | openapi-lens `diffSchemaProperties`: `if (bProp.type !== undefined && cProp.type !== undefined && bProp.type !== cProp.type)` silently dropped `string→null` (type removed) and `null→string` (type added). Fixed by null sentinel; direction-aware classify (5.7.2 second adversarial pass, 2026-06-06). |
| 2026-06-06 | Correctness Critic (#1) / Domain-Expert Critic (#5) | Added: for any diff function with a "both sides must have the field" guard, probe the one-side-present case — `bField !== undefined && cField !== undefined` silently drops the case where one side has the field and the other doesn't. For array items specifically: `before=null, after=type` is direction-dependent (response gains type=INFO; request gains type=BREAKING); `before=type, after=null` is also direction-dependent (response loses type=BREAKING; request loses type=INFO). The guard must be `before !== after` (using null sentinel) not `both defined`. | openapi-lens `diffSchemaItems`: condition `bItems?.type !== undefined && cItems?.type !== undefined` silently dropped `null→string` and `string→null` transitions. Response losing its items type spec was completely invisible (BREAKING: clients can no longer rely on element type). Fixed by `bType ?? null` sentinel comparison with direction-aware classify rules (5.7.5 bug-hunt, 2026-06-06). |
| 2026-06-06 | Correctness Critic (#1) checklist | Added: a field declared in a normalized interface type (e.g., `optional?: boolean`) but never populated by the deserializer is a "declared-but-not-extracted" gap. The TypeScript compiler accepts it (the type is satisfied without the field), but the value is always `undefined` in practice — any diff or logic that depends on it silently sees the absent-value behavior. Audit every field in every normalized interface: (a) is there a corresponding extraction in the parser/deserializer? (b) does a test verify it is populated when the raw input contains it? | openapi-lens `OapiParameter.deprecated` was declared in the TypeScript type since inception but `parseParameter` never read `raw["deprecated"]`. Parameters with `deprecated: true` in YAML were parsed as `undefined` for that field. The full panel and two adversarial passes missed this because no test ever checked what happened when a parameter had `deprecated: true` in YAML. Fixed by extracting in parser, diffing in `diffParameters`, 5.7.5 bug-hunt (2026-06-06 continuation). |
| 2026-06-06 | Correctness Critic (#1) + Maintainability Critic (#10) checklist | Added: when a discriminated union type (e.g., `OapiChangeType`) maps to a handler system (e.g., classify rules), new values added to the union must have handlers or the system silently produces a wrong default. Guard this with a compile-time exhaustiveness check: `Record<UnionType, [SampleArgs]>` causes a TypeScript error if any union value is missing. Back it with a runtime test verifying each union value does NOT fall through to the fallback "unhandled" message. | openapi-lens `classifyChanges`: new `OapiChangeType` values added without a classify rule silently became INFO. The completeness guard was added as a `Record<OapiChangeType, [unknown, unknown]>` TYPE_STUBS map in classify.test.ts — TypeScript exhaustiveness checking + runtime test. This pattern applies to every discriminated union → handler mapping in any product (5.7.2 third adversarial pass, 2026-06-06 continuation). |
| 2026-06-06 | Domain-Expert Critic (#5) / Correctness Critic (#1) | Extended parsed-but-never-diffed audit to property-level sub-fields: after auditing top-level schema fields and `items.*`, audit `properties[k].*` for EVERY field in `OapiSchema`. The following were found parsed but uncompared: `properties[k].nullable` (BREAKING when response property becomes nullable false→true; BREAKING when request property becomes non-nullable true→false); `items.enum` (direction-aware: response gains=BREAKING, request loses=BREAKING); `items.nullable` (direction-aware: response false→true=BREAKING, request true→false=BREAKING). The general rule: once a flat field is in the schema type, its absence from ALL three comparison levels (top-level schema, property-level, items-level) must be explicitly verified. | openapi-lens: three gaps found in systematic audit — `properties[k].nullable`, `items.enum`, `items.nullable`. All three were parsed by `normalizeSchema` into `OapiSchema` but never compared. 6 new types, 12 new classify rules, 31 new tests (5.7.5 bug-hunt round 3, 2026-06-06 continuation). |
| 2026-06-06 (round 7) | Domain-Expert Critic (#5) / Correctness Critic (#1) | Added: array-type parameters (e.g., `GET /items?ids=1,2,3` with `schema.type=array`) have an `items` sub-schema that must be diffed, not just the parameter-level `type`. The items sub-schema can have its own `type`/`format`/`enum`/`nullable` that are all independently breaking. Probe: change a query parameter from `array<string>` to `array<integer>` — must produce a BREAKING finding. Parameters that accept multi-value arrays are common in REST APIs (Stripe, GitHub both use this pattern). | openapi-lens: `bp.schema.items` was parsed into `OapiParameter.schema.items` but `diffParameters` never compared it. A query parameter `?ids=...` changing from string elements to integer elements was invisible. Fixed: items sub-field comparison for type/format/enum/nullable in `diffParameters`. 4 new types, 8 tests (5.7.5 round 7, 2026-06-06 continuation). |
| 2026-06-06 (round 6) | Domain-Expert Critic (#5) / Correctness Critic (#1) | Added: the parsed-but-never-diffed audit must distinguish (a) per-property fields (covered by `diffSchemaProperties` loop) from (b) top-level body schema fields (covered by `diffSchemaType`, `diffNullable`, `diffSchemaTopLevelConstraints`, etc.). `format` and `enum` were only compared inside the property loop — a body schema that IS a scalar (string with format/enum, no properties) had those fields silently ignored. Any schema diff engine must have an explicit test for each field at BOTH the body-schema level AND the properties-loop level. | openapi-lens: `format` and `enum` on the request/response body's top-level schema were parsed by `normalizeSchema` but never diffed. POST endpoint accepting `type: string, format: date` → `format: date-time` was completely invisible; GET returning `enum: [active, inactive]` → `[active, inactive, pending]` was invisible. Fixed: `diffSchemaTopLevelFields` helper. 4 new types, 4 classify rules, 6 tests (5.7.5 round 6, 2026-06-06 continuation). |
| 2026-06-06 (round 5) | Domain-Expert Critic (#5) / Correctness Critic (#1) | Added: the `flattenAllOf` function that merges `allOf` members into a parent schema must be updated WHENEVER new fields are added to the normalized schema type — it is NOT automatically updated by adding fields to the type. Specifically: constraint fields (`minimum`/`maximum`/`minLength`/`maxLength`/`pattern`/`minItems`/`maxItems`) were added to `OapiSchema` but `flattenAllOf` never inherited them from members. A constraint change inside an `allOf` base schema was invisible because the merged schema never carried the constraint value. ALSO: top-level schema constraint comparison must be called at EVERY entry point that compares schemas (requestBody top-level, response schema top-level, properties loop, items) — not only at the properties loop level. | openapi-lens: two gaps found — `flattenAllOf` did not inherit 7 constraint fields (fixed: numeric loop + pattern); `diffRequestBody` and `diffResponses` never called top-level constraint comparison (fixed: `diffSchemaTopLevelConstraints` helper). 6 adversarial tests. 307→313 tests (5.7.5 round 5 + 5.7.2 escalating critique, 2026-06-06 continuation). |
| 2026-06-06 (Phase 1 pre-design) | Maintainability Critic (#10) / Security Critic (#3) | Added (VS Code extension product family): the diff-engine module (`src/engine/`, `src/terraform/`) MUST NOT import from `vscode`. The extension is a thin adapter; the engine is pure TypeScript. Verify with a grep: any `import ... from 'vscode'` in an engine file is a P0. This boundary enables Vitest unit testing without VS Code and prevents test-electron contamination. | D5/D6 Phase 1 pre-design (openapi-lens-phase1-design.md / terraform-lens-phase1-design.md): both designs make this invariant explicit; the Phase 1 critique panel must verify it before phase closure. |
| 2026-06-06 (Phase 1 pre-design) | Security Critic (#3) / Reliability Critic (#7) | Added (VS Code extension product family): WebView HTML content must NEVER be constructed by interpolating user-provided or file-derived strings directly. Use `vscode.Uri.file().with({scheme:'vscode-resource'})` for assets; pass data via `panel.webview.postMessage()` not string templating; if template generation is used, ensure every variable is HTML-escaped. A WebView that injects plan-file content directly into an HTML string is an XSS vector (a user opens a hostile plan.json). | D6 terraform-lens Phase 1 pre-design: `webview.ts` generates the classification panel; if plan resource addresses are ever injected into HTML without escaping, a resource address containing `<script>` would execute. Phase 1 critique panel must verify `createPlanWebviewContent` escapes all user-controlled strings. |
| 2026-06-06 (Phase 1 pre-design) | Reliability Critic (#7) / Correctness Critic (#1) | Added (VS Code extension product family): a `DiagnosticCollection.set(uri, diagnostics)` call clears the old set for that URI and replaces it. The critical invariant is that the old set is cleared even when re-computation FAILS — if the re-analysis throws (invalid YAML, parse error, no baseline), the extension must call `collection.set(doc.uri, [])` to clear stale diagnostics, not leave the old squiggles visible on a file the user has since fixed. An extension that only sets new diagnostics on success leaves false positives after the user corrects a parse error. Probe: (1) open a valid spec (diagnostics appear); (2) break the YAML (parse throws); diagnostics must clear, not persist. | D5 openapi-lens Phase 1 pre-design: `extension.ts` already has `catch { collection.set(doc.uri, []); lensProvider.update(doc.uri, []) }` — the pattern is correct. The Phase 1 critique panel must verify this catch branch has a test, not just the happy path. |
| 2026-06-06 (round 10) | Correctness Critic (#1) | Added: when a diff function compares sub-fields of a nested entity (e.g., `items.readOnly`, `items.writeOnly`), it MUST guard with `if (bEntity && cEntity)` before comparing those sub-fields. Without this guard, when the entity is newly added (`baseline=null, current=entity`) or removed (`baseline=entity, current=null`), the sub-field comparisons fire spurious events that are reported in addition to the entity-level event already emitted by the parent. Probe: add a response property with `items: { readOnly: false }` — no `*-items-readonly-changed` event should appear alongside the `property-added` event. | openapi-lens `diffSchemaItems`: items.readOnly and items.writeOnly comparisons ran even when baseline items were null (items newly added). A newly-added array property emitted both a `property-added` AND a spurious `response-schema-items-readonly-changed` event. Fixed by gating all items sub-field comparisons inside `if (bItems && cItems)`. 4 new test cases (5.7.5 round 10, 2026-06-06 continuation). |
| 2026-06-06 (round 11) | Correctness Critic (#1) | Added: for any binary-flag diff that produces a change event (e.g., `required: true/false`), verify BOTH transition directions are emitted — `true→false` AND `false→true`. A common pattern is: the initial code checks `!bb.required && cb.required` (became required = BREAKING) but forgets `bb.required && !cb.required` (became optional = INFO). Also audit the `null` case for removed entities: `true→null` (required body removed) must be handled separately from `false→true`. Probe: add an endpoint where `requestBody.required` changes true→false; the event must appear in the diff output with classification INFO. | openapi-lens `diffRequestBody`: only `false→true` (became required) was emitted. `true→false` (body became optional) was never emitted at all; `false→null` (optional body removed) fell through to a cryptic default classification. Added `true→false` emission; added `false→null` classify rule with INFO. 2 adversarial tests (5.7.5 round 11, 2026-06-06 continuation). |
| 2026-06-06 (round 12) | Adversarial Tester (#2) / Correctness Critic (#1) | Added: a recursive diff function (e.g., `diffSchemaItems` that calls itself for `items.items`) MUST have an explicit depth bound (`MAX_ITEMS_DEPTH`) to prevent stack overflow on pathological inputs (e.g., a schema with 100 levels of nested arrays). The depth guard test must assert `not.toThrow()` for inputs exceeding the depth limit — it DOES NOT assert that the deep change is detected (since cutting off deep recursion is intentional). A test that asserts `changes.length > 0` for a change beyond the depth limit is itself wrong; the correct assertion is that the engine handles it safely without crashing. | openapi-lens `diffSchemaItems`: the function called itself recursively for `items.items` without a depth guard. A deeply-nested array schema with 5+ levels would stack-overflow. Added `MAX_ITEMS_DEPTH = 3` and `depth` parameter; depth guard returns early at limit. Initial test incorrectly asserted `changes.length > 0` for a 5-level change — fixed to assert only `not.toThrow()`. (5.7.5 round 12, 2026-06-06 continuation). |
| 2026-06-06 (round 14) | Correctness Critic (#1) / Domain-Expert Critic (#5) | Added: the null-transition audit for classify rules (null→value = constraint newly added) must be applied at ALL three schema nesting levels — (a) top-level body schema (`response-schema-format-changed`, `response-schema-enum-changed`), (b) per-property level (`response-schema-property-format-changed`, `response-schema-property-enum-changed`), and (c) items level (`response-schema-items-format-changed`, `response-schema-items-enum-changed`). A fix at one level that leaves the others unpatched is itself a gap. Probe each level independently with a `before=null` case. | openapi-lens: round 13 fixed items-level null-transitions; round 14 found identical bugs at property and body levels. `response-schema-property-format-changed` with `before=null` (format newly added) was classified BREAKING; `response-schema-enum-changed` with `before=null` was BREAKING. Both are INFO (server narrows its guarantee). The root cause was copy-paste of the same guard logic across three levels without adapting for null-semantics. Fixed all four rules; +12 tests (6 classify unit + 6 adversarial integration) (5.7.5 round 14, 2026-06-06 continuation). |
| 2026-06-06 (round 15) | Correctness Critic (#1) / Domain-Expert Critic (#5) | Added: for every request-side classify rule involving a constraint (type, format, enum), verify BOTH transition directions explicitly — "constraint added" (before=null) AND "constraint removed" (after=null). The `!before || !after → BREAKING` catch-all guard treats BOTH directions as BREAKING, but "constraint removed" = more permissive = INFO. Probe pattern: (1) API with parameter/property constraint; (2) current spec removes the constraint; (3) expect INFO, not BREAKING. Affected guard patterns: (a) unconditional BREAKING rules for format/type — split to `after !== null → BREAKING, after === null → INFO`; (b) `!before || !after → BREAKING` for enum — split to `!before && after → BREAKING, before && !after → INFO`. The fix must be applied to ALL three constraint nesting levels (top-level body, property, items) for each field. | openapi-lens: 11 request-side classify rules incorrectly classified constraint removal as BREAKING. Fixed: `parameter-type-changed`, `parameter-format-changed`, `parameter-enum-changed`, `request-schema-format-changed`, `request-schema-property-format-changed`, `request-schema-property-enum-changed`, `request-schema-enum-changed`, `request-schema-items-format-changed`, `request-schema-items-enum-changed`, `parameter-items-type-changed`, `parameter-items-format-changed`, `parameter-items-enum-changed`. +27 tests (21 classify unit + 6 adversarial integration) (5.7.5 round 15, 2026-06-06 continuation). |
| 2026-06-06 (round 16) | Domain-Expert Critic (#5) / Correctness Critic (#1) | Added: `additionalProperties: false` (closed schema) is a common, high-impact OpenAPI pattern that MUST be diffed. A schema that previously allowed extra properties being closed (adding `additionalProperties: false`) is BREAKING for request schemas — clients sending extra properties will now receive 400. Both the parser and diff engine must handle this field. Parser rule: extract `additionalProperties` only when it is boolean (schema-valued `additionalProperties` is a Phase 2 concern). Diff rule: normalize absent/true → true (same semantics); the significant transition is true→false (schema closed) and false→true (schema opened). Classify rule (direction-aware): request true→false = BREAKING; request false→true = INFO; response both directions = INFO (annotation, non-breaking). Also applies at property level (nested object schemas). Probe: POST endpoint with open request body schema; add `additionalProperties: false`; must produce BREAKING finding. | openapi-lens: `additionalProperties` was completely missing from OapiSchema type, parser, diff, and classify. Added to all four layers; 4 new OapiChangeType values; direction-aware classify rules; +14 tests (4 TYPE_STUBS + 6 classify unit + 4 adversarial integration) (5.7.5 round 16, 2026-06-06 continuation). |
| 2026-06-06 (round 17) | Correctness Critic (#1) / Domain-Expert Critic (#5) | Added: pattern constraint classify rules must be direction-aware, not unconditionally BREAKING. The correct semantics: (1) Request-side pattern REMOVED (`after=null`) = INFO (constraint relaxed; clients sending previously-valid values still pass). (2) Request-side pattern ADDED or CHANGED = BREAKING (server now validates against new pattern; non-matching clients fail). (3) Response-side pattern NEWLY ADDED (`before=null`) = INFO (server narrows its own guarantee; non-breaking for clients). (4) Response-side pattern REMOVED or CHANGED = BREAKING (server may return values not matching old pattern; clients validating pattern will break). The `if (loc.endsWith(".pattern")) return "BREAKING"` pattern is a red flag — it must be split by direction, exactly as format/enum/type rules were in rounds 13–15. This rule applies at ALL constraint nesting levels: property-level, items-level, and parameter-constraint. | openapi-lens: 6 classify rules contained `if (loc.endsWith(".pattern")) return "BREAKING"` unconditionally. Request-side pattern removal was incorrectly BREAKING (pattern removed = less restrictive = INFO); response-side pattern addition was incorrectly BREAKING (new server guarantee = INFO). Same null-transition direction blindness that affected rounds 13–15 for format/enum/type, now at the pattern constraint sites. Fixed 6 sites: `request-schema-property-constraint-changed`, `response-schema-property-constraint-changed`, `parameter-constraint-changed`, `request-schema-items-constraint-changed`, `response-schema-items-constraint-changed`, `parameter-items-constraint-changed`. Also improved all 6 message functions to emit direction-aware messages (removed/added/changed). +16 tests (12 classify unit + 4 adversarial integration) (5.7.5 round 17, 2026-06-06 continuation). |

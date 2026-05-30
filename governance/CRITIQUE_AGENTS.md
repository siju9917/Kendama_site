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
  dates/times AND bid-opening/oral-presentation scheduling; page
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

The META loop (PART 11) audits this table every cycle. A month
with no growth is a warning sign flagged in the weekly digest.

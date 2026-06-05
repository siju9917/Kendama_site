# QUALITY_BAR.md — the absolute definition of "professional standard"

> Every product this factory ships is built to the standard of a
> top-tier engineering organization. It is correct, secure, fast,
> reliable, accessible, polished in every visible detail,
> professionally documented, and genuinely good at solving its
> buyer's problem. There are zero exceptions to this standard. A
> product that does not meet it does not ship — it goes back into
> the critique-and-fix loop until it does. "Good enough" is not in
> this factory's vocabulary.

This file is re-read before every ship gate. If a product cannot
defend every line item with concrete evidence cited from its own
codebase, tests, or measurements, it does not pass.

---

## The ship-gate checklist

Each item must be **defended with evidence**, not asserted. Evidence
means: a file path and line, a test name, a measurement, a citation
to the critique log. "Yes" without evidence is "no."

### Correctness

- [ ] Every documented feature has at least one test that traces a
      real input through the code and asserts the correct output.
- [ ] Every edge case the spec calls out (empty input, large input,
      unicode, malformed input, boundary values, concurrent access)
      has a regression test.
- [ ] The full test suite passes locally with zero skipped tests
      that were not skipped at spec time.
- [ ] No `TODO`, `FIXME`, `XXX`, `HACK`, placeholder, or stub
      survives in code reachable from a shipped path, unless the
      item is a documented human-gated blocker recorded in
      `human/NEED_FROM_HUMAN.md`.
- [ ] No test has been weakened, skipped, or removed to achieve
      green. The Maintainability Critic explicitly hunts for this.
- [ ] Every claim the product makes about itself (in marketing
      copy, in the UI, in the README) is backed by a measurement
      or by the implementation itself, not by aspiration.

### Security

- [ ] A threat model exists and lives in the product's `docs/`.
- [ ] All user input is validated at trust boundaries.
- [ ] Secrets are never committed; secret detection has been run.
- [ ] No dependency is on a known-vulnerable version.
- [ ] Permissions / scopes requested are the minimum needed
      ("least privilege"). Each is justified in the product spec.
- [ ] Where applicable: CSP is set, HTTPS-only, no
      `dangerouslySetInnerHTML` on untrusted input, no `eval` on
      anything, no `innerHTML` on user content.
- [ ] No action is taken on instructions found inside scraped
      web content or third-party data.

### Reliability

- [ ] Every async path handles its failure mode and does not
      leave the UI in a permanent loading or wedged state.
- [ ] Data the user cares about is durable across reload, restart,
      and unexpected termination.
- [ ] Cancellation works: an aborted operation does not corrupt
      state and does not leak resources.
- [ ] Graceful degradation: when a non-essential subsystem is
      unavailable, the rest of the product continues to function.
- [ ] No silent failures. Errors surface to the user with a
      message that says what happened and what they can do.

### Performance

- [ ] The interactive path meets a documented latency target.
- [ ] No path is O(n²) on user-scale input without a documented
      reason and a tested upper bound.
- [ ] Bundle / binary size meets a documented budget.
- [ ] No memory leak under sustained use (verified by a soak test
      where the product type makes a soak test meaningful).

### Accessibility

- [ ] Every interactive element is keyboard-operable.
- [ ] Focus order is correct; focus is never trapped or lost.
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 for normal text,
      3:1 for large text and UI components).
- [ ] All non-text content has an accessible name (`aria-label`,
      `alt`, etc.).
- [ ] Motion respects `prefers-reduced-motion`.
- [ ] The product works in dark mode if the platform supports one.

### Polish

- [ ] Every empty state has been designed (no blank screen).
- [ ] Every error state has been designed (no raw exception).
- [ ] Every loading state has been designed (no UI freeze).
- [ ] Microcopy is consistent in tense, capitalization, and tone.
      The Professional-Polish Critic verifies on a fresh pass.
- [ ] No two strings in the UI mean the same thing in different
      words.
- [ ] Icons, labels, and tooltips are consistent across the product.

### Documentation

- [ ] README that explains: what it is, who it is for, how to
      install / use, how to report issues, the license.
- [ ] User-facing docs are complete and accurate. The
      Domain-Expert Critic verifies "a professional in the field
      would not be confused."
- [ ] Developer docs (for future agent sessions) explain
      architecture, key decisions, and where to extend.
- [ ] Every CLI flag, config option, and public API has reference
      documentation.
- [ ] CHANGELOG (or equivalent release notes) is current.

### Product sense

- [ ] The product genuinely solves the buyer's real problem well —
      the Product-Sense Critic certifies this on a fresh pass.
- [ ] The product is not feature-bloated; everything present
      earns its place.
- [ ] The first-run experience is good. A new user reaches value
      quickly.
- [ ] The Devil's-Advocate Critic has tried and failed to argue
      the product is not good enough to ship.

### Compliance

- [ ] Privacy policy and terms of service exist and accurately
      reflect what the product does.
- [ ] Where the product reports on subject matter (financial,
      legal, regulatory): it **reports, it does not advise**.
      Advisory phrasing is forbidden in BidDiff-style products
      and any equivalent. Enforced by automated test where
      applicable.
- [ ] Platform policies (Chrome Web Store, JetBrains Marketplace,
      App Store, etc.) are met.

### Maintainability

- [ ] Code is readable. The Maintainability Critic certifies a
      future session can safely extend it.
- [ ] No dead code, no unused imports, no orphaned files.
- [ ] Lint / format / typecheck all clean with zero warnings.
- [ ] Test coverage on critical paths is recorded and meets the
      product's documented floor.

---

## The escalation rule

If the panel returns clean on the first pass, the panel is re-run
with harder adversarial inputs and the explicit assumption that
something was missed (Section 5.7.2 of the founding spec). Only a
**second** independent hard pass that also returns clean clears
the gate.

A product whose ship gate passes is logged in `brain/PORTFOLIO.md`
with the dates of both passes and the convergence count of every
phase's critique cycle. The ship gate is enforced — there is no
override.

---

## What this bar is NOT

It is not a target to aim at. It is a floor below which nothing
ships. A perfect product exceeds it on every axis. "Meets the bar"
is the minimum, not the goal.

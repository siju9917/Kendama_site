# WISHLIST.md — infrastructure I wished existed while building

> Every time the factory hits friction ("this would be easier if X
> existed", "I had to pay for Y and it was bad", "no good tool for
> Z", "this API is fragmented and painful"), X / Y / Z is logged
> here with the context of how the need arose.
>
> WISHLIST items feed `brain/IDEA_BACKLOG.md`. These are the ideas
> that are NOT on any online listicle — the founder-style
> "scratch your own itch" ideation.

Format per item:

```
## YYYY-MM-DD — <short title>

**Friction encountered:** what was annoying.
**Where it came up:** product / experiment / loop.
**Proposed product:** what would solve it.
**Initial size estimate:** how big this might be (scope and
buyer audience).
**Promoted to backlog?** date and rank if yes.
```

---

## 2026-05-27 — A clean, fast PDF text extractor with layout intent

**Friction encountered:** BidDiff's PDF extraction work spent
substantial effort working around PDF.js quirks: line-break
joining, hyphenation rejoining, ligature normalization, soft
hyphens, zero-width characters, control-character leakage,
column reconstruction. Every Chrome MV3 extension that diffs,
indexes, or summarizes PDFs in-browser hits the same wall.

**Where it came up:** BidDiff codebase
(`products/biddiff/src/core/extract/pdf/`) — many fixes during
the prior critique loop addressed individual PDF extraction
edge cases (control chars, zero-width chars, ligatures, soft
hyphens, hyphen-broken line wraps).

**Proposed product:** A WASM-packaged "extract PDF text the way
a human would read it" library, designed specifically for
Chrome MV3 service-worker and offscreen-document contexts —
ligature normalization, hyphenation joining, layout-aware
column detection, page-rotation handling, encrypted-PDF
detection, all built in. Drop-in dependency for anyone doing
in-browser PDF text work.

**Initial size estimate:** Small-to-medium technical scope;
audience is every web-context PDF tool. Distribution via npm
+ JSR. Monetization: generous free tier + paid commercial
license dual model.

**Promoted to backlog?** Not yet. Deep-evaluated on the next
research cycle and ranked against existing candidates in
`brain/IDEA_BACKLOG.md`.

---

## 2026-05-27 — Federal solicitation amendment monitoring as a feed

**Friction encountered:** BidDiff diffs two amendments the user
already has. The implicit unmet need is **noticing** a new
amendment was posted — currently a manual SAM.gov check per
opportunity. Capture teams want push, not poll.

**Where it came up:** Implicit in the BidDiff Domain-Expert
finding (`products/biddiff/CRITIQUE_LOG.md` K1 pass 1) — the
first thing a capture manager scans for is *what changed* in
the amendment, but only after they know the amendment exists.

**Proposed product:** An RSS / email / Slack / webhook feed of
SAM.gov amendments matched to saved opportunity searches, with
the critical-change summary inline (using the same engine that
backs BidDiff). Distribution: paid SaaS with a clear free tier;
high alignment with capture-team workflow.

**Initial size estimate:** Medium build; depends on a stable
SAM.gov data path (the SAM.gov Beta API, GovTribe, etc. — to
be researched). The product compounds with BidDiff: same diff
engine, same clause dataset, same critical-rules ruleset.

**Promoted to backlog?** Not yet. Logged for the next research
cycle.

---

## 2026-05-27 — A critical-change rules curation tool for regulated industries

**Friction encountered:** BidDiff's critical-rules ruleset is
hand-coded in TypeScript. Updating it for a new regulatory
shift (e.g., a new compliance certification, a new FAR clause
class) requires editing code and shipping a new extension
version. Every regulated-document-diff product hits this — and
the people who know what's critical aren't the people who write
TypeScript.

**Where it came up:** BidDiff K1 Domain-Expert finding — the
ruleset will keep needing additions; the engineering cost of
each addition discourages frequent updates.

**Proposed product:** A web tool (or library) that lets a
domain expert define critical-change rules in a structured DSL
— pattern-match on extracted blocks, anchor types, clause
references, value ranges — and exports a ruleset any diff
product can consume at runtime. Audience: any vertical that
diffs regulated documents (federal procurement, FDA filings,
securities filings, building codes).

**Initial size estimate:** Medium; speculative evidence tier.
Distribution unclear — possibly open-source rules library +
paid SaaS for managed rule sets.

**Promoted to backlog?** Not yet. Logged for the next research
cycle.

---

## 2026-05-30 — A jsdom-compatible WCAG contrast checker for component tests

**Friction encountered:** BidDiff's Accessibility K1 P2 (verify
dark-mode contrast on *rendered* components, not just design tokens
in isolation) is **browser-gated** — and the reason is concrete:
`axe-core` / `jest-axe`, the standard a11y test tools, **cannot
evaluate the color-contrast rule under jsdom**, because jsdom does no
layout or computed-color resolution. So a fast, CI-friendly,
no-real-browser way to assert "this rendered component meets WCAG
2.1 AA contrast in light and dark mode" simply does not exist; teams
either spin up Playwright/Chromium (slow, heavy) or skip rendered
contrast entirely (what most do).

**Where it came up:** This session, deciding how to close BidDiff's
a11y contrast P2 without a browser. Concluded adding `jest-axe`
would be *theater* for contrast (it silently no-ops that rule in
jsdom), so the P2 stays correctly browser-gated.

**Proposed product:** A library that, given a rendered component tree
(jsdom) + its stylesheet(s), resolves effective foreground/background
colors by walking the cascade itself (parse the CSS, compute
specificity, resolve CSS variables and `currentColor`, handle alpha
compositing) and asserts WCAG contrast ratios — no real browser, no
layout engine needed for the *color* question. Ship as a Vitest/Jest
matcher (`expect(el).toMeetContrast('AA')`) + a standalone checker.
Distribution: npm/JSR (dev-tooling SEO: "jsdom contrast", "wcag
contrast test", "jest-axe contrast"). The wedge over axe-core is
exactly the gap axe documents it can't fill.

**Initial size estimate:** Medium technical scope (a focused CSS
cascade + color resolver; the WCAG contrast math is trivial). Audience
is every front-end team with component tests + a dark mode. Evidence:
Plausible. Strategic fit: this is also what BidDiff itself needs to
close its own a11y P2 without Chromium — dogfood-able.

**Promoted to backlog?** Not yet — candidate for the
derivative/dev-tooling set when the cap unblocks deep-evaluation.
Cross-referenced from `products/biddiff/PROGRESS.md` (the a11y P2).

---

## 2026-05-30 — A "claim → red test → fix" verification harness for autonomous coding agents

**Friction encountered:** During a long unattended session this factory
*hallucinated* a bug in already-correct code (a "nondeterministic content
hash" that was pure), "fixed" it, broke the build, and committed confident-
but-false brain entries before a full-suite run caught the contradiction. The
root cause was acting on a believed defect with no failing test demonstrating
it *first*. The countermeasure that actually works is procedural: a bug claim
must be backed by a red test that exists BEFORE the fix, and every change must
pass typecheck+lint+test (not just a green run of one file) before commit.

**Where it came up:** This session's own operation — the most expensive lapse
of the day, now encoded as rules (CLAUDE.md verify-before-commit; the
PLAYBOOK "Engineering discipline" section) but enforced only by discipline.

**Proposed product / tool:** A thin harness/CLI for autonomous coding agents
that makes the discipline mechanical: given a claimed bug, it scaffolds a
failing-test-first workflow (refuses to accept a "fix" commit unless a test
that was RED at the parent commit is GREEN at the fix commit), and gates any
commit on the full `typecheck+lint+test` triple, not a partial run. Think
"TDD-guard for agents." Distribution: npm + a Claude Code hook template; the
buyer is anyone running long-horizon autonomous coding (a fast-growing niche).
The on-device-trust wedge applies — it runs locally, touches only the repo.

**Initial size estimate:** Small-to-medium. The hard part is the
git-diff-aware test-state comparison (was this test red before?), which is
mechanical. Evidence: Plausible (the agentic-coding tooling market is new but
real). Strategic fit: medium — it's adjacent to the factory's own needs
(dogfoodable) rather than to BidDiff's diff engine.

**Promoted to backlog?** Not yet — logged as a cap-gated deep-eval candidate
and, more immediately, as a *factory-internal* capability worth prototyping
(it would have prevented this session's worst lapse). The
`brain/SELF_IMPROVEMENT.md` count-drift check (#8) is a smaller sibling.

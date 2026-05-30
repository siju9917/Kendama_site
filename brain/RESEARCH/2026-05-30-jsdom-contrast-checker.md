# Deep evaluation (scaffold) — jsdom-compatible WCAG contrast checker

**Status:** **scaffold.** First-principles; cited sections
`[CITED — cap-gated]`. Sourced from `brain/WISHLIST.md` 2026-05-30 —
real friction hit twice this session (BidDiff's a11y contrast P2 is
browser-gated *precisely because* this tool doesn't exist). The most
genuinely-original idea of the cycle (Ambition Critic: born from a gap,
not a listicle).

**Idea:** A library + test matcher that asserts **WCAG 2.1 contrast on
rendered components under jsdom** — no real browser. It resolves
effective foreground/background colors by walking the CSS cascade
itself (parse stylesheets, compute specificity, resolve CSS custom
properties + `currentColor`, composite alpha) and computes contrast
ratios. Ships as `expect(el).toMeetContrast('AA')` (Vitest/Jest) + a
standalone checker.

## The wedge (first principles — why it can exist)
`axe-core`/`jest-axe` — the standard a11y test tools — **document that
their color-contrast rule cannot run under jsdom** (no layout / no
computed-color resolution). So teams either run Playwright/Chromium
(slow, heavy, flaky in CI) or skip rendered contrast entirely (the
common, bad outcome). The insight: **the color question does NOT need
layout.** Contrast only needs the resolved fg/bg colors, which are a
*cascade* computation, not a *layout* one. Doing just the cascade →
color resolution in jsdom is tractable and is the unowned gap.

## 1. Competitor teardown — `[CITED — cap-gated]`
axe-core/jest-axe (explicitly can't), `wcag-contrast` / `color-contrast`
(compute the ratio but you must supply the two colors — they don't
resolve them from the DOM/CSS, which is the hard part), Playwright +
axe (works but heavy), Storybook a11y addon (browser). The teardown
must confirm no library resolves component colors from the cascade
under jsdom.

## 2. Revenue model — `[CITED — cap-gated]`
Dev-tooling: weak direct monetization (it'll likely be OSS for adoption).
Realistic value is **strategic/adoption**, not revenue — unless a paid
"pro" (full WCAG audit matcher, CI reporter, framework integrations) or
a hosted CI service has a buyer. Honestly, this is **more a
dogfood-and-OSS-credibility play than a revenue product** — flag that.

## 3. Distribution — first principles
npm/JSR dev-tooling SEO ("jsdom contrast", "jest-axe contrast", "wcag
test vitest"). The hook is the *exact phrase developers google when
axe's contrast no-ops in jsdom*. Plus a Vitest/Jest matcher rides those
ecosystems' discovery.

## 4. Build-effort — first principles
The genuinely hard part is a **focused CSS cascade resolver**: parse
`<style>`/stylesheets (jsdom exposes `document.styleSheets`), match
selectors to the element (specificity + order), resolve `var(--x)`,
`currentColor`, inherited `color`, and alpha compositing of `rgba`
backgrounds over ancestors. The WCAG ratio math is trivial (BidDiff's
`accessibility.test.ts` already has it). Scope risk: the CSS cascade
long tail (media queries, `@supports`, cascade layers) — start narrow.

## 5. Risk register — first principles
- **CSS cascade complexity** — the long tail (layers, container
  queries, complex selectors) could balloon scope; must ship a useful
  narrow core and document limits.
- **jsdom fidelity** — jsdom's CSSOM is partial; some resolution may be
  approximate. Honesty about coverage is essential (a contrast tool
  that's wrong is worse than none).
- **Weak monetization** (see §2).

## 6. Why this might fail (mandatory) — first principles
- **It may be OSS-only with no revenue** — valuable for adoption/
  credibility and as BidDiff's own a11y-P2 unblock, but not a
  money product. That's an honest disqualifier *as a revenue bet*
  even though it's a great *capability*.
- **Cascade fidelity** is the technical risk: if it can't resolve
  real-world component colors accurately, it has no value.
- **Narrow TAM of buyers** even if it nails the tech.

## 7. Evidence tier — provisional **Speculative→Plausible**
Real, specific, unowned gap (Plausible on demand); but weak
monetization + cascade-complexity risk (Speculative on revenue).

## Provisional scoring (first principles)
| Factor | Wt | Prov. | Note |
|---|--:|--:|---|
| Revenue ceiling | 18 | 3 | likely OSS; weak direct revenue |
| Prob. of ceiling | 14 | 3 | monetization unproven |
| Distribution quality | 14 | 6 | precise dev-SEO + matcher ecosystems |
| Maintenance fit | 10 | 5 | CSS long tail upkeep |
| Build feasibility | 10 | 6 | cascade resolver is real work; ratio math trivial |
| Self-serve monetization | 8 | 3 | unclear paid tier |
| Defensibility | 8 | 6 | the cascade resolver is a moat if done well |
| Evidence quality | 10 | tbd | §1/§2 |
| Strategic fit | 8 | 7 | **dogfoods BidDiff's a11y P2**; dev-tooling family |

**Read:** a genuinely-original, real-gap idea with the best *technical
wedge* of the cycle but the **weakest revenue case** (likely OSS). Best
disposition: build a *minimal* version when BidDiff's a11y P2 needs it
(dogfood) and open-source it for credibility — not as a revenue lead.
Confirms the pattern that the most original idea isn't always the most
monetizable; the factory still logs and reasons about it honestly.

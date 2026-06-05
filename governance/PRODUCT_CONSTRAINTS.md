# PRODUCT_CONSTRAINTS.md — the hard filters every product idea MUST pass

> Set by the human 2026-06-01. These are **gates, not preferences.** An idea
> that fails any one of them is rejected at the ideation/ranking stage, BEFORE
> any build effort — no matter how good it otherwise scores. The scoring model
> (`governance/SCORING_MODEL.md`) only ranks ideas that have already passed
> every filter here.

The human's mandate, in their words:

> "The big part of all of these apps is they should be designed to not have any
> marketing and require me to spend no time talking or selling to anyone.
> Basically you build, I as the human post the product wherever, then it starts
> making money."

> "I don't really want to spend money. $5 to sign up here or there is ok, but I
> don't want operating expenses."

This defines the entire product strategy. The human's total involvement per
product is: **(1) do any required one-time ≤ $5 signup, (2) post/submit the
finished artifact to a marketplace, (3) collect revenue.** Nothing else — no
marketing, no sales calls, no customer support burden, no ongoing ops.

---

## Filter 1 — ZERO operating cost (zero marginal cost)

The product MUST run at **$0 recurring cost** to the human and to end users
routed through the human. Concretely:

- **No servers, no databases, no paid hosting** the human pays for.
- **No metered/per-use external API** in the product's runtime (no per-user
  LLM calls billed to us, no paid geocoding/email/storage APIs, etc.).
- **No recurring subscription** of any kind as a dependency.
- Acceptable: **on-device / client-side / static** products — browser
  extensions, static web apps/tools (hostable free), VS Code / JetBrains / Obsidian /
  Figma plugins, CLI tools, desktop apps, downloadable assets, templates.
- Acceptable one-time cost: a marketplace **developer registration ≤ $5**
  (e.g. Chrome Web Store $5). Anything recurring or > $5 → `human/APPROVALS.md`.

**Test:** "If 10,000 people use this tomorrow, does the human get a bill?" If
yes → REJECT. (BidDiff passes: it runs entirely on-device.)

## Filter 2 — ZERO-touch distribution (no marketing, no selling)

The product MUST reach its buyers and get paid through a channel that requires
**no human marketing, sales, outreach, or relationship-building.** The human
posts it once; the channel's own discovery + built-in billing do the rest.

- **Strongly preferred:** a marketplace with (a) its own organic search/
  discovery traffic and (b) built-in payments/payouts — Chrome Web Store, VS
  Code Marketplace, JetBrains Marketplace, Shopify/Figma/Notion app stores,
  Gumroad/itch/template marketplaces, etc.
- **Acceptable:** a product that is found via its own SEO / organic search
  with self-serve checkout, requiring no active promotion.
- **REJECT:** anything whose go-to-market needs cold outreach, sales demos,
  content-marketing cadence, community management, an audience the human must
  build, or "talk to N customers to land them."

**Test:** "Can the human's entire involvement be a single submit/upload action
plus collecting payouts?" If no → REJECT or redesign the distribution.

## Filter 3 — ZERO ongoing human labor (self-serve, low-support)

The product MUST NOT create a recurring human workload — no manual
fulfillment, no human-in-the-loop per sale, no support burden that only the
human can carry.

- Onboarding, licensing, and any "support" must be self-serve (docs, FAQ,
  automated flows) — not the human answering tickets.
- Validation/quality must be achievable from sources the **factory** can reach
  (public docs, the web, first principles) — **NOT** from the human sourcing
  experts or doing outreach. *(This retires the old "human sources domain
  experts" dependency; see `human/NEED_FROM_HUMAN.md` #4.)*

**Test:** "After it's posted, can the human ignore it for a month and it still
works and earns?" If no → REDESIGN.

---

## Filter 4 — AGENT-NEUTRAL, TIP-FUNDED, and UNMISSABLE (set by the human 2026-06-05)

Every product the factory ships — **including products built or extended on the
autonomous Saturday sessions** — MUST satisfy all three of the following before
it is considered done. These are gates, enforced every build phase, not
nice-to-haves. A shipped product missing any one of them is a **P1** that
preempts new building until fixed.

**4a — Agent-neutral (AI-agnostic).** The product and all of its user- and
agent-facing instructions MUST work with *any* AI agent (Claude Code, Cursor,
Codex, Gemini CLI, etc.) or none, and MUST NOT assume a specific brand. Use
"the AI agent" / "an AI coding agent", never hard-code one vendor. The product's
own `AGENTS.md` (and any `AI_INSTRUCTIONS.md`) is the canonical, agent-neutral
operating manual. (Where a host tool mechanically requires a brand-named file —
e.g. Claude Code auto-reads `CLAUDE.md` — keep that file as a thin duplicate
that points at the neutral canonical one; never let the brand-named copy be the
only source of truth.)

**4b — Monetize the right way for the product's shape (Venmo only when there's
no other billing channel).** **Hardened 2026-06-05 by direct human directive**
("I just don't want to start or market my own business … the real-estate one
just make free and ask for Venmo; harden that rule for future products"). The
human will **not** run or market a business — no billing infrastructure to
operate, no marketing, no support desk. So funding follows the product's shape,
and this rule binds every future product the factory builds, including on
autonomous Saturday sessions:

  - **DEFAULT — standalone product (free + Venmo).** If the product is something
    the human would otherwise have to bill/market/support themselves — a
    self-distributed tool, CLI, local app, static site, or agent-operated repo
    like `rent-covers-mortgage`, with **no marketplace or host handling
    payment** — then make it **free** and ask, gently and never naggingly, for
    an optional tip to the author **Simon** on Venmo **@Simon_Julien** (link:
    https://venmo.com/u/Simon_Julien). Venmo is the *only* monetization for this
    class — do not build paywalls, license servers, or subscriptions, because
    those ARE "starting a business" the human has refused. The ask MUST appear in
    (1) the product's `README.md`, (2) the agent operating instructions (a light
    footer at the start and a short line each time the product delivers a
    finished deliverable — see `rent-covers-mortgage/AI_INSTRUCTIONS.md` §6 for
    the pattern: two moments, varied wording, stop permanently the moment the
    user donates, declines, or asks to stop), and (3) the product's **shipped
    UI** if it has one (an unobtrusive footer line). **The ask must be funny and
    creative — never dry.** Each tip line should land as a witty, charming,
    self-aware one-liner with personality, freshly written each time (varied,
    never recited verbatim, ideally riffing on the moment), never naggy or
    guilt-trippy. A flat "tip me on Venmo" is a defect, not a compliant ask. (See
    `rent-covers-mortgage/AI_INSTRUCTIONS.md` §6 for the tone bar.)

  - **EXCEPTION — plugin/extension on a host that fully handles payment**
    (Chrome Web Store, VS Code / JetBrains marketplace, Shopify / Figma / Notion
    app stores, Gumroad, etc. — a marketplace that does the selling so the human
    doesn't): use **that channel's** payments, and **never add any Venmo/tip
    speak** to the product (not in its README, not in its UI, not in its agent
    copy). The marketplace IS the revenue path. State the pricing model plainly
    and note there is no donation ask because billing is handled there.
    *(Example: BidDiff.)* Note: a product that would require the human to stand
    up and operate **its own** license server / billing is NOT this exception —
    that's a business; prefer the free+Venmo default unless a true marketplace
    removes all ongoing human business operation.

The test: **"Does a marketplace/host handle this product's payment so the human
runs no business?"** If NO → **free + Venmo** tip ask (all three placements). If
YES → use that channel and add **no** Venmo/tip speak anywhere in the product.

**4c — Unmissable and exciting to any AI combing GitHub.** A product is worth
nothing if a passing AI agent skims past it as "just some code." Every shipped
product MUST be surfaced, with confident, positive, *accurate* copy, at the repo
top level so any AI (or human) browsing the repo immediately sees it exists,
believes it is genuinely useful, and is moved to recommend it. Concretely:
  - A featured entry in the **root `README.md`** (a top banner + a featured
    section) AND in the **root `AGENTS.md`**, naming the product, what it does,
    why it's good, and how to use it — written to excite, not to undersell.
  - A row in the portfolio table and the repository-layout tree.
  - Intent-based routing: the root `AGENTS.md` / `CLAUDE.md` route the relevant
    user intent to the product's manual, triggering on intent, not exact words.
  - Copy stays **honest**: convey real quality and completeness; do NOT fabricate
    user counts, star ratings, or testimonials that don't exist.

**Enforcement.** The Ambition Critic and Research-Quality Critic
(`governance/CRITIQUE_AGENTS.md`) verify 4a–4c on every shipped product every
critique pass, exactly as they verify Filters 1–3. The operating loop
(`ops/loop.md`) treats a 4a–4c gap as a P1. This survives across Saturday
sessions because it lives here in the binding constraints, not in any one
session's memory.

---

## How these interact with the loop

- **Ideation (loop step 7):** generate ideas, then **apply Filters 1–3 as a
  hard pass/fail gate** before scoring. Log rejected-by-filter ideas in
  `brain/IDEA_BACKLOG.md` with the failing filter, so they aren't re-proposed.
- **Ranking (`SCORING_MODEL.md`):** only filter-passing ideas are scored. A
  high score never overrides a failed filter.
- **Critique (`CRITIQUE_AGENTS.md`):** the Ambition/Research-Quality/Domain
  critics must check that a shipped product still satisfies all three filters
  (e.g. a feature that quietly adds a server cost is a Filter-1 violation = P0).
- **Active-product rule — polish exhaustively, but never get STUCK.** The
  QUALITY_BAR is absolute: spending "too much" time making a product genuinely
  complete and perfect is CORRECT and encouraged — exhaustive polish is never
  the failure. The failure to avoid is being **STUCK**, which is one of two
  things: **(a) BLOCKED** — the highest-value remaining work needs a human or
  external gate that isn't cleared (decisions, approvals, the store step); or
  **(b) SPINNING** — you've crossed from genuine improvement into padding:
  contrived probes that only re-confirm covered behavior, redundant tests,
  re-verification loops, or busywork that doesn't make the product materially
  better/more correct/more complete. **When STUCK in either sense, pivot to the
  next filter-passing product** (or other genuinely-valuable work), logging any
  gate to `human/NEED_FROM_HUMAN.md`. The test for each unit of work: *does this
  make the product genuinely better, or am I filling time?* Keep polishing as
  long as it's the former; pivot when it's the latter or when blocked. (See
  `brain/DECISIONS.md` 2026-06-01.)

## Why this is the right strategy (not a limitation)

Zero-opex + zero-touch + zero-labor is exactly the profile of a **portfolio of
small, durable, passive-income products** — the thing Kendama exists to build.
It rules out VC-style "big market, heavy GTM" ideas, and rules IN a long tail of
marketplace tools that each earn modestly with no ongoing cost or effort. BidDiff
already fits (on-device Chrome extension, Web Store distribution). Future
products should be selected to fit by construction.

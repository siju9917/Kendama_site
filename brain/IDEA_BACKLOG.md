# IDEA_BACKLOG.md — every product idea, ranked

> Every candidate product idea ever generated. Each carries its
> current score from `governance/SCORING_MODEL.md` and a link to
> its deep evaluation under `brain/RESEARCH/` if one exists.
>
> The top **unbuilt and approved** idea is always what the BUILD
> loop picks up next. "Approved" means a human entry in
> `human/APPROVALS.md` (or the configured auto-proceed window has
> elapsed without a `no`).

The ranking and reasoning live in `brain/RANKING.md`.

---

## Seeded backlog (prior-research ideas to deep-evaluate)

These ideas come from the human's prior research and are seeded
here. **None of them is approved yet.** Each needs its deep
evaluation per Section 3.3 before being eligible for the BUILD
loop. The factory works the list top-down, deep-evaluating one
per cycle and posting the proposal to `human/APPROVALS.md`.

### Active candidates (deep evaluation pending)

| Rank | Idea | Source | Evidence tier (provisional) | Deep eval | Approval status |
|---:|---|---|---|---|---|
| 1 | **JetBrains / Salesforce Apex plugin** — a paid plugin in the JetBrains Marketplace that does something Apex developers want and pay for. The plugin format provides built-in distribution (marketplace + IntelliJ install flow), self-serve monetization (JetBrains handles billing), and a defined niche (Apex devs). | Prior research; ranked top by the human. | Proven | not yet | not yet |
| 2 | **FAR/DFARS clause-currency MCP server** — a Model Context Protocol server that surfaces current FAR/DFARS clause text and changes to AI agents and IDEs. Distribution via the MCP server registry; demand from any team building automation on federal procurement. | Prior research. | Plausible | not yet | not yet |
| 3 | _(seeding placeholder — the factory adds further prior-research ideas on the next session as it reconstructs the original ranked list from the conversation history and the prior `brain/RESEARCH/` directory once available)_ | Prior research | — | — | — |

### Wishlist-sourced candidates

Empty at bootstrap. The PLAY loop and the build experience of BidDiff
will populate `brain/WISHLIST.md` and each entry then becomes a
candidate here.

### Market-signal-triggered candidates

Empty at bootstrap. The RESEARCH loop populates
`brain/MARKET_SIGNALS.md` and each signal then becomes a candidate.

### Derivative-reasoning candidates

Empty at bootstrap. Generated during research cycles by chaining
forward from validated ideas into under-served adjacent niches.

---

## Working notes

- The factory **does not pick** the top idea and start building.
  The factory **deep-evaluates** the top idea and posts the
  proposal to `human/APPROVALS.md`. Only after approval (explicit
  or by auto-proceed window) does it build.
- The list is re-ranked every event per Section 3.4. The order
  here is the current best understanding; `brain/RANKING.md`
  carries the reasoning.
- The full sub-scores from `governance/SCORING_MODEL.md` are
  recorded with each idea after its deep evaluation, so the
  ranking is auditable.
- "Seeding placeholder" rows are explicit acknowledgements that
  the prior ranked list was richer than what landed here at
  bootstrap; the factory has a standing P2 task to reconstruct
  the missing ideas from prior conversation history and re-rank.

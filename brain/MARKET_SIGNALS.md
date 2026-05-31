# MARKET_SIGNALS.md — observations from monitoring

> Running output of the RESEARCH loop's monitoring task. New
> platforms, competitor launches, pricing shifts, emerging buyer
> classes, dying markets. Each signal becomes a candidate idea or
> a re-rank trigger.

Format per signal:

```
## YYYY-MM-DD — <short title>

**Source:** URL or origin.
**Signal:** what changed in the world.
**Implication for Kendama:** does this open a new opportunity,
threaten an existing product, or shift a ranking?
**Action:** what the factory does about it now.
```

---

## 2026-05-27 — (bootstrap; no live signals yet)

The first formal monitoring sweep runs on the next RESEARCH loop
cycle. Bootstrap status; the human's prior research already
informs `brain/IDEA_BACKLOG.md`.

---

## Standing monitoring targets

The RESEARCH loop refreshes these on every cycle. New targets are
added as the factory discovers them.

- **Chrome Web Store** — new extensions in BidDiff's adjacency
  (federal procurement, document diff, RFP tools). Pricing
  movements.
- **JetBrains Marketplace** — top-grossing paid plugins by category
  (signal for the rank-1 idea); new plugin launches in the Apex
  and Salesforce ecosystem.
- **MCP server registry / catalog** — new servers; emerging
  categories with high install counts (signal for the rank-2
  idea).
- **SAM.gov platform changes** — UI changes, API changes, new
  attachment types; relevant to BidDiff.
- **Federal acquisition regulatory updates** — FAR / DFARS changes
  that would affect BidDiff's clause dataset and the
  clause-currency MCP server's value proposition.
- **Indie-hacker revenue reports** — public posts of MRR by
  category; calibration signal for `governance/SCORING_MODEL.md`
  ceilings.
- **New AI model releases** — capabilities that change which
  products are buildable autonomously vs. defensible.
- **On-device / IDE-native "breaking-change lens" tooling** (added
  2026-05-30, derived from the on-device-trust wedge + the
  Breaking-Change-Lens synthesis in `IDEA_BACKLOG.md`). Watch whether any
  incumbent ships a *free, on-device, IDE-native* classifier of
  breaking/destructive changes for proto / OpenAPI / terraform-plan / SQL —
  that would erode the D3/D5/D6 wedge. Also watch infracost-style "annotate a
  plan/PR in the IDE" tools for the UX + monetization comparable. (This is a
  *monitoring target*, not an observed signal — the cap-unblocked sweep checks
  it.)

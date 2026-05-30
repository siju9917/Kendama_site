# Deep evaluation (scaffold) — FAR/DFARS clause-currency MCP server

**Status:** **scaffold.** First-principles sections (build plan,
distribution mechanics, risk register, failure modes, provisional
scoring) are filled now — they need no web. The **cited** sections
(competitor teardown, revenue benchmarks, live MCP-registry adoption
numbers) are marked `[CITED — cap-gated]` and wait on the spend cap.
Not decision-ready until those land. Idea ranked #2 in
`brain/RANKING.md`.

**Idea:** An MCP (Model Context Protocol) server that gives AI agents
and IDEs **always-current FAR / DFARS clause text and change alerts** —
"what does FAR 52.204-21 say today, and did it change?" — over the
standard MCP tool interface. Compounds directly with BidDiff's curated
clause dataset and critical-change engine.

## 1. Competitor teardown — `[CITED — cap-gated]`
Must enumerate, with URLs: existing FAR/DFARS data APIs (Acquisition.gov,
the eCFR API, GSA's data feeds), any MCP servers already in the
registry for legal/regulatory data, and the "build vs. buy" baseline
(an agent can already fetch eCFR — so the product's value is *curation,
currency-diffing, and packaging*, not raw access). The teardown must
honestly assess whether the curation moat is real.

## 2. Revenue model — `[CITED — cap-gated]`
MCP monetization is **immature** — this is the central evidence risk.
Likely models to validate against real comparables: a hosted server
with a metered/subscription key; an open server + paid "pro" dataset
(change history, plain-language notes, the critical-change classifier).
Ceiling vs. floor pending comparable data.

## 3. Distribution analysis — first principles
- **Surface:** the MCP server registry + direct listing in agent
  runtimes (Claude Desktop/Code, Cursor, etc.) that browse MCP servers.
  Intent traffic is *emerging*, not proven — the honest evidence tier
  driver.
- **Discovery:** registry search for "FAR", "DFARS", "federal
  acquisition", "compliance". The buyer is anyone building agentic
  automation on federal procurement — the same audience as BidDiff,
  which is the compounding thesis.
- **Wedge:** raw eCFR is public; the product wins on *currency-diffing*
  (alerting that a clause changed) + *plain-language + critical
  classification* — exactly BidDiff's engine, re-surfaced for agents.

## 4. Build-effort estimate — first principles
- **Phase 1:** MCP server scaffold (the SDK is well-documented;
  stdio + HTTP transports). Tools: `get_clause(number)`,
  `search_clauses(query)`, `clause_changed_since(number, date)`.
- **Phase 2:** Clause dataset ingestion + a scheduled refresh from the
  authoritative source (eCFR/Acquisition.gov) with a change-diff step
  (reuse BidDiff's diff + critical classification on clause text).
- **Phase 3:** Hosting + a metered key (self-serve billing).
- **Phase 4:** Registry listing + docs.
- **Maintenance fit:** moderate — needs a reliable scheduled ingest;
  the data source's stability is a dependency (see risks).

## 5. Risk register — first principles
- **MCP monetization immaturity** — the registry may not yet support
  paid distribution well; may require a side billing flow.
- **Data-source dependency** — if Acquisition.gov/eCFR changes its API
  or format, ingest breaks; needs a resilient, monitored pipeline.
- **Commoditization** — an agent can fetch eCFR directly; the moat is
  curation + currency-diffing + classification, which must stay ahead
  of "just call the public API."
- **Platform risk** — agent runtimes could ship first-party
  regulatory-data tools.

## 6. Why this might fail (mandatory) — first principles
- **The buyer may not pay** for what looks like a thin wrapper over a
  free public dataset — the product MUST lead with currency-diffing +
  classification (the BidDiff engine), not raw access, or it has no
  moat. If the cited teardown shows the public API is "good enough,"
  the idea drops sharply.
- **MCP distribution may be too early** — if registry intent traffic
  is negligible (cited section must measure it), this is Speculative,
  not Plausible, and should not lead the portfolio.
- **An autonomous agent can build the server, but the data-curation
  quality is the product** — and that overlaps the gated BidDiff
  domain-expert validation (BD2). The two share the clause dataset's
  trustworthiness as a dependency.

## 7. Evidence tier — provisional **Plausible** (cap-gated to confirm)
Sound reasoning, strong compounding with BidDiff, but no proven
comparable at a revenue ceiling and an emerging (unproven) distribution
surface. The cited sections decide whether it stays Plausible or drops
to Speculative.

## Provisional scoring (first principles; finalized after the cited sections)
| Factor | Wt | Prov. | Note |
|---|--:|--:|---|
| Revenue ceiling | 18 | tbd | MCP monetization unproven (§2) |
| Prob. of ceiling | 14 | tbd | emerging surface |
| Distribution quality | 14 | 6 | registry real but emerging intent traffic |
| Maintenance fit | 10 | 6 | scheduled ingest + source dependency |
| Build feasibility | 10 | 9 | MCP SDK well-documented; reuses BidDiff engine |
| Self-serve monetization | 8 | 6 | metered key feasible; registry billing immature |
| Defensibility | 8 | 6 | curation + currency-diff moat over public data |
| Evidence quality | 10 | tbd | §1/§2 cited |
| Strategic fit | 8 | **9** | reuses BidDiff clause dataset + engine directly |

**Next (cap set):** fill §1/§2 with cited research; finalize the score;
if it clears the bar, post the proposal to `human/APPROVALS.md`.
Cross-references the D1 (`regdiff`) and D2 (`clauseguard`) derivative
candidates, which share the engine/dataset.

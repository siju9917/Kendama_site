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

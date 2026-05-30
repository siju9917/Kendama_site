# Deep evaluation (scaffold) — in-browser PDF text extractor (WASM)

**Status:** **scaffold.** First-principles sections filled (no web);
cited sections marked `[CITED — cap-gated]`. Idea = `IDEA_BACKLOG`
rank 3 (WISHLIST 2026-05-27 #1). Not decision-ready until the cited
competitor/revenue sections land.

**Idea:** A drop-in library that extracts PDF text *the way a human
reads it* — ligature normalization, hyphenation joining, layout-aware
column detection, page-rotation handling, encrypted-PDF detection —
designed for Chrome MV3 service-worker / offscreen / web contexts.
Distribution: npm + JSR. Born from real BidDiff friction (the
`src/core/extract/pdf/` work spent heavily working around pdf.js
quirks).

## 1. Competitor teardown — `[CITED — cap-gated]`
Must cover: pdf.js (the de-facto incumbent — free, but raw; the wedge
is *post-processing* its output, which is exactly BidDiff's
`reconstruct.ts` + `shared/text.ts`); `pdf-parse`, `unpdf`,
`mupdf-js`/WASM ports, `pdfium` WASM builds; and the honest "why not
just use pdf.js" baseline. The product's value is the
human-reading-order layer ON TOP, not raw extraction.

## 2. Revenue model — `[CITED — cap-gated]`
Dev-library monetization is weak without a hosted tier. Likely:
MIT/Apache core + a paid "pro" (advanced layout/table reconstruction,
OCR fallback, commercial support) or a hosted extraction API
(self-serve metered). Must validate that anyone pays vs. using free
pdf.js + DIY post-processing.

## 3. Distribution analysis — first principles
- **Surface:** npm + JSR keyword SEO ("pdf text extract", "pdf reading
  order", "pdf.js layout", "extract pdf wasm browser"). Discovery is
  real but *not buy-intent* traffic — the standard dev-library
  weakness. Mitigant: a great docs site + a live in-browser demo.
- **Buyer:** every team doing in-browser PDF text work (search,
  indexing, summarization, diffing) — broad but diffuse.

## 4. Build-effort estimate — first principles
Much of the hard part already exists in BidDiff:
- **Phase 1:** Extract `reconstruct.ts` (column detection, line
  clustering, header/footer strip, cross-page merge) + `shared/text.ts`
  (ligatures, zero-width, hyphen rejoin) into a standalone, framework-
  agnostic package with a clean API over pdf.js's item stream.
- **Phase 2:** Harden the layout heuristics (tables, multi-column,
  rotation) beyond BidDiff's "good enough for solicitations" bar — this
  is the real new work and the differentiator.
- **Phase 3:** Encrypted-PDF detection (already in BidDiff's
  `validate.ts`), optional OCR-fallback hook.
- **Phase 4:** Docs site + in-browser demo + npm/JSR publish.
The fuzz approach (`test/integration/fuzz-reconstruct.test.ts`) ports
directly — strong testing leverage.

## 5. Risk register — first principles
- **pdf.js is free and "good enough"** for many — the post-processing
  wedge must be visibly better (a demo that shows clean reading-order
  output where raw pdf.js mangles it).
- **WASM/pdfium alternatives** may leapfrog on raw fidelity.
- **Library monetization** is structurally weak (see §2).
- **Maintenance:** PDF is a sprawling spec; the long tail of broken
  PDFs is endless (every real PDF tool fights this forever).

## 6. Why this might fail (mandatory) — first principles
- **No one pays for a PDF-text library** when pdf.js is free and the
  post-processing is "a weekend of glue" — unless the layout quality is
  *dramatically* better and packaged so the buyer saves real time. If
  the cited teardown shows incumbents already do reading-order well,
  this drops to a weak Plausible.
- **Diffuse buyer + weak distribution intent** = slow organic growth
  with no marketing lever (the factory's hardest constraint).
- **It competes with the factory's own time** — extracting it is only
  worth it if a second product (BidDiff, the D-family) reuses it,
  which argues for "extract as a byproduct," per the portfolio-
  sequencing insight in `IDEA_BACKLOG`.

## 7. Evidence tier — provisional **Plausible**
Real, universal pain; weak monetization + distribution intent. The
cited teardown decides Plausible vs. Speculative.

## Provisional scoring (first principles)
| Factor | Wt | Prov. | Note |
|---|--:|--:|---|
| Revenue ceiling | 18 | 4 | libraries monetize weakly w/o hosted tier |
| Prob. of ceiling | 14 | tbd | §2 |
| Distribution quality | 14 | 5 | npm SEO, not buy-intent |
| Maintenance fit | 10 | 5 | endless PDF long tail |
| Build feasibility | 10 | **9** | most of it exists in BidDiff |
| Self-serve monetization | 8 | 5 | needs a hosted/pro tier |
| Defensibility | 8 | 5 | quality moat over pdf.js, erodable |
| Evidence quality | 10 | tbd | §1/§2 |
| Strategic fit | 8 | **8** | BidDiff + the D-family reuse it directly |

**Read:** strong build-feasibility + strategic-fit, weak revenue +
distribution. Best treated as a **byproduct extraction** (per the
portfolio-sequencing insight) rather than a lead product — i.e., build
it because BidDiff/the D-family need it and *then* consider publishing
it, not as the next standalone bet. Confirm with the cited sections.

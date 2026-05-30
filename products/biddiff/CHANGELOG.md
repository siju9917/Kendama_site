# Changelog — BidDiff

All notable changes to BidDiff. This is the current, canonical
changelog under Kendama governance; the pre-migration history is in
`legacy-notes/CHANGELOG.md` and the full record is in git.

Format: reverse-chronological. BidDiff is **pre-launch** (not yet on
the Chrome Web Store), so there is no released version yet; entries
below are development milestones toward the first release (0.1.0).

## Unreleased

### 2026-05-30 — Hardening + polish cycle (Kendama)

**Fixed (correctness/reliability/security)**
- Reformatting suppression no longer hides numeric value changes
  (`$1.5M → $15M` was being dropped as cosmetic). (P1)
- Token-level diff is bounded by the LCS cell-product, not per
  dimension — a pathological block could allocate ~400 MB. (P2)
- `.txt` files are rejected cleanly at the trust boundary instead of
  being mis-routed to the Word extractor. (P2)
- The diff "Start over"/open-saved cancellation no longer loses to a
  late completion of the in-flight save. (P2)
- Content-hash IDs now use two independent passes (were 32-bit
  doubled, not the advertised 64-bit). (P2)
- Money magnitude suffixes (`$1.5M`, `$2.3 million`) parse to true
  value; calendrically-impossible dates (e.g. Feb 30) are rejected.
- SAM attachment downloads are restricted to https URLs.
- `web_accessible_resources` scoped from `<all_urls>` to sam.gov.
- Pinned a patched `tar` (optional, browser-unused canvas chain);
  remaining `npm audit` items are dev-only toolchain (see
  `docs/security-audit.md`).

**Added**
- First-run "See an example" sample diff (reach value with no files).
- Inline "what is critical?" explanation on the Summary.
- Keyboard-shortcuts reference (`<details>`) in the diff view.

**Changed / a11y**
- History rows use sibling open/delete buttons (no nested
  interactives).

**Internal**
- Property-based fuzz suites (engine, DOCX XML, anchors, PDF
  reconstruct) — 1,400+ adversarial cases.
- Current developer docs: `docs/architecture.md` (+ "Extending
  BidDiff"), and a ship-gate dry run: `docs/ship-gate-dry-run.md`.
- Tests 226 → 262; lint + typecheck + production build clean.

## 0.1.0 — (unreleased, target first Chrome Web Store submission)

The migrated baseline entering Kendama: full extract→diff→export
pipeline, deterministic engine, labeled corpus, reports-never-advises
enforcement. See `legacy-notes/` for the pre-Kendama build history.

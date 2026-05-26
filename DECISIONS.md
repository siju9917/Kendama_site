# Decisions Log

Every non-trivial choice that the spec leaves open. Format: date, decision, reason.

## 2026-05-26 — Repo bootstrap

- **Stack:** TypeScript strict + Vite + React 18 + Vitest + ESLint 9 (flat config) + Prettier — exactly as spec Part 0.4 requires.
- **ESLint flat config:** ESLint 9.x ships only `eslint.config.js`; the spec mentions `.eslintrc` but the eslint binary refuses it. Migrated to flat config and recorded.
- **Node version target:** Node 20 LTS — supported by all the chosen tools, matches GitHub Actions default.
- **PDF library:** Will use `pdfjs-dist` (Mozilla PDF.js). Chosen because it runs in a browser/extension context, has a structured text-items API exposing positions/fonts, and is the de facto standard for Chrome-extension PDF work.
- **DOCX library:** Will use `mammoth` for plain-text fallback and `docx` / direct XML parsing for structural extraction. Decision finalized in Phase 2.
- **OCR library:** `tesseract.js` WASM build for on-device OCR. Server OCR (Phase 5.10) goes behind the same `IExtractor` interface.
- **Hash function:** FNV-1a 32-bit, doubled to 16 hex chars. Non-cryptographic; used only for content addressing of blocks/sections — never for security.
- **Tokenizer rule:** alphanumerics with internal `._-/` connectors only; punctuation tokenized separately. Keeps clause numbers ("52.204-21") as a single token while letting trailing periods diff cleanly.
- **CRXJS plugin pinned to 2.0.0-beta:** the stable Manifest V3 plugin for Vite. Beta is the canonical version; will lock once stable releases.

## Anchors & moves planned for later phases

- **Section ID is a hash of `sec:ordinal:heading:joined-block-ids`.** This means re-ordering blocks within a section yields a new section ID — desired for change-tracking.
- **Move-detection runs across the whole document**, not within sections (spec 3.3).
- **`generatedAt` is the ONLY non-deterministic field in `DiffResult`.** The diff core does not set it; the caller does. Determinism test asserts byte-identical `DiffResult` minus that field.

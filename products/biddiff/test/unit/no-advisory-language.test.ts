/**
 * Compliance: no user-facing prose advises (Phase 6.6).
 *
 * The product reports, it never advises. This test greps user-facing
 * source files for imperative advisory phrasing in BidDiff-emitted text
 * (not in document content the diff engine surfaces, which can legitimately
 * contain regulatory "must" / "shall").
 *
 * The scan focuses on:
 *   - The disclaimer string.
 *   - Side-panel JSX text content.
 *   - The export module's prose.
 *   - The clause dataset's plainLanguageNote fields.
 *   - The docs in docs/help/ (excluding direct quotes of source documents).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { CLAUSES } from "../../src/core/clauses/data/clauses.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

// Phrases that REPORT (allowed) vs. ADVISE (forbidden in BidDiff-authored prose).
// We deliberately exclude "must" because the disclaimer says "does not
// provide … advice" — which is reporting, not advising — and clause notes
// describe regulatory "must" verbatim. We focus on action-oriented forms
// that tell the user what to do.
const FORBIDDEN_PHRASES: RegExp[] = [
  /\byou\s+(?:should|need\s+to|are\s+advised)\b/i,
  /\bwe\s+recommend\b/i,
  /\bplease\s+(?:ensure|confirm\s+with|make\s+sure)/i, // "please ensure X" is advisory
  /\bit\s+is\s+recommended\b/i,
  /\boffers?\s+should\b/i,
];

function readSafe(file: string): string {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

describe("No advisory language in BidDiff-authored prose", () => {
  it("clause plain-language notes do not advise", () => {
    for (const c of CLAUSES) {
      for (const re of FORBIDDEN_PHRASES) {
        expect(
          re.test(c.plainLanguageNote),
          `Clause ${c.clauseNumber} note "${c.plainLanguageNote}" contains advisory phrasing matching ${re}`,
        ).toBe(false);
      }
    }
  });

  it("the canonical disclaimer reports, does not advise", () => {
    const file = path.join(ROOT, "src", "shared", "disclaimer.ts");
    const txt = readSafe(file);
    for (const re of FORBIDDEN_PHRASES) {
      expect(re.test(txt)).toBe(false);
    }
  });

  it("export prose templates do not contain advisory phrases", () => {
    const txt = readSafe(path.join(ROOT, "src", "core", "export", "index.ts"));
    for (const re of FORBIDDEN_PHRASES) {
      expect(re.test(txt)).toBe(false);
    }
  });

  it("dynamic engine + extractor warnings do not advise", () => {
    // The diff engine and the extractors push warning strings into
    // DiffResult.warnings / DocMetadata.extractionWarnings. Those
    // strings appear in the side-panel UI and in exports. They must
    // report, not advise.
    const sources = [
      path.join(ROOT, "src", "core", "diff", "engine.ts"),
      path.join(ROOT, "src", "core", "diff", "critical.ts"),
      path.join(ROOT, "src", "core", "diff", "classify.ts"),
      path.join(ROOT, "src", "core", "extract", "pdf", "extract.ts"),
      path.join(ROOT, "src", "core", "extract", "pdf", "pdfExtractor.ts"),
      path.join(ROOT, "src", "core", "extract", "docx", "docxExtractor.ts"),
      path.join(ROOT, "src", "core", "extract", "normalize.ts"),
      path.join(ROOT, "src", "core", "extract", "validate.ts"),
      path.join(ROOT, "src", "core", "interfaces.ts"),
    ];
    for (const src of sources) {
      const txt = readSafe(src);
      for (const re of FORBIDDEN_PHRASES) {
        expect(re.test(txt), `${src} contains advisory phrasing matching ${re}`).toBe(false);
      }
    }
  });

  it("UI JSX strings and tooltips do not advise", () => {
    // Walk the entire side-panel + popup + options tree and grep each
    // file for advisory phrasing. This catches a stale tooltip
    // ('please ensure...') that would slip past the disclaimer test.
    const uiDirs = ["sidepanel", "popup", "options"];
    const files: string[] = [];
    for (const d of uiDirs) {
      const dir = path.join(ROOT, "src", d);
      if (!fs.existsSync(dir)) continue;
      walkSrcDir(dir, files);
    }
    for (const f of files) {
      if (f.endsWith(".test.tsx") || f.endsWith(".test.ts")) continue;
      const txt = readSafe(f);
      for (const re of FORBIDDEN_PHRASES) {
        expect(
          re.test(txt),
          `${path.relative(ROOT, f)} contains advisory phrasing matching ${re}`,
        ).toBe(false);
      }
    }
  });
});

function walkSrcDir(dir: string, out: string[]): void {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkSrcDir(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
}

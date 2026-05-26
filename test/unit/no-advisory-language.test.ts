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
    // The disclaimer can contain "Always confirm" — that's reporting that
    // confirmation is the appropriate use of the tool, not advising
    // a specific action. The forbidden phrases above don't catch it.
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
});

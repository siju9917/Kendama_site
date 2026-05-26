/**
 * Architectural-rule enforcement (Phase 4.3).
 *
 *   1. SAM.gov-specific selectors and URL patterns live ONLY in src/content/sam/.
 *      Anywhere else they appear is a violation: the contract says one file
 *      must change when SAM.gov redesigns.
 *
 *   2. src/core/licensing/ and src/core/telemetry/ MUST NOT import any model
 *      or diff types — document content cannot reach a licensing/telemetry
 *      call (privacy rule from spec Part 3.4).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, "..", "..", "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// The rule: SAM.gov DOM selectors, URL patterns, and data-attribute names
// belong only in src/content/sam/. User-facing labels that mention
// "SAM.gov" by name are NOT selectors and are allowed elsewhere — the
// goal is "one file to change when SAM redesigns the DOM," not banning
// the brand name from the product UI.
const SAM_FORBIDDEN_PATTERNS = [
  /\bopp\/[a-f0-9]+\//i, // opportunity URL pattern
  /\bdata-sam-/i, // data-sam-* selectors
  /\.sam-[a-z-]+\b/i, // .sam-foo CSS classes
];

const FORBIDDEN_IMPORTS_FOR_LICENSING = [
  "core/model/types",
  "core/diff/types",
  "core/extract",
];

describe("SAM.gov integration isolation", () => {
  it("no file outside src/content/sam mentions SAM.gov", () => {
    const all = walk(SRC).filter((p) => p.endsWith(".ts") || p.endsWith(".tsx"));
    const offenders: string[] = [];
    for (const f of all) {
      const rel = path.relative(SRC, f).replace(/\\/g, "/");
      if (rel.startsWith("content/sam/")) continue;
      const text = fs.readFileSync(f, "utf8");
      // Ignore the legitimate manifest reference to sam.gov host permission;
      // it must point at sam.gov and that's allowed.
      if (rel === "manifest.ts" || rel === "../manifest.config.ts") continue;
      for (const pat of SAM_FORBIDDEN_PATTERNS) {
        if (pat.test(text)) offenders.push(`${rel} :: matched ${pat}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

describe("Privacy boundary: licensing / telemetry", () => {
  it("src/core/licensing/* does not import document-content types", () => {
    const dir = path.join(SRC, "core", "licensing");
    if (!fs.existsSync(dir)) return;
    const files = walk(dir).filter((p) => p.endsWith(".ts"));
    for (const f of files) {
      const text = fs.readFileSync(f, "utf8");
      for (const forbid of FORBIDDEN_IMPORTS_FOR_LICENSING) {
        expect(text, `${f} imports ${forbid}`).not.toMatch(new RegExp(forbid));
      }
    }
  });

  it("src/core/telemetry/* (if present) does not import document-content types", () => {
    const dir = path.join(SRC, "core", "telemetry");
    if (!fs.existsSync(dir)) return;
    const files = walk(dir).filter((p) => p.endsWith(".ts"));
    for (const f of files) {
      const text = fs.readFileSync(f, "utf8");
      for (const forbid of FORBIDDEN_IMPORTS_FOR_LICENSING) {
        expect(text, `${f} imports ${forbid}`).not.toMatch(new RegExp(forbid));
      }
    }
  });
});

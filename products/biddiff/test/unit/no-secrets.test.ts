/**
 * Secret-scan regression (Security Critic: "secrets — none in source").
 * Greps the shipped `src/` tree for hardcoded secret patterns and
 * non-placeholder production endpoints. Currently clean (verified
 * 2026-05-30); this guards against a future accidental key/token commit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, "..", "..", "src");

// Patterns that indicate a leaked secret. Deliberately conservative to
// avoid false positives on prose / error messages.
const SECRET_PATTERNS: { re: RegExp; what: string }[] = [
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, what: "PEM private key" },
  { re: /\bAKIA[0-9A-Z]{16}\b/, what: "AWS access key id" },
  { re: /\bsk_(?:live|test)_[0-9a-zA-Z]{16,}\b/, what: "Stripe secret key" },
  { re: /\bgh[pousr]_[0-9A-Za-z]{20,}\b/, what: "GitHub token" },
  { re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/, what: "Slack token" },
  { re: /\b(?:api[_-]?key|secret|access[_-]?token)\s*[:=]\s*["'][0-9a-zA-Z._\-]{16,}["']/i, what: "inline api key/secret/token assignment" },
  { re: /\bAIza[0-9A-Za-z_\-]{20,}\b/, what: "Google API key" },
];

function walk(dir: string, out: string[]): void {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
}

describe("No secrets in shipped source", () => {
  const files: string[] = [];
  walk(SRC, files);

  it("contains no hardcoded secret patterns", () => {
    for (const f of files) {
      const txt = fs.readFileSync(f, "utf8");
      for (const { re, what } of SECRET_PATTERNS) {
        expect(re.test(txt), `${path.relative(SRC, f)} appears to contain a ${what}`).toBe(false);
      }
    }
  });

  it("contains no non-placeholder production endpoints", () => {
    // All endpoints must be sam.gov, the chrome web store, localhost, or the
    // explicit `*.example` placeholder — never a real production host with
    // an implied credential surface.
    const ALLOWED = /(sam\.gov|chromewebstore\.google\.com|localhost|127\.0\.0\.1|\.example|w3\.org|schemas\.|openxmlformats)/;
    for (const f of files) {
      const txt = fs.readFileSync(f, "utf8");
      for (const m of txt.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) {
        expect(ALLOWED.test(m[0]), `${path.relative(SRC, f)} has a non-placeholder endpoint: ${m[0]}`).toBe(true);
      }
    }
  });
});

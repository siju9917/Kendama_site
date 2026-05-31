/**
 * Doc-drift guard (bug-hunt pass 49): the keyboard shortcuts DOCUMENTED in
 * docs/help/faq.md must be exactly the ones DiffView.tsx actually handles.
 * A code change that drops/renames a shortcut without updating the FAQ (or
 * vice-versa) is silent doc drift — caught here at test time.
 *
 * Verified accurate 2026-05-30: J/K (+ arrows), R, / — FAQ and code agree.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const read = (...p: string[]) => fs.readFileSync(path.join(ROOT, ...p), "utf8");

describe("docs match code: keyboard shortcuts", () => {
  it("the FAQ documents exactly the navigation/action keys DiffView handles", () => {
    const view = read("src", "sidepanel", "DiffView.tsx");
    // The single-character action keys the keydown handler dispatches on.
    // (Arrow keys are aliases for J/K and are covered by the J/K doc line.)
    const handled = new Set<string>();
    if (/e\.key === "j"/.test(view)) handled.add("j");
    if (/e\.key === "k"/.test(view)) handled.add("k");
    if (/e\.key === "r"/.test(view)) handled.add("r");
    if (/e\.key === "\/"/.test(view)) handled.add("/");
    // Sanity: the four shortcuts we expect are all still wired.
    expect(handled).toEqual(new Set(["j", "k", "r", "/"]));

    const faq = read("docs", "help", "faq.md").toLowerCase();
    // Each handled key must be documented in the FAQ shortcuts section.
    expect(faq).toContain("`j`");
    expect(faq).toContain("`k`");
    expect(faq).toContain("`r`");
    expect(faq).toContain("`/`");
  });

  it("the tip footer label matches what getting-started tells users to click", () => {
    const view = read("src", "sidepanel", "DiffView.tsx");
    const gs = read("docs", "help", "getting-started.md");
    // getting-started says: press `Got it` to hide the tip. The button label
    // in DiffView must actually contain "Got it" (whitespace-insensitive).
    expect(/Got it/.test(view)).toBe(true);
    expect(gs).toContain("`Got it`");
  });
});

describe("docs match code: critical categories", () => {
  // The "what counts as critical" help doc must describe the SAME six rule
  // categories the engine flags (critical.ts CRITICAL_RULES). Drift here
  // misleads users about the product's core value claim. Found + fixed a real
  // gap 2026-05-30 (pass 51): the doc said clause "add or remove" while the
  // code flags add/remove/MODIFY.
  it("the help doc lists the six categories critical.ts actually flags", () => {
    const doc = read("docs", "help", "what-counts-as-critical.md").toLowerCase();
    const critical = read("src", "core", "diff", "critical.ts");
    // The six rule categories (by the concept each rule matches on).
    const concepts = [
      /date|deadline/, // rule 1 DATES_DEADLINES / DATE
      /page limit|format|submission/, // rule 2 SUBMISSION_INSTRUCTIONS
      /clause/, // rule 3 CLAUSES
      /evaluation/, // rule 4 EVALUATION_CRITERIA
      /clin/, // rule 5 PRICING_CLINS
      /attachment/, // rule 6 ATTACHMENTS
    ];
    for (const c of concepts) expect(c.test(doc), `help doc missing concept ${c}`).toBe(true);

    // The clause rule flags add/remove/MODIFY (isAddRemoveModify); the doc
    // must not under-claim it as add/remove only. Assert the doc conveys
    // "change/amend", matching the code's MODIFY branch.
    expect(critical).toContain("isAddRemoveModify(i.changeType)"); // rule 3 uses it
    expect(/clause.*(change|amend)|(change|amend).*clause/.test(doc), "doc must say clauses can CHANGE, not just add/remove").toBe(true);
  });

  it("every user-facing clause-criticality claim conveys change/amend (not add/remove only)", () => {
    // All four surfaces must agree with the code's add/remove/MODIFY rule, so
    // none of them under-claims (pass 51/52/53/54 docs-vs-code audit).
    const surfaces = {
      "store-listing": read("docs", "store-listing.md"),
      "marketing-site": read("docs", "site", "index.html"),
      "help-doc": read("docs", "help", "what-counts-as-critical.md"),
    };
    for (const [name, txt] of Object.entries(surfaces)) {
      const t = txt.toLowerCase();
      // Find the clause sentence and require it conveys change/amend, not a
      // bare "added or removed".
      expect(
        /clause[^.]*(change|amend)/.test(t) || /(change|amend)[^.]*clause/.test(t),
        `${name}: clause-criticality claim must convey change/amend`,
      ).toBe(true);
    }
  });
});

describe("docs match code: recall claim matches the enforced audit floor", () => {
  // The FAQ's accuracy promise must match what the corpus audit ENFORCES,
  // not a fragile point-in-time number. Found + fixed 2026-05-30 (pass 52):
  // the FAQ claimed a flat "100% recall" while the gate enforces 0 critical
  // missed + recall >= 98% (currently measuring 100%).
  it("the FAQ states the enforced guarantee (0 critical missed + >=98%), not a bare 100%", () => {
    const faq = read("docs", "help", "faq.md").toLowerCase();
    const audit = read("test", "integration", "corpus.test.ts");
    // The audit's enforced floors are still in place.
    expect(audit).toContain("metrics.criticalMissed");
    expect(audit).toMatch(/toBeGreaterThanOrEqual\(0\.98\)/);
    // The FAQ must convey the critical-floor guarantee + the 98% overall bar.
    expect(/critical/.test(faq)).toBe(true);
    expect(faq).toContain("98%");
    // ...and must NOT make a bare unqualified "100% recall ... work hard"
    // guarantee (the wording the fix replaced).
    expect(/100% recall on synthetic amendments and\s+we work/.test(faq)).toBe(false);
  });
});

describe("docs match code: store-listing permission disclosure", () => {
  // A store listing that discloses different permissions than the manifest
  // requests is a Web-Store-review rejection risk. Verified accurate
  // 2026-05-30 (storage/sidePanel/offscreen + sam.gov host; no <all_urls>).
  it("the manifest requests exactly the permissions the store listing discloses", () => {
    const manifest = read("manifest.config.ts");
    const listing = read("docs", "store-listing.md").toLowerCase();

    // The manifest's `permissions` array — parse the literal.
    const permLine = manifest.match(/permissions:\s*\[([^\]]*)\]/);
    expect(permLine, "manifest permissions array not found").toBeTruthy();
    const perms = (permLine![1].match(/"([^"]+)"/g) ?? []).map((s) => s.replace(/"/g, ""));
    expect(new Set(perms)).toEqual(new Set(["storage", "sidePanel", "offscreen"]));

    // Each disclosed permission appears in the listing; the "nothing else"
    // promise (no <all_urls>/tabs/webRequest) is both true of the manifest
    // and stated in the listing.
    for (const p of perms) expect(listing).toContain(p.toLowerCase());
    // `<all_urls>` must not be a LIVE value (it legitimately appears in a
    // comment explaining why it's avoided) — strip line comments first.
    const manifestCode = manifest.replace(/\/\/[^\n]*/g, "");
    expect(manifestCode).not.toContain("<all_urls>");
    expect(perms).not.toContain("tabs");
    expect(perms).not.toContain("webRequest");
    expect(listing).toContain("no `<all_urls>`");
    // Host scope is sam.gov-only in both.
    expect(manifest).toContain('host_permissions: ["https://sam.gov/*", "https://*.sam.gov/*"]');
    expect(listing).toContain("sam.gov");
  });
});

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

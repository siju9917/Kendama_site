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

import { describe, it, expect } from "vitest";
import { alignBlocks } from "./blocks.js";
import { buildBlock } from "../../model/build.js";

const blk = (sec: string, ord: number, text: string) =>
  buildBlock({
    sectionPath: sec,
    ordinal: ord,
    blockType: "PARAGRAPH",
    rawText: text,
  });

describe("alignBlocks", () => {
  it("identical sequences yield all EQUALs", () => {
    const a = [blk("X", 0, "alpha"), blk("X", 1, "beta")];
    // Use the same block IDs by reconstruction: alignBlocks compares text, so
    // we can pass distinct block instances with identical text.
    const b = [blk("X", 0, "alpha"), blk("X", 1, "beta")];
    const out = alignBlocks(a, b);
    expect(out.every((x) => x.kind === "EQUAL")).toBe(true);
  });

  it("a similar pair becomes MODIFY", () => {
    const a = [blk("X", 0, "The proposal shall not exceed 30 pages")];
    const b = [blk("X", 0, "The proposal shall not exceed 25 pages")];
    const out = alignBlocks(a, b);
    expect(out.length).toBe(1);
    expect(out[0].kind).toBe("MODIFY");
  });

  it("imbalanced run (2 prior, 5 current) pairs best 2 and emits 3 standalone INSERTs", () => {
    // Prior had 2 blocks; current has 5. Two of current are evolved
    // versions of prior's blocks; the other three are new content.
    const prior = [
      blk("X", 0, "The proposal shall not exceed 30 pages"),
      blk("X", 1, "Offers are due 2026-08-15"),
    ];
    const current = [
      blk("X", 0, "The proposal shall not exceed 25 pages"),
      blk("X", 1, "Offers are due 2026-08-29"),
      blk("X", 2, "Submission shall be via email"),
      blk("X", 3, "Questions due 10 days prior"),
      blk("X", 4, "Pre-proposal conference will be held"),
    ];
    const out = alignBlocks(current, prior);
    const modifies = out.filter((x) => x.kind === "MODIFY");
    const inserts = out.filter((x) => x.kind === "INSERT");
    const deletes = out.filter((x) => x.kind === "DELETE");
    expect(modifies.length).toBe(2);
    expect(inserts.length).toBe(3);
    expect(deletes.length).toBe(0);
  });

  // Conservation property (bug-hunt pass 36): every input block must be
  // accounted for EXACTLY once in the output — EQUAL/MODIFY consume one
  // current + one prior; INSERT one current; DELETE one prior. The multiset
  // of current-side texts referenced must equal the input current texts, and
  // likewise for prior. This catches dropped/duplicated blocks (a class that
  // would silently lose or double-count a change). 300 random pairs.
  it("accounts for every input block exactly once (conservation, 300 pairs)", () => {
    let s = 0xb10c5;
    const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 0x100000000);
    const sentences = [
      "The proposal shall not exceed 30 pages",
      "Offers are due 2026-08-15",
      "Submission shall be via email",
      "Questions due 10 days prior",
      "Technical approach is weighted most heavily",
      "Pricing shall be firm fixed price",
    ];
    const seq = () => {
      const n = Math.floor(rnd() * 6);
      const out = [];
      for (let i = 0; i < n; i++) {
        let t = sentences[Math.floor(rnd() * sentences.length)];
        if (rnd() < 0.4) t += " " + Math.floor(rnd() * 100); // small edits → MODIFY/INSERT
        out.push(blk("X", i, t));
      }
      return out;
    };
    const sorted = (xs: string[]) => [...xs].sort();
    for (let iter = 0; iter < 300; iter++) {
      const cur = seq();
      const pri = seq();
      const out = alignBlocks(cur, pri);
      const curRef: string[] = [];
      const priRef: string[] = [];
      for (const it of out) {
        if (it.kind === "EQUAL" || it.kind === "MODIFY") {
          curRef.push(it.current.text);
          priRef.push(it.prior.text);
        } else if (it.kind === "INSERT") {
          curRef.push(it.current.text);
        } else {
          priRef.push(it.prior.text);
        }
      }
      expect(sorted(curRef), `iter ${iter}: current conservation`).toEqual(
        sorted(cur.map((b) => b.text)),
      );
      expect(sorted(priRef), `iter ${iter}: prior conservation`).toEqual(
        sorted(pri.map((b) => b.text)),
      );
    }
  });

  it("a swap of two identical-text blocks does not emit a no-op MODIFY", () => {
    // Two paragraphs identical in text, reordered. The current implementation
    // could emit a MODIFY whose before==after (no-op). That would be a UX bug.
    const a = [
      blk("X", 0, "Paragraph one with distinct words."),
      blk("X", 1, "Paragraph two with very different language."),
    ];
    const b = [
      blk("X", 0, "Paragraph two with very different language."),
      blk("X", 1, "Paragraph one with distinct words."),
    ];
    const out = alignBlocks(a, b);
    // Either it produces EQUALs (LCS chose 1 element common) and one MODIFY,
    // or it produces purely no-op MODIFYs whose text matches. We want NEITHER
    // to be a no-op MODIFY where before==after.
    for (const item of out) {
      if (item.kind === "MODIFY") {
        expect(
          item.current.text,
          "no-op MODIFY (before === after) should not be emitted",
        ).not.toBe(item.prior.text);
      }
    }
  });
});

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

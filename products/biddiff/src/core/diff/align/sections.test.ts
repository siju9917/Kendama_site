import { describe, it, expect } from "vitest";
import { alignSections, scoreSectionPair } from "./sections.js";
import { buildSection } from "../../model/build.js";
import type { Section, SectionType } from "../../model/types.js";

function sec(opts: {
  heading: string;
  ucf?: string | null;
  type?: SectionType;
  ordinal: number;
}): Section {
  return buildSection({
    heading: opts.heading,
    headingLevel: 1,
    ucfLetter: opts.ucf ?? null,
    sectionType: opts.type ?? "OTHER",
    blocks: [],
    ordinal: opts.ordinal,
  });
}

describe("scoreSectionPair", () => {
  it("scores a same-UCF + same-type + same-heading pair near the max", () => {
    const a = sec({ heading: "Statement of Work", ucf: "C", type: "SOW", ordinal: 0 });
    const b = sec({ heading: "Statement of Work", ucf: "C", type: "SOW", ordinal: 0 });
    // 0.4 (ucf) + 0.1 (type) + 0.5 (heading blend, identical) = 1.0.
    expect(scoreSectionPair(a, b)).toBeCloseTo(1, 5);
  });

  it("scores an all-mismatch pair low (different ucf/type/heading)", () => {
    const a = sec({ heading: "Pricing", ucf: "B", type: "PRICING", ordinal: 0 });
    const b = sec({ heading: "Evaluation Factors", ucf: "M", type: "EVALUATION_CRITERIA", ordinal: 0 });
    expect(scoreSectionPair(a, b)).toBeLessThan(0.5);
  });
});

describe("alignSections", () => {
  it("matches sections sharing a UCF letter; passthrough order by current ordinal", () => {
    const cur = [
      sec({ heading: "Statement of Work", ucf: "C", type: "SOW", ordinal: 0 }),
      sec({ heading: "Evaluation Factors", ucf: "M", type: "EVALUATION_CRITERIA", ordinal: 1 }),
    ];
    const pri = [
      sec({ heading: "Evaluation Factors for Award", ucf: "M", type: "EVALUATION_CRITERIA", ordinal: 0 }),
      sec({ heading: "Statement of Work", ucf: "C", type: "SOW", ordinal: 1 }),
    ];
    const pairs = alignSections(cur, pri);
    expect(pairs).toHaveLength(2);
    // Both matched (current + prior non-null), ordered by current ordinal.
    expect(pairs.every((p) => p.current && p.prior)).toBe(true);
    expect(pairs[0].current!.ucfLetter).toBe("C");
    expect(pairs[1].current!.ucfLetter).toBe("M");
  });

  it("emits an INSERT (prior=null) for an unmatched current section", () => {
    const cur = [
      sec({ heading: "Statement of Work", ucf: "C", type: "SOW", ordinal: 0 }),
      sec({ heading: "Brand New Section", ucf: "H", type: "OTHER", ordinal: 1 }),
    ];
    const pri = [sec({ heading: "Statement of Work", ucf: "C", type: "SOW", ordinal: 0 })];
    const pairs = alignSections(cur, pri);
    const inserted = pairs.filter((p) => p.current && p.prior === null);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].current!.ucfLetter).toBe("H");
  });

  it("emits a DELETE (current=null) for an unmatched prior section", () => {
    const cur = [sec({ heading: "Statement of Work", ucf: "C", type: "SOW", ordinal: 0 })];
    const pri = [
      sec({ heading: "Statement of Work", ucf: "C", type: "SOW", ordinal: 0 }),
      sec({ heading: "Removed Section", ucf: "K", type: "REPS_CERTS", ordinal: 1 }),
    ];
    const pairs = alignSections(cur, pri);
    const deleted = pairs.filter((p) => p.current === null && p.prior);
    expect(deleted).toHaveLength(1);
    expect(deleted[0].prior!.ucfLetter).toBe("K");
  });

  it("is greedy one-to-one: two current sections can't both match one prior", () => {
    const cur = [
      sec({ heading: "Statement of Work", ucf: "C", type: "SOW", ordinal: 0 }),
      sec({ heading: "Statement of Work", ucf: "C", type: "SOW", ordinal: 1 }),
    ];
    const pri = [sec({ heading: "Statement of Work", ucf: "C", type: "SOW", ordinal: 0 })];
    const pairs = alignSections(cur, pri);
    const matched = pairs.filter((p) => p.current && p.prior);
    const inserted = pairs.filter((p) => p.current && p.prior === null);
    expect(matched).toHaveLength(1);
    expect(inserted).toHaveLength(1); // the second C section can't reuse the prior
    expect(pairs).toHaveLength(2);
  });

  it("is deterministic across repeated calls", () => {
    const cur = [
      sec({ heading: "A", ucf: "C", type: "SOW", ordinal: 0 }),
      sec({ heading: "B", ucf: "M", type: "EVALUATION_CRITERIA", ordinal: 1 }),
    ];
    const pri = [
      sec({ heading: "A", ucf: "C", type: "SOW", ordinal: 0 }),
      sec({ heading: "B", ucf: "M", type: "EVALUATION_CRITERIA", ordinal: 1 }),
    ];
    expect(alignSections(cur, pri)).toEqual(alignSections(cur, pri));
  });

  it("handles empty inputs", () => {
    expect(alignSections([], [])).toEqual([]);
    expect(alignSections([sec({ heading: "X", ucf: "C", type: "SOW", ordinal: 0 })], [])).toHaveLength(1);
    expect(alignSections([], [sec({ heading: "X", ucf: "C", type: "SOW", ordinal: 0 })])).toHaveLength(1);
  });
});

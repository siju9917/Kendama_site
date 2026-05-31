import { describe, it, expect } from "vitest";
import { diffSequence } from "./myers.js";

const eq = <T>(a: T, b: T): boolean => a === b;

describe("diffSequence", () => {
  it("returns all equals for identical sequences", () => {
    const ops = diffSequence(["a", "b", "c"], ["a", "b", "c"], eq);
    expect(ops.every((o) => o.op === "equal")).toBe(true);
    expect(ops.length).toBe(3);
  });

  it("handles pure insertion", () => {
    const ops = diffSequence(["a"], ["a", "b"], eq);
    expect(ops.map((o) => o.op)).toEqual(["equal", "insert"]);
  });

  it("handles pure deletion", () => {
    const ops = diffSequence(["a", "b"], ["a"], eq);
    expect(ops.map((o) => o.op)).toEqual(["equal", "delete"]);
  });

  it("handles mixed changes", () => {
    const a = ["a", "b", "c", "d"];
    const b = ["a", "x", "c", "y"];
    const ops = diffSequence(a, b, eq);
    // a:equal, b->insert x or delete b ...
    const reconstructedA = ops
      .filter((o) => o.op === "equal" || o.op === "delete")
      .map((o) => o.value);
    const reconstructedB = ops
      .filter((o) => o.op === "equal" || o.op === "insert")
      .map((o) => o.value);
    expect(reconstructedA).toEqual(a);
    expect(reconstructedB).toEqual(b);
  });

  it("is deterministic", () => {
    const a = ["a", "b", "c", "d", "e"];
    const b = ["a", "x", "b", "c", "y", "d", "z"];
    const r1 = diffSequence(a, b, eq);
    const r2 = diffSequence(a, b, eq);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it("works for an empty sequence", () => {
    expect(diffSequence([], [], eq)).toEqual([]);
    expect(diffSequence([], ["a"], eq).map((o) => o.op)).toEqual(["insert"]);
    expect(diffSequence(["a"], [], eq).map((o) => o.op)).toEqual(["delete"]);
  });

  // Property fuzz (bug-hunt pass 35): the DEFINING correctness invariant of any
  // diff — the ops must exactly reconstruct both inputs — across 500 random
  // pairs over a tiny alphabet (so equal runs and edits are common).
  it("reconstructs both inputs from the ops, and equals form a common subsequence (500 pairs)", () => {
    let s = 0xa11ce;
    const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 0x100000000);
    const seq = () => {
      const n = Math.floor(rnd() * 8); // 0..7
      const out: string[] = [];
      for (let i = 0; i < n; i++) out.push("abcd"[Math.floor(rnd() * 4)]);
      return out;
    };
    for (let iter = 0; iter < 500; iter++) {
      const a = seq();
      const b = seq();
      const ops = diffSequence(a, b, eq);

      // equal+delete (in order) reconstruct A; equal+insert reconstruct B.
      const fromA = ops.filter((o) => o.op === "equal" || o.op === "delete").map((o) => o.value);
      const fromB = ops.filter((o) => o.op === "equal" || o.op === "insert").map((o) => o.value);
      expect(fromA, `iter ${iter}: A reconstruct`).toEqual(a);
      expect(fromB, `iter ${iter}: B reconstruct`).toEqual(b);

      // equal ops' indices are strictly increasing on BOTH sides (a real
      // alignment, not reordered), and reference matching elements.
      const eqs = ops.filter((o) => o.op === "equal") as Array<{ value: string; aIndex: number; bIndex: number }>;
      for (let k = 1; k < eqs.length; k++) {
        expect(eqs[k].aIndex).toBeGreaterThan(eqs[k - 1].aIndex);
        expect(eqs[k].bIndex).toBeGreaterThan(eqs[k - 1].bIndex);
      }
      for (const e of eqs) {
        expect(a[e.aIndex]).toBe(e.value);
        expect(b[e.bIndex]).toBe(e.value);
      }
    }
  });
});

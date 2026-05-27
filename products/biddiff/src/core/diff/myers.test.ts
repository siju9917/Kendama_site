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
});

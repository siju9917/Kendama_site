import { describe, it, expect } from "vitest";
import { tokenDiff } from "./tokens.js";

describe("tokenDiff", () => {
  it("emits an equal-only span when sequences are identical", () => {
    const out = tokenDiff(["a", "b", "c"], ["a", "b", "c"]);
    expect(out.length).toBe(1);
    expect(out[0]).toEqual({ op: "equal", text: "a b c" });
  });

  it("doesn't insert a space before standalone punctuation tokens", () => {
    const before = ["The", "deadline", "is", "August", "."];
    const after = ["The", "deadline", "is", "September", "."];
    const out = tokenDiff(before, after);
    const joined = out.map((s) => s.text).join("|");
    // Standalone punctuation should join directly to the previous token.
    expect(joined).not.toContain(" .");
  });

  it("merges adjacent ops of the same kind", () => {
    const out = tokenDiff(["x"], ["a", "b", "x"]);
    const inserts = out.filter((s) => s.op === "insert");
    expect(inserts.length).toBe(1);
    expect(inserts[0].text).toBe("a b");
  });

  it("handles empty sequences", () => {
    expect(tokenDiff([], [])).toEqual([]);
    expect(tokenDiff([], ["a"])).toEqual([{ op: "insert", text: "a" }]);
    expect(tokenDiff(["a"], [])).toEqual([{ op: "delete", text: "a" }]);
  });
});

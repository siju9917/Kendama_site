/**
 * Unit tests for criticalFirst (POLISH N9 / Product-Sense P3): the default
 * change list must surface CRITICAL changes at the top — making the store
 * listing's "critical changes flagged at the top" literally true — while
 * preserving document order WITHIN each severity group and matching the
 * export order (core/export lists critical then normal).
 */
import { describe, it, expect } from "vitest";
import { criticalFirst } from "./DiffView.js";
import type { Change, Severity } from "../core/diff/types.js";

let n = 0;
function change(severity: Severity): Change {
  const id = `c${n++}`;
  return {
    id,
    changeType: "MODIFY",
    category: "OTHER",
    severity,
    sectionHeading: id,
    ucfLetter: null,
    beforeText: "a",
    afterText: "b",
    tokenSpans: null,
    anchorsInvolved: [],
    criticalReasons: severity === "CRITICAL" ? ["reason"] : [],
    clauseInfo: null,
    locationHint: id,
  };
}

describe("criticalFirst", () => {
  it("moves all CRITICAL changes ahead of NORMAL ones", () => {
    const input = [change("NORMAL"), change("CRITICAL"), change("NORMAL"), change("CRITICAL")];
    const out = criticalFirst(input);
    const severities = out.map((c) => c.severity);
    expect(severities).toEqual(["CRITICAL", "CRITICAL", "NORMAL", "NORMAL"]);
  });

  it("preserves document order WITHIN each severity group (stable)", () => {
    const n0 = change("NORMAL");
    const c0 = change("CRITICAL");
    const n1 = change("NORMAL");
    const c1 = change("CRITICAL");
    const out = criticalFirst([n0, c0, n1, c1]);
    expect(out.map((c) => c.id)).toEqual([c0.id, c1.id, n0.id, n1.id]);
  });

  it("is a no-op (order-preserving) when everything is one severity", () => {
    const all = [change("NORMAL"), change("NORMAL"), change("NORMAL")];
    expect(criticalFirst(all).map((c) => c.id)).toEqual(all.map((c) => c.id));
    const crit = [change("CRITICAL"), change("CRITICAL")];
    expect(criticalFirst(crit).map((c) => c.id)).toEqual(crit.map((c) => c.id));
  });

  it("handles the empty list", () => {
    expect(criticalFirst([])).toEqual([]);
  });

  it("does not mutate its input", () => {
    const input = [change("NORMAL"), change("CRITICAL")];
    const snapshot = input.map((c) => c.id);
    criticalFirst(input);
    expect(input.map((c) => c.id)).toEqual(snapshot);
  });
});

import { describe, it, expect } from "vitest";
import { isBidDiffMessage, type BidDiffMessage } from "./messages.js";

// isBidDiffMessage is the TRUST BOUNDARY for cross-context runtime messages
// (content script / background / side panel / offscreen). Every listener
// routes incoming payloads through it, so it must reject anything that isn't
// a well-formed biddiff message and must not be loosened by accident.

describe("isBidDiffMessage", () => {
  it("accepts every kind in the BidDiffMessage union", () => {
    const valid: BidDiffMessage[] = [
      { kind: "biddiff/open-side-panel" },
      { kind: "biddiff/get-last-attachments" },
      { kind: "biddiff/get-sam-attachments" },
      {
        kind: "biddiff/diff",
        jobId: "j",
        currentBytes: new ArrayBuffer(1),
        currentName: "a",
        priorBytes: new ArrayBuffer(1),
        priorName: "b",
      },
      { kind: "biddiff/progress", jobId: "j", note: "x", percent: 1 },
      // result/error carry richer payloads, but the guard only checks shape.
      { kind: "biddiff/error", jobId: "j", code: "E", message: "m" },
    ];
    for (const m of valid) expect(isBidDiffMessage(m)).toBe(true);
  });

  it("rejects non-objects and nullish values", () => {
    for (const bad of [null, undefined, 42, "biddiff/diff", true, Symbol("x")]) {
      expect(isBidDiffMessage(bad)).toBe(false);
    }
  });

  it("rejects objects with no kind or a non-string kind", () => {
    expect(isBidDiffMessage({})).toBe(false);
    expect(isBidDiffMessage({ type: "biddiff/diff" })).toBe(false); // wrong field
    expect(isBidDiffMessage({ kind: 123 })).toBe(false);
    expect(isBidDiffMessage({ kind: null })).toBe(false);
  });

  it("rejects a kind that does not carry the biddiff/ namespace", () => {
    expect(isBidDiffMessage({ kind: "diff" })).toBe(false);
    expect(isBidDiffMessage({ kind: "evil/biddiff/diff" })).toBe(false); // prefix only
    expect(isBidDiffMessage({ kind: "BIDDIFF/diff" })).toBe(false); // case-sensitive
    expect(isBidDiffMessage({ kind: " biddiff/diff" })).toBe(false); // leading space
  });

  it("accepts an unknown future biddiff/* kind (namespace, not enum)", () => {
    // The guard is a namespace gate, not an exhaustive kind check — a newer
    // sender's kind still passes the boundary and is dispatched downstream.
    expect(isBidDiffMessage({ kind: "biddiff/future-thing" })).toBe(true);
  });
});

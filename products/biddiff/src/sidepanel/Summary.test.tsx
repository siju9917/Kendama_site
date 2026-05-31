// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Summary } from "./Summary.js";
import { emptyCategoryCounts } from "../core/diff/types.js";
import type { DiffResult } from "../core/diff/types.js";

function result(criticalCount: number): DiffResult {
  return {
    id: "d1",
    generatedAt: "2026-05-30T10:00:00.000Z",
    currentDoc: {
      sourceFileName: "current.pdf",
      sourceFileHash: "c",
      solicitationId: "TEST-123",
      amendmentNumber: null,
      extractedAt: "2026-05-30T00:00:00.000Z",
      overallExtractionConfidence: 1,
      extractionWarnings: [],
      pageCount: 1,
    },
    priorDoc: {
      sourceFileName: "prior.pdf",
      sourceFileHash: "p",
      solicitationId: null,
      amendmentNumber: null,
      extractedAt: "2026-05-30T00:00:00.000Z",
      overallExtractionConfidence: 1,
      extractionWarnings: [],
      pageCount: 1,
    },
    changes: [],
    criticalCount,
    changeCountByCategory: emptyCategoryCounts(),
    diffConfidence: 1,
    warnings: [],
  };
}

describe("Summary — Critical stat affordance (Product-Sense K1 P2)", () => {
  it("explains what 'critical' means via an inline info affordance", () => {
    render(<Summary result={result(2)} />);
    // The Critical stat carries a descriptive, reporting (non-advisory)
    // explanation so a first-time user understands the term inline.
    const explained = screen.getByTitle(/what biddiff flags as critical/i);
    expect(explained).toBeTruthy();
    // The same affordance pattern as the Confidence stat: an "i" info pill.
    expect(explained.querySelector(".info-pill")).toBeTruthy();
    // It names the actual rule categories, not a vague gesture.
    const title = explained.getAttribute("title") ?? "";
    expect(title).toMatch(/deadlines|dates/i);
    expect(title).toMatch(/clause/i);
    expect(title).toMatch(/attachment/i);
  });

  it("renders the critical count accurately", () => {
    render(<Summary result={result(0)} />);
    expect(screen.getByText("Critical").closest(".summary__stat")).toBeTruthy();
  });

  // POLISH N8: the explanation must reach screen-reader AND keyboard users,
  // not only mouse-hover. The stat is focusable and points at a
  // visually-hidden description via aria-describedby.
  it("exposes the Critical explanation to assistive tech (aria-describedby + focusable)", () => {
    render(<Summary result={result(2)} />);
    const stat = screen.getByTitle(/what biddiff flags as critical/i);
    expect(stat.getAttribute("tabindex")).toBe("0"); // keyboard-reachable
    const id = stat.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    const desc = document.getElementById(id!);
    expect(desc).toBeTruthy();
    expect(desc!.className).toContain("sr-only");
    expect(desc!.textContent ?? "").toMatch(/deadlines|dates/i);
    expect(desc!.textContent ?? "").toMatch(/clause/i);
  });

  it("exposes the Confidence explanation to assistive tech (aria-describedby + focusable)", () => {
    render(<Summary result={result(2)} />);
    const stat = screen.getByTitle(/how clean the underlying text extraction/i);
    expect(stat.getAttribute("tabindex")).toBe("0");
    const id = stat.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    const desc = document.getElementById(id!);
    expect(desc).toBeTruthy();
    expect(desc!.className).toContain("sr-only");
    expect(desc!.textContent ?? "").toMatch(/extraction/i);
  });
});

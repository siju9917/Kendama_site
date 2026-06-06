// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChangeCard, formatChangeForClipboard } from "./ChangeCard.js";
import type { Change } from "../core/diff/types.js";

const baseChange: Change = {
  id: "c1",
  changeType: "MODIFY",
  category: "DATES_DEADLINES",
  severity: "CRITICAL",
  sectionHeading: "Section L — Instructions to Offerors",
  ucfLetter: "L",
  beforeText: "Offers are due 2026-08-15.",
  afterText: "Offers are due 2026-08-29.",
  tokenSpans: [
    { op: "equal", text: "Offers are due" },
    { op: "delete", text: "2026-08-15" },
    { op: "insert", text: "2026-08-29" },
    { op: "equal", text: "." },
  ],
  anchorsInvolved: [],
  criticalReasons: ["A date or deadline changed."],
  clauseInfo: null,
  locationHint: "Section L — block 1",
};

describe("ChangeCard", () => {
  it("renders the heading, location, badges, and reasons", () => {
    render(
      <ChangeCard
        change={baseChange}
        reviewed={false}
        onToggleReviewed={() => {}}
      />,
    );
    expect(screen.getByText(/Section L — Instructions/i)).toBeTruthy();
    expect(screen.getByText(/Critical/i)).toBeTruthy();
    expect(screen.getByText(/A date or deadline changed/i)).toBeTruthy();
    expect(screen.getByText(/MODIFY/)).toBeTruthy();
  });

  it("collapses on Collapse, expands on Expand", () => {
    render(
      <ChangeCard
        change={baseChange}
        reviewed={false}
        onToggleReviewed={() => {}}
      />,
    );
    // Expanded by default; token-diff text visible.
    const collapseBtn = screen.getByRole("button", { name: /Collapse/i });
    fireEvent.click(collapseBtn);
    // Now collapsed — Expand button should show.
    expect(screen.getByRole("button", { name: /Expand/i })).toBeTruthy();
  });

  it("invokes onToggleReviewed when Mark as reviewed clicked", () => {
    const onToggle = vi.fn();
    render(
      <ChangeCard change={baseChange} reviewed={false} onToggleReviewed={onToggle} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Mark as reviewed/i }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("renders the reviewed state when reviewed=true", () => {
    render(
      <ChangeCard change={baseChange} reviewed={true} onToggleReviewed={() => {}} />,
    );
    // The aria-label is "Unmark as reviewed" when reviewed=true; the visible
    // text "✓ Reviewed" is still present but the accessible name comes from aria-label.
    const btn = screen.getByRole("button", { name: /Unmark as reviewed/i });
    expect(btn).toBeTruthy();
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  // N11: per-change copy.
  it("Copy writes the formatted change to the clipboard and confirms", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // jsdom has no clipboard by default; define one.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(
      <ChangeCard change={baseChange} reviewed={false} onToggleReviewed={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Copy$/i }));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(String(writeText.mock.calls[0][0])).toContain("Section L — Instructions");
    // Confirmation flips to "✓ Copied".
    expect(await screen.findByRole("button", { name: /✓ Copied/i })).toBeTruthy();
  });
});

describe("formatChangeForClipboard", () => {
  it("includes the critical tag, reasons, before/after, and the disclaimer", () => {
    const text = formatChangeForClipboard(baseChange);
    expect(text).toContain("[CRITICAL] MODIFY");
    expect(text).toContain("Section L — Instructions to Offerors");
    expect(text).toContain("A date or deadline changed.");
    expect(text).toContain("Prior: Offers are due 2026-08-15.");
    expect(text).toContain("New: Offers are due 2026-08-29.");
    // Reports, never advises — carries the canonical disclaimer.
    expect(text).toContain("does not provide legal");
  });

  it("omits the critical tag for a normal change and omits absent fields", () => {
    const normal: Change = {
      ...baseChange,
      severity: "NORMAL",
      criticalReasons: [],
      beforeText: null, // an INSERT-like shape
      clauseInfo: null,
    };
    const text = formatChangeForClipboard(normal);
    expect(text).not.toContain("[CRITICAL]");
    expect(text).not.toContain("Prior:");
    expect(text).toContain("New: Offers are due 2026-08-29.");
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChangeCard } from "./ChangeCard.js";
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
    expect(screen.getByRole("button", { name: /✓ Reviewed/i })).toBeTruthy();
  });
});

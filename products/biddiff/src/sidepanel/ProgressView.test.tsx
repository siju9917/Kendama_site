// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressView } from "./ProgressView.js";

describe("ProgressView", () => {
  it("shows the provided note and reflects percent on the ARIA progressbar", () => {
    render(<ProgressView note="Extracting text…" percent={42} />);
    expect(screen.getByText("Extracting text…")).toBeTruthy();
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("42");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("falls back to 'Working…' when the note is empty", () => {
    render(<ProgressView note="" percent={10} />);
    expect(screen.getByText("Working…")).toBeTruthy();
  });

  it("is announced politely to assistive tech (role=status, aria-live)", () => {
    render(<ProgressView note="Diffing…" percent={50} />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
  });

  it("clamps the visual fill to a 4–100% sliver (0 still visible, >100 can't overflow)", () => {
    const { container, rerender } = render(<ProgressView note="x" percent={0} />);
    const fill = () => container.querySelector(".progressbar__fill") as HTMLElement;
    expect(fill().style.width).toBe("4%"); // floor: a sliver shows even at 0
    rerender(<ProgressView note="x" percent={250} />);
    expect(fill().style.width).toBe("100%"); // ceiling: never overflows
    rerender(<ProgressView note="x" percent={37} />);
    expect(fill().style.width).toBe("37%");
  });
});

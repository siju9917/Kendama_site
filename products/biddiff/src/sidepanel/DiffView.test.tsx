// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiffView, criticalFirst } from "./DiffView.js";
import { __resetMemoryKvForTests } from "../core/storage/index.js";
import type { Change, DiffResult } from "../core/diff/types.js";

// Mock heavy child components to keep tests focused on DiffView logic.
vi.mock("./ChangeCard.js", () => ({
  ChangeCard: ({
    change,
  }: {
    change: { id: string; afterText: string | null; beforeText: string | null; sectionHeading: string; severity: string };
  }) => (
    <div data-testid="change-card" data-severity={change.severity} data-change-id={change.id}>
      {change.afterText ?? change.beforeText ?? change.sectionHeading}
    </div>
  ),
}));
vi.mock("./Summary.js", () => ({ Summary: () => <div data-testid="summary" /> }));
vi.mock("./ReviewPrompt.js", () => ({ ReviewPrompt: () => null }));

// jsdom stubs.
HTMLElement.prototype.scrollIntoView = vi.fn();
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeChange(
  id: string,
  severity: "CRITICAL" | "NORMAL" = "NORMAL",
  section = "A",
): Change {
  return {
    id,
    changeType: "MODIFY",
    category: "OTHER",
    severity,
    sectionHeading: `Section ${section}`,
    ucfLetter: section,
    beforeText: `before-${id}`,
    afterText: `after-${id}`,
    tokenSpans: null,
    anchorsInvolved: [],
    criticalReasons: severity === "CRITICAL" ? ["critical reason"] : [],
    clauseInfo: null,
    locationHint: "",
  };
}

function fakeResult(changes: Change[] = [], warnings: string[] = []): DiffResult {
  const criticalCount = changes.filter((c) => c.severity === "CRITICAL").length;
  return {
    id: "test-result",
    generatedAt: "2026-06-06T00:00:00.000Z",
    currentDoc: {
      sourceFileName: "current.pdf",
      sourceFileHash: "hash-curr",
      solicitationId: null,
      amendmentNumber: null,
      extractedAt: "2026-06-06T00:00:00.000Z",
      overallExtractionConfidence: 1,
      extractionWarnings: [],
      pageCount: 1,
    },
    priorDoc: {
      sourceFileName: "prior.pdf",
      sourceFileHash: "hash-prior",
      solicitationId: null,
      amendmentNumber: null,
      extractedAt: "2026-06-06T00:00:00.000Z",
      overallExtractionConfidence: 1,
      extractionWarnings: [],
      pageCount: 1,
    },
    changes,
    criticalCount,
    changeCountByCategory: {
      SCOPE_SOW: 0,
      EVALUATION_CRITERIA: 0,
      DATES_DEADLINES: 0,
      CLAUSES: 0,
      SUBMISSION_INSTRUCTIONS: 0,
      PRICING_CLINS: 0,
      ATTACHMENTS: 0,
      OTHER: changes.length,
    },
    diffConfidence: 1,
    warnings,
  };
}

beforeEach(() => {
  __resetMemoryKvForTests();
});

// ---------------------------------------------------------------------------
// criticalFirst — pure function
// ---------------------------------------------------------------------------

describe("criticalFirst", () => {
  it("returns empty array for empty input", () => {
    expect(criticalFirst([])).toEqual([]);
  });

  it("places CRITICAL changes before NORMAL ones", () => {
    const n1 = fakeChange("n1", "NORMAL");
    const c1 = fakeChange("c1", "CRITICAL");
    const n2 = fakeChange("n2", "NORMAL");
    const c2 = fakeChange("c2", "CRITICAL");
    expect(criticalFirst([n1, c1, n2, c2]).map((c) => c.id)).toEqual(["c1", "c2", "n1", "n2"]);
  });

  it("preserves document order within each severity group", () => {
    const c1 = fakeChange("c1", "CRITICAL");
    const n1 = fakeChange("n1", "NORMAL");
    const c2 = fakeChange("c2", "CRITICAL");
    const n2 = fakeChange("n2", "NORMAL");
    expect(criticalFirst([c1, n1, c2, n2]).map((c) => c.id)).toEqual(["c1", "c2", "n1", "n2"]);
  });

  it("all-CRITICAL input is unchanged", () => {
    const cs = [fakeChange("a", "CRITICAL"), fakeChange("b", "CRITICAL")];
    expect(criticalFirst(cs).map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("all-NORMAL input is unchanged", () => {
    const ns = [fakeChange("a", "NORMAL"), fakeChange("b", "NORMAL")];
    expect(criticalFirst(ns).map((c) => c.id)).toEqual(["a", "b"]);
  });
});

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------

describe("DiffView — filter chips", () => {
  it("All chip shows total change count", () => {
    render(<DiffView result={fakeResult([fakeChange("c1"), fakeChange("c2")])} />);
    expect(screen.getByRole("button", { name: /All \(2\)/i })).toBeTruthy();
  });

  it("Critical chip shows criticalCount", () => {
    render(<DiffView result={fakeResult([fakeChange("c1", "CRITICAL"), fakeChange("n1")])} />);
    expect(screen.getByRole("button", { name: /Critical \(1\)/i })).toBeTruthy();
  });

  it("Critical chip is disabled when criticalCount === 0", () => {
    render(<DiffView result={fakeResult([fakeChange("n1")])} />);
    const btn = screen.getByRole("button", { name: /Critical \(0\)/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("Critical chip is enabled when criticalCount > 0", () => {
    render(<DiffView result={fakeResult([fakeChange("c1", "CRITICAL")])} />);
    const btn = screen.getByRole("button", { name: /Critical \(1\)/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CRITICAL filter
// ---------------------------------------------------------------------------

describe("DiffView — CRITICAL filter", () => {
  it("clicking Critical shows only CRITICAL change cards", () => {
    const changes = [fakeChange("c1", "CRITICAL"), fakeChange("n1", "NORMAL")];
    render(<DiffView result={fakeResult(changes)} />);
    fireEvent.click(screen.getByRole("button", { name: /Critical \(1\)/i }));
    const cards = screen.getAllByTestId("change-card");
    expect(cards).toHaveLength(1);
    expect(cards[0].dataset.severity).toBe("CRITICAL");
  });

  it("switching back to All restores all change cards", () => {
    const changes = [fakeChange("c1", "CRITICAL"), fakeChange("n1", "NORMAL")];
    render(<DiffView result={fakeResult(changes)} />);
    fireEvent.click(screen.getByRole("button", { name: /Critical \(1\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /All \(2\)/i }));
    expect(screen.getAllByTestId("change-card")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

describe("DiffView — empty states", () => {
  it("shows 'identical' message when result has no changes and no warnings", () => {
    render(<DiffView result={fakeResult([])} />);
    expect(screen.getByText(/No changes detected.*identical/i)).toBeTruthy();
  });

  it("shows extraction-uncertainty message when result has no changes but has warnings", () => {
    render(<DiffView result={fakeResult([], ["extraction warning"])} />);
    expect(screen.getByText(/extraction may not have read/i)).toBeTruthy();
  });

  it("shows CRITICAL empty message when filter=CRITICAL and text filter eliminates all criticals", () => {
    render(<DiffView result={fakeResult([fakeChange("c1", "CRITICAL")])} />);
    fireEvent.click(screen.getByRole("button", { name: /Critical \(1\)/i }));
    fireEvent.change(screen.getByPlaceholderText(/Filter by text/i), {
      target: { value: "zzznomatch" },
    });
    expect(screen.getByText(/No critical changes match the current filters/i)).toBeTruthy();
  });

  it("shows 'No changes match' when text filter produces empty results", () => {
    render(<DiffView result={fakeResult([fakeChange("n1")])} />);
    fireEvent.change(screen.getByPlaceholderText(/Filter by text/i), {
      target: { value: "zzznomatch" },
    });
    expect(screen.getByText(/No changes match the current filter\./i)).toBeTruthy();
  });

  it("shows 'Clear filters' button in empty state when a filter is active", () => {
    render(<DiffView result={fakeResult([fakeChange("n1")])} />);
    fireEvent.change(screen.getByPlaceholderText(/Filter by text/i), {
      target: { value: "zzznomatch" },
    });
    // Both the filter bar and the empty state render a clear-filters affordance.
    expect(screen.getAllByText(/Clear filters/i).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Text filter
// ---------------------------------------------------------------------------

describe("DiffView — text filter", () => {
  it("filters cards by afterText content", () => {
    const changes = [fakeChange("c1"), fakeChange("c2")];
    render(<DiffView result={fakeResult(changes)} />);
    fireEvent.change(screen.getByPlaceholderText(/Filter by text/i), {
      target: { value: "after-c1" },
    });
    expect(screen.getAllByTestId("change-card")).toHaveLength(1);
  });

  it("Clear filters button in filter bar resets the text filter", () => {
    render(<DiffView result={fakeResult([fakeChange("c1"), fakeChange("c2")])} />);
    fireEvent.change(screen.getByPlaceholderText(/Filter by text/i), {
      target: { value: "after-c1" },
    });
    fireEvent.click(screen.getByTitle("Clear all filters"));
    expect(screen.getAllByTestId("change-card")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Warning banners
// ---------------------------------------------------------------------------

describe("DiffView — warning banners", () => {
  it("shows extraction warnings banner when result.warnings is non-empty", () => {
    render(<DiffView result={fakeResult([], ["Missing section C"])} />);
    expect(screen.getByText("Extraction notes")).toBeTruthy();
    expect(screen.getByText("Missing section C")).toBeTruthy();
  });

  it("shows session notices banner when sessionNotices is non-empty", () => {
    render(<DiffView result={fakeResult()} sessionNotices={["Save failed"]} />);
    expect(screen.getByText("This session")).toBeTruthy();
    expect(screen.getByText("Save failed")).toBeTruthy();
  });

  it("shows no banner when both are absent", () => {
    render(<DiffView result={fakeResult()} />);
    expect(screen.queryByText("Extraction notes")).toBeNull();
    expect(screen.queryByText("This session")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Keyboard shortcut context note (N-A10)
// ---------------------------------------------------------------------------

describe("DiffView — keyboard shortcut context note", () => {
  it("does not show the Critical-filter note when filter is ALL", () => {
    render(<DiffView result={fakeResult([fakeChange("c1", "CRITICAL")])} />);
    expect(screen.queryByText(/J \/ K navigate Critical changes only/i)).toBeNull();
  });

  it("shows the Critical-filter context note when filter is CRITICAL", () => {
    render(<DiffView result={fakeResult([fakeChange("c1", "CRITICAL")])} />);
    fireEvent.click(screen.getByRole("button", { name: /Critical \(1\)/i }));
    expect(screen.getByText(/J \/ K navigate Critical changes only/i)).toBeTruthy();
  });

  it("context note disappears after switching back to All", () => {
    render(<DiffView result={fakeResult([fakeChange("c1", "CRITICAL")])} />);
    fireEvent.click(screen.getByRole("button", { name: /Critical \(1\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /All \(1\)/i }));
    expect(screen.queryByText(/J \/ K navigate Critical changes only/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// criticalFirst ordering in rendered output
// ---------------------------------------------------------------------------

describe("DiffView — criticalFirst rendering order", () => {
  it("renders CRITICAL cards before NORMAL ones", () => {
    const changes = [
      fakeChange("n1", "NORMAL"),
      fakeChange("c1", "CRITICAL"),
      fakeChange("n2", "NORMAL"),
    ];
    render(<DiffView result={fakeResult(changes)} />);
    const cards = screen.getAllByTestId("change-card");
    expect(cards[0].dataset.severity).toBe("CRITICAL");
    expect(cards[1].dataset.severity).toBe("NORMAL");
    expect(cards[2].dataset.severity).toBe("NORMAL");
  });

  it("preserves CRITICAL document order (c1 before c2)", () => {
    const changes = [
      fakeChange("n1", "NORMAL"),
      fakeChange("c1", "CRITICAL"),
      fakeChange("n2", "NORMAL"),
      fakeChange("c2", "CRITICAL"),
    ];
    render(<DiffView result={fakeResult(changes)} />);
    const cards = screen.getAllByTestId("change-card");
    expect(cards[0].dataset.changeId).toBe("c1");
    expect(cards[1].dataset.changeId).toBe("c2");
  });
});

// ---------------------------------------------------------------------------
// Section filter
// ---------------------------------------------------------------------------

describe("DiffView — section filter", () => {
  it("section filter not rendered when all changes share one section", () => {
    render(
      <DiffView
        result={fakeResult([fakeChange("c1", "NORMAL", "A"), fakeChange("c2", "NORMAL", "A")])}
      />,
    );
    expect(screen.queryByRole("group", { name: /Section filter/i })).toBeNull();
  });

  it("section filter rendered when changes span multiple sections", () => {
    render(
      <DiffView
        result={fakeResult([fakeChange("c1", "NORMAL", "A"), fakeChange("c2", "NORMAL", "B")])}
      />,
    );
    expect(screen.getByRole("group", { name: /Section filter/i })).toBeTruthy();
  });

  it("clicking a section button filters to that section only", () => {
    const changes = [fakeChange("c1", "NORMAL", "A"), fakeChange("c2", "NORMAL", "B")];
    render(<DiffView result={fakeResult(changes)} />);
    fireEvent.click(screen.getByRole("button", { name: /Section B/i }));
    const cards = screen.getAllByTestId("change-card");
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain("after-c2");
  });

  it("clicking All sections after a section filter restores all cards", () => {
    const changes = [fakeChange("c1", "NORMAL", "A"), fakeChange("c2", "NORMAL", "B")];
    render(<DiffView result={fakeResult(changes)} />);
    fireEvent.click(screen.getByRole("button", { name: /Section B/i }));
    fireEvent.click(screen.getByRole("button", { name: /All sections/i }));
    expect(screen.getAllByTestId("change-card")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

describe("DiffView — keyboard navigation", () => {
  it("J key enables keyboard nav and moves focus to the next card", () => {
    const changes = [fakeChange("c1"), fakeChange("c2"), fakeChange("c3")];
    render(<DiffView result={fakeResult(changes)} />);
    // First J: wasUsed=false, firstVisibleChangeIndex returns -1 (jsdom getBoundingClientRect=0),
    // falls through to increment: focusedIndex 0 → 1.
    fireEvent.keyDown(window, { key: "j" });
    expect(document.querySelectorAll(".change-row--focused")).toHaveLength(1);
  });

  it("K key enables keyboard nav and clamps focus at 0", () => {
    render(<DiffView result={fakeResult([fakeChange("c1"), fakeChange("c2")])} />);
    fireEvent.keyDown(window, { key: "k" });
    // focusedIndex = Math.max(0, 0-1) = 0; keyboardNavUsed=true → first card is focused.
    expect(document.querySelectorAll(".change-row--focused")).toHaveLength(1);
  });

  it("ArrowDown behaves like J", () => {
    render(<DiffView result={fakeResult([fakeChange("c1"), fakeChange("c2")])} />);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(document.querySelectorAll(".change-row--focused")).toHaveLength(1);
  });

  it("ArrowUp behaves like K", () => {
    render(<DiffView result={fakeResult([fakeChange("c1"), fakeChange("c2")])} />);
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(document.querySelectorAll(".change-row--focused")).toHaveLength(1);
  });

  it("keyboard nav does not trigger when the target is an INPUT element", () => {
    render(<DiffView result={fakeResult([fakeChange("c1"), fakeChange("c2")])} />);
    const input = screen.getByPlaceholderText(/Filter by text/i);
    fireEvent.keyDown(input, { key: "j" });
    // The event fires on the input. The handler returns early on tagName=INPUT.
    expect(document.querySelectorAll(".change-row--focused")).toHaveLength(0);
  });

  it("modifier keys do not trigger nav (Cmd+J must be free for browser shortcuts)", () => {
    render(<DiffView result={fakeResult([fakeChange("c1"), fakeChange("c2")])} />);
    fireEvent.keyDown(window, { key: "j", metaKey: true });
    expect(document.querySelectorAll(".change-row--focused")).toHaveLength(0);
  });

  it("R key marks the focused change reviewed and shows the reviewed counter", () => {
    render(<DiffView result={fakeResult([fakeChange("c1"), fakeChange("c2")])} />);
    // R at focusedIndex=0 toggles c1 as reviewed.
    fireEvent.keyDown(window, { key: "r" });
    expect(screen.getByText("1/2 reviewed")).toBeTruthy();
  });

  it("R key on an empty filtered list does not throw", () => {
    expect(() => {
      render(<DiffView result={fakeResult([])} />);
      fireEvent.keyDown(window, { key: "r" });
    }).not.toThrow();
  });

  it("J/K on an empty filtered list do not add a focused class", () => {
    render(<DiffView result={fakeResult([])} />);
    fireEvent.keyDown(window, { key: "j" });
    expect(document.querySelectorAll(".change-row--focused")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Reviewed counter
// ---------------------------------------------------------------------------

describe("DiffView — reviewed counter", () => {
  it("reviewed counter not shown when no changes are reviewed", () => {
    render(<DiffView result={fakeResult([fakeChange("c1")])} />);
    // The keyboard shortcut list also contains "reviewed" — narrow the pattern to the N/M counter.
    expect(screen.queryByText(/\d+\/\d+ reviewed/i)).toBeNull();
  });

  it("reviewed counter shown after a change is toggled reviewed via R key", () => {
    render(<DiffView result={fakeResult([fakeChange("c1"), fakeChange("c2")])} />);
    fireEvent.keyDown(window, { key: "r" });
    expect(screen.getByText("1/2 reviewed")).toBeTruthy();
  });

  it("R key a second time unmarks the change (toggle off)", () => {
    render(<DiffView result={fakeResult([fakeChange("c1")])} />);
    fireEvent.keyDown(window, { key: "r" });
    expect(screen.getByText("1/1 reviewed")).toBeTruthy();
    fireEvent.keyDown(window, { key: "r" });
    expect(screen.queryByText(/\d+\/\d+ reviewed/i)).toBeNull();
  });
});

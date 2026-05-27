// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { History } from "./History.js";
import { DiffStorage, __resetMemoryKvForTests } from "../core/storage/index.js";
import type { DiffResult } from "../core/diff/types.js";

function fakeResult(id: string): DiffResult {
  return {
    id,
    generatedAt: "2026-05-26T10:00:00.000Z",
    currentDoc: {
      sourceFileName: `${id}-current.pdf`,
      sourceFileHash: id,
      solicitationId: id === "withId" ? "TEST-123" : null,
      amendmentNumber: null,
      extractedAt: "2026-05-26T00:00:00.000Z",
      overallExtractionConfidence: 1,
      extractionWarnings: [],
      pageCount: 1,
    },
    priorDoc: {
      sourceFileName: `${id}-prior.pdf`,
      sourceFileHash: id + "-p",
      solicitationId: null,
      amendmentNumber: null,
      extractedAt: "2026-05-26T00:00:00.000Z",
      overallExtractionConfidence: 1,
      extractionWarnings: [],
      pageCount: 1,
    },
    changes: [],
    criticalCount: 0,
    changeCountByCategory: {
      SCOPE_SOW: 0,
      EVALUATION_CRITERIA: 0,
      DATES_DEADLINES: 0,
      CLAUSES: 0,
      SUBMISSION_INSTRUCTIONS: 0,
      PRICING_CLINS: 0,
      ATTACHMENTS: 0,
      OTHER: 0,
    },
    diffConfidence: 1,
    warnings: [],
  };
}

beforeEach(() => {
  __resetMemoryKvForTests();
});

describe("History", () => {
  it("renders nothing when there is no history", async () => {
    const storage = new DiffStorage();
    const { container } = render(<History storage={storage} onOpen={() => {}} />);
    // It returns null when no items, so the wrapper has no children.
    await waitFor(() => {
      expect(container.querySelector("ul")).toBeFalsy();
    });
  });

  it("shows the solicitation ID when present, filename otherwise", async () => {
    const storage = new DiffStorage();
    await storage.saveDiff(fakeResult("withId"));
    await storage.saveDiff(fakeResult("withoutId"));
    render(<History storage={storage} onOpen={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText("TEST-123")).toBeTruthy();
      expect(screen.getByText("withoutId-current.pdf")).toBeTruthy();
    });
  });

  it("opens a diff on click and removes it on delete (with confirm)", async () => {
    const storage = new DiffStorage();
    await storage.saveDiff(fakeResult("d1"));
    const onOpen = vi.fn();
    // Stub the confirm so the test runs deterministically.
    const realConfirm = window.confirm;
    window.confirm = () => true;
    try {
      render(<History storage={storage} onOpen={onOpen} />);
      await waitFor(() => screen.getByText("d1-current.pdf"));

      fireEvent.click(screen.getByText("d1-current.pdf"));
      expect(onOpen).toHaveBeenCalledWith("d1");

      fireEvent.click(screen.getByLabelText(/Delete this diff/i));
      await waitFor(async () => {
        expect(await storage.getDiff("d1")).toBeNull();
      });
    } finally {
      window.confirm = realConfirm;
    }
  });

  it("does not delete when the user cancels the confirm", async () => {
    const storage = new DiffStorage();
    await storage.saveDiff(fakeResult("d2"));
    const realConfirm = window.confirm;
    window.confirm = () => false;
    try {
      render(<History storage={storage} onOpen={() => {}} />);
      await waitFor(() => screen.getByText("d2-current.pdf"));
      fireEvent.click(screen.getByLabelText(/Delete this diff/i));
      // Give the rejection a tick to settle.
      await new Promise((r) => setTimeout(r, 0));
      expect(await storage.getDiff("d2")).not.toBeNull();
    } finally {
      window.confirm = realConfirm;
    }
  });

  it("marks unseen diffs with a visible dot", async () => {
    const storage = new DiffStorage();
    await storage.saveDiff(fakeResult("unseen"));
    render(<History storage={storage} onOpen={() => {}} />);
    await waitFor(() => {
      expect(screen.getByLabelText("New")).toBeTruthy();
    });
  });
});

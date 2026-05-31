// @vitest-environment jsdom
//
// Regression test for the cancellation race in run(): if the user hits
// "Start over" (reset) while storage.saveDiff is in flight, the completing
// diff must NOT flip the UI back to DONE. Mirrors the Reliability bar:
// "an aborted operation does not corrupt state."
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => {
  const save: { resolve: (() => void) | null } = { resolve: null };
  const saveDiff = vi.fn(() => new Promise<void>((res) => (save.resolve = res)));
  return { save, saveDiff };
});

vi.mock("./pipeline.js", () => ({
  prewarmPipeline: vi.fn(),
  // Resolve immediately with a minimal DiffResult so run() proceeds to
  // the saveDiff window, where we hold it open.
  runDiffPipeline: vi.fn(async () => ({ id: "d1", changes: [], criticalCount: 0 })),
}));

vi.mock("../core/storage/index.js", () => ({
  DiffStorage: class {
    saveDiff = mocks.saveDiff;
    getDiff = vi.fn(async () => null);
    markViewed = vi.fn(async () => {});
  },
  makeKv: () => ({
    get: vi.fn(async () => null),
    set: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
  }),
}));

vi.mock("./ReviewPrompt.js", () => ({ noteDiffSucceeded: vi.fn(async () => {}) }));

import { useDiffPipeline } from "./useDiffPipeline.js";
import { runDiffPipeline } from "./pipeline.js";

const file = (n: string): File => new File(["x"], n, { type: "application/pdf" });

describe("useDiffPipeline cancellation race", () => {
  it("reset during the saveDiff window is not clobbered by the completing diff", async () => {
    const { result } = renderHook(() => useDiffPipeline());

    act(() => {
      void result.current.run(file("current.pdf"), file("prior.pdf"));
    });

    // The pipeline resolved and saveDiff is now in flight (held open).
    await waitFor(() => expect(mocks.saveDiff).toHaveBeenCalledTimes(1));
    expect(result.current.state.phase).toBe("RUNNING");

    // User hits "Start over" while the save is pending.
    act(() => result.current.reset());
    expect(result.current.state.phase).toBe("EMPTY");

    // The save now completes. WITHOUT the post-save abort guard this would
    // flip the UI back to DONE; with it, the aborted run bails out.
    await act(async () => {
      mocks.save.resolve?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.state.phase).toBe("EMPTY");
    expect(result.current.state.result).toBeNull();
  });
});

describe("useDiffPipeline error path (extraction/pipeline failure)", () => {
  it("prefers a friendly userMessage when the failure carries one", async () => {
    // A corrupt / password-protected / image-only PDF: the extractor throws
    // an error annotated with a user-facing userMessage. The UI must reach a
    // clean ERROR state showing THAT message, not the raw technical one.
    vi.mocked(runDiffPipeline).mockRejectedValueOnce(
      Object.assign(new Error("InvalidPDFException: bad xref"), {
        userMessage: "This PDF couldn't be read — it may be scanned images or password-protected.",
      }),
    );
    const { result } = renderHook(() => useDiffPipeline());
    await act(async () => {
      await result.current.run(file("current.pdf"), file("prior.pdf"));
    });
    expect(result.current.state.phase).toBe("ERROR");
    expect(result.current.state.result).toBeNull();
    expect(result.current.state.error).toMatch(/scanned images or password-protected/);
  });

  it("falls back to the raw message when no userMessage is present", async () => {
    vi.mocked(runDiffPipeline).mockRejectedValueOnce(new Error("boom-raw-message"));
    const { result } = renderHook(() => useDiffPipeline());
    await act(async () => {
      await result.current.run(file("current.pdf"), file("prior.pdf"));
    });
    expect(result.current.state.phase).toBe("ERROR");
    expect(result.current.state.error).toBe("boom-raw-message");
  });
});

describe("useDiffPipeline save-failure resilience (storage full)", () => {
  it("still shows the computed diff and reports the save failure (never loses the result)", async () => {
    // Quota exhausted: saveDiff rejects. The user's diff was already computed
    // — they must still SEE it, with a clear (non-advisory) notice that local
    // persistence failed. Losing the visible diff over a history-save error
    // would be the real bug.
    mocks.saveDiff.mockImplementationOnce(() =>
      Promise.reject(new DOMException("quota", "QuotaExceededError")),
    );
    const { result } = renderHook(() => useDiffPipeline());

    await act(async () => {
      await result.current.run(file("current.pdf"), file("prior.pdf"));
    });

    expect(result.current.state.phase).toBe("DONE");
    expect(result.current.state.result).not.toBeNull(); // diff is NOT lost
    expect(result.current.state.error).toBeNull(); // a save miss is not a hard error
    expect(result.current.state.sessionNotices.some((n) => /history|storage/i.test(n))).toBe(true);
  });
});

describe("useDiffPipeline openSample (first-run 'See an example')", () => {
  it("loads a real, non-empty example diff, flags it ephemeral, and never persists it", async () => {
    mocks.saveDiff.mockClear();
    const { result } = renderHook(() => useDiffPipeline());

    await act(async () => {
      await result.current.openSample();
    });

    // Reaches a finished diff a brand-new user can read with zero setup.
    expect(result.current.state.phase).toBe("DONE");
    const res = result.current.state.result;
    expect(res).not.toBeNull();
    // It runs through the genuine engine, so it has real classified changes.
    expect(res!.changes.length).toBeGreaterThan(0);

    // It is clearly labelled as a built-in example, not the user's data...
    expect(result.current.state.sessionNotices.some((n) => /example/i.test(n))).toBe(true);
    // ...and it is NEVER written to the user's saved history.
    expect(mocks.saveDiff).not.toHaveBeenCalled();
  });
});

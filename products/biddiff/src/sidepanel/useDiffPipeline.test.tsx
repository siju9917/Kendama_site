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

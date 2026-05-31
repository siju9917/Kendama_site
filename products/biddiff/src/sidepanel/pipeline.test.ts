import { describe, it, expect } from "vitest";
import { runDiffPipeline } from "./pipeline.js";

// In the test (Node) context `chrome` is undefined, so runDiffPipeline takes
// the LOCAL fallback path — exercising the real dispatch logic that is
// otherwise only ever mocked. These tests pin two reliability contracts that
// need no PDF rendering: cancellation and unsupported-input rejection.

function file(name: string, bytes = "hello"): File {
  return new File([bytes], name, { type: "application/octet-stream" });
}

describe("runDiffPipeline (local fallback)", () => {
  it("honors a pre-aborted signal by throwing AbortError before doing work", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      runDiffPipeline(file("a.pdf"), file("b.pdf"), () => {}, ctrl.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects an unsupported file type through the validate dispatch", async () => {
    // .txt is recognized-but-unsupported (see validate.ts); the pipeline must
    // surface a clear rejection, not route it to the wrong extractor.
    await expect(
      runDiffPipeline(file("notes.txt"), file("notes2.txt"), () => {}),
    ).rejects.toBeTruthy();
  });

  it("reports progress before failing on bad input (onProgress is wired)", async () => {
    const notes: string[] = [];
    await runDiffPipeline(
      file("a.pdf", ""), // empty → extraction/validation will reject
      file("b.pdf", ""),
      (note) => notes.push(note),
    ).catch(() => {});
    // The first progress note fires before extraction is attempted.
    expect(notes.some((n) => /reading the new version/i.test(n))).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { idbAvailable } from "./idb.js";

// idb.ts is a thin IndexedDB wrapper whose load-bearing portable guarantee is
// graceful degradation: when there is no `indexedDB` global (Node / the test
// runner, and some locked-down extension contexts), idbAvailable() resolves
// FALSE rather than throwing — that is what lets DiffStorage fall back to
// chrome.storage and keeps the whole storage layer working in tests. The
// actual put/get/delete need a real IndexedDB and are exercised via the
// DiffStorage integration tests; this pins the fallback contract.

describe("idbAvailable", () => {
  it("resolves false (never throws) when indexedDB is absent", async () => {
    expect(typeof indexedDB).toBe("undefined"); // precondition in the Node env
    await expect(idbAvailable()).resolves.toBe(false);
  });

  it("is callable repeatedly and stays false in this environment", async () => {
    expect(await idbAvailable()).toBe(false);
    expect(await idbAvailable()).toBe(false);
  });
});

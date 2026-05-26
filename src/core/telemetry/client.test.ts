import { describe, it, expect } from "vitest";
import { TelemetryClient } from "./client.js";

describe("TelemetryClient", () => {
  it("does not throw when fetch is unavailable", async () => {
    const c = new TelemetryClient("https://example.invalid");
    await expect(c.send({ event: "diff_completed", counts: { changes: 3, critical: 1, pages: 12 } })).resolves.toBeUndefined();
  });

  it("respects the opt-out setting", async () => {
    // Set the settings key to disable telemetry.
    const kv = (await import("../storage/index.js")).makeKv();
    await kv.set("biddiff.settings", { allowAnonymousTelemetry: false });
    let called = false;
    const originalFetch = (globalThis as { fetch?: typeof fetch }).fetch;
    (globalThis as { fetch?: typeof fetch }).fetch = (async () => {
      called = true;
      return new Response("", { status: 200 });
    }) as typeof fetch;
    try {
      const c = new TelemetryClient("https://example.invalid");
      await c.send({ event: "diff_started" });
      expect(called).toBe(false);
    } finally {
      (globalThis as { fetch?: typeof fetch }).fetch = originalFetch;
      await kv.remove("biddiff.settings");
    }
  });
});

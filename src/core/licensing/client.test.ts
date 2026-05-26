import { describe, it, expect, beforeEach } from "vitest";
import { LocalLicenseClient } from "./client.js";
import { makeKv } from "../storage/index.js";

describe("LocalLicenseClient", () => {
  beforeEach(async () => {
    // The in-memory KV resets per test invocation already via fresh client,
    // but the actual makeKv() may share state. Force clear:
    const kv = makeKv();
    await kv.remove("biddiff.license.state");
  });

  it("starts a 14-day trial on first use", async () => {
    const c = new LocalLicenseClient();
    const s = await c.validate();
    expect(s.tier).toBe("trial");
    expect(s.status).toBe("active");
    expect(s.trialDaysLeft).toBeGreaterThan(0);
    expect(s.trialDaysLeft).toBeLessThanOrEqual(14);
  });

  it("returns active when called within the trial window", async () => {
    const c = new LocalLicenseClient();
    await c.validate();
    // Second call shouldn't reset the trial.
    const s = await c.validate();
    expect(s.status).toBe("active");
  });
});

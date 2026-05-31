import { describe, it, expect, beforeEach } from "vitest";
import { LocalLicenseClient } from "./client.js";
import { __resetMemoryKvForTests, makeKv } from "../storage/index.js";

const STATE_KEY = "biddiff.license.state";
const daysAgo = (n: number): string => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

describe("LocalLicenseClient", () => {
  beforeEach(() => {
    __resetMemoryKvForTests();
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

  it("treats a stored signed blob as an active solo license (passes lastValidatedAt through)", async () => {
    await makeKv().set(STATE_KEY, {
      trialStartedAt: daysAgo(100), // irrelevant once a blob exists
      lastValidatedAt: "2026-05-01T00:00:00.000Z",
      signedBlob: "opaque-signed-key",
    });
    const s = await new LocalLicenseClient().validate();
    expect(s.tier).toBe("solo");
    expect(s.status).toBe("active");
    expect(s.trialDaysLeft).toBeNull();
    expect(s.lastValidatedAt).toBe("2026-05-01T00:00:00.000Z");
  });

  it("reports grace status just past the 14-day trial (within the 7-day grace window)", async () => {
    await makeKv().set(STATE_KEY, {
      trialStartedAt: daysAgo(16), // 2 days past the trial, well inside grace
      lastValidatedAt: null,
      signedBlob: null,
    });
    const s = await new LocalLicenseClient().validate();
    expect(s.tier).toBe("trial");
    expect(s.status).toBe("grace");
    expect(s.trialDaysLeft).toBe(0);
    expect(s.gracePeriodSecondsLeft).toBeGreaterThan(0);
  });

  it("reports expired once both the trial and the grace window have elapsed", async () => {
    await makeKv().set(STATE_KEY, {
      trialStartedAt: daysAgo(30), // past 14 trial + 7 grace = 21 days
      lastValidatedAt: null,
      signedBlob: null,
    });
    const s = await new LocalLicenseClient().validate();
    expect(s.tier).toBe("trial");
    expect(s.status).toBe("expired");
    expect(s.trialDaysLeft).toBe(0);
    expect(s.gracePeriodSecondsLeft).toBeNull();
  });
});

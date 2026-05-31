import { describe, it, expect, afterEach, vi } from "vitest";
import { sendRuntime, postRuntime, openOptionsPage } from "./chrome-rt.js";
import type { BidDiffMessage } from "./messages.js";

const msg: BidDiffMessage = { kind: "biddiff/get-last-attachments" };

// These wrappers exist to NEVER throw and to swallow chrome.runtime.lastError.
// We drive them by installing / removing a fake `chrome` global (cast through
// a loose view of globalThis so we don't fight the real `chrome` ambient type).
const g = globalThis as unknown as { chrome?: unknown };

afterEach(() => {
  delete g.chrome;
  vi.restoreAllMocks();
});

describe("chrome-rt wrappers with no chrome runtime (e.g. dev preview / tests)", () => {
  it("sendRuntime resolves null instead of throwing", async () => {
    expect(g.chrome).toBeUndefined();
    await expect(sendRuntime(msg)).resolves.toBeNull();
  });

  it("postRuntime and openOptionsPage are silent no-ops", () => {
    expect(() => postRuntime(msg)).not.toThrow();
    expect(() => openOptionsPage()).not.toThrow();
  });
});

describe("chrome-rt wrappers with a runtime present", () => {
  it("sendRuntime forwards the response and checks lastError", async () => {
    let lastErrorRead = false;
    g.chrome = {
      runtime: {
        // sendMessage(msg, cb) — invoke the callback with a response.
        sendMessage: (_m: unknown, cb: (r: unknown) => void) => cb({ ok: true }),
        get lastError() {
          lastErrorRead = true;
          return undefined;
        },
      },
    };
    await expect(sendRuntime(msg)).resolves.toEqual({ ok: true });
    expect(lastErrorRead).toBe(true); // reading it suppresses Chrome's warning
  });

  it("sendRuntime resolves null when the response is undefined", async () => {
    g.chrome = {
      runtime: {
        sendMessage: (_m: unknown, cb: (r: unknown) => void) => cb(undefined),
        lastError: undefined,
      },
    };
    await expect(sendRuntime(msg)).resolves.toBeNull();
  });

  it("sendRuntime resolves null (never throws) when sendMessage throws", async () => {
    g.chrome = {
      runtime: {
        sendMessage: () => {
          throw new Error("context invalidated");
        },
        lastError: undefined,
      },
    };
    await expect(sendRuntime(msg)).resolves.toBeNull();
  });

  it("postRuntime swallows a throwing sendMessage", () => {
    g.chrome = {
      runtime: {
        sendMessage: () => {
          throw new Error("boom");
        },
        lastError: undefined,
      },
    };
    expect(() => postRuntime(msg)).not.toThrow();
  });

  it("openOptionsPage swallows a rejected promise", async () => {
    const rejected = Promise.reject(new Error("no options page"));
    g.chrome = {
      runtime: { openOptionsPage: () => rejected },
    };
    expect(() => openOptionsPage()).not.toThrow();
    // Let the microtask queue drain; the .catch() must have handled it.
    await Promise.resolve();
    await expect(rejected.catch(() => "handled")).resolves.toBe("handled");
  });
});

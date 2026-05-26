/**
 * Thin wrappers around chrome.runtime that swallow `chrome.runtime.lastError`
 * — the unchecked-runtime-error warning Chrome logs when the receiver of a
 * sendMessage call has gone away (e.g. the side panel closed mid-job).
 *
 * Use these everywhere instead of bare `chrome.runtime.sendMessage(...)`.
 */
import type { BidDiffMessage } from "./messages.js";

/** Safe send: never throws, never logs an "unchecked runtime.lastError". */
export function sendRuntime<T = unknown>(msg: BidDiffMessage): Promise<T | null> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (globalThis as any).chrome;
    if (!api?.runtime?.sendMessage) {
      resolve(null);
      return;
    }
    try {
      api.runtime.sendMessage(msg, (resp: unknown) => {
        // Reading lastError marks it as "checked" so Chrome stops warning.
        const _ = api.runtime?.lastError;
        void _;
        resolve((resp as T) ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

/** Fire-and-forget; checks lastError so no console warnings. */
export function postRuntime(msg: BidDiffMessage): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (globalThis as any).chrome;
  if (!api?.runtime?.sendMessage) return;
  try {
    api.runtime.sendMessage(msg, () => {
      const _ = api.runtime?.lastError;
      void _;
    });
  } catch {
    /* swallow */
  }
}

/**
 * Thin wrappers around chrome.runtime that swallow `chrome.runtime.lastError`
 * — the unchecked-runtime-error warning Chrome logs when the receiver of a
 * sendMessage call has gone away (e.g. the side panel closed mid-job).
 *
 * Use these everywhere instead of bare `chrome.runtime.sendMessage(...)`.
 */
import type { BidDiffMessage } from "./messages.js";

function hasRuntime(): boolean {
  return typeof chrome !== "undefined" && !!chrome.runtime?.sendMessage;
}

/** Safe send: never throws, never logs an "unchecked runtime.lastError". */
export function sendRuntime<T = unknown>(msg: BidDiffMessage): Promise<T | null> {
  return new Promise((resolve) => {
    if (!hasRuntime()) {
      resolve(null);
      return;
    }
    try {
      chrome.runtime.sendMessage(msg, (resp: unknown) => {
        // Reading lastError marks it as "checked" so Chrome stops warning.
        void chrome.runtime?.lastError;
        resolve((resp as T) ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

/** Fire-and-forget; checks lastError so no console warnings. */
export function postRuntime(msg: BidDiffMessage): void {
  if (!hasRuntime()) return;
  try {
    chrome.runtime.sendMessage(msg, () => {
      void chrome.runtime?.lastError;
    });
  } catch {
    /* swallow */
  }
}

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

/**
 * Open the extension's options page. Idempotent. Safely no-ops outside
 * an extension context (dev preview) and swallows the rejection that
 * chrome.runtime.openOptionsPage can produce (no options_page set,
 * extension context invalidated, etc.) so callers don't have to
 * thread a try/catch around every call site.
 */
export function openOptionsPage(): void {
  if (typeof chrome === "undefined") return;
  try {
    const r = chrome.runtime?.openOptionsPage?.();
    // In MV3 this returns a Promise<void>. In MV2 / older Chrome it
    // may return undefined and take a callback. Either way, we don't
    // care about the result — just don't unhandled-reject.
    if (r && typeof (r as { catch?: (h: () => void) => unknown }).catch === "function") {
      (r as Promise<void>).catch(() => {});
    }
  } catch {
    /* swallow */
  }
}

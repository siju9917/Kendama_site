/**
 * Background service worker (MV3).
 *
 * Responsibilities:
 *   - Open the side panel on demand.
 *   - Cache the most recently discovered attachments from the SAM content
 *     script so the side panel can pick them up at mount.
 *
 * MV3 terminates idle service workers (typically after ~30s), wiping
 * any module-level state. The attachment cache therefore lives in
 * `chrome.storage.session` — survives SW restarts, cleared on browser
 * restart, never written to disk.
 */
import type { OpportunityAttachment } from "../core/interfaces.js";
import {
  isBidDiffMessage,
  type LastAttachmentsResponse,
} from "../shared/messages.js";

const ATTACHMENTS_KEY = "biddiff.lastAttachments";

function getSessionStore(): chrome.storage.StorageArea | undefined {
  // chrome.storage.session is present on Chrome 102+. Fall back to local
  // for environments that lack it (which then DOES persist to disk).
  return chrome.storage?.session ?? chrome.storage?.local;
}

async function readLastAttachments(): Promise<OpportunityAttachment[]> {
  const store = getSessionStore();
  if (!store) return [];
  return new Promise((resolve) => {
    store.get(ATTACHMENTS_KEY, (items?: Record<string, unknown>) => {
      void chrome.runtime?.lastError;
      // On error chrome calls the callback with items=undefined.
      const v = items ? items[ATTACHMENTS_KEY] : undefined;
      resolve(Array.isArray(v) ? (v as OpportunityAttachment[]) : []);
    });
  });
}

function writeLastAttachments(list: OpportunityAttachment[]): void {
  const store = getSessionStore();
  if (!store) return;
  store.set({ [ATTACHMENTS_KEY]: list }, () => {
    void chrome.runtime?.lastError;
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!isBidDiffMessage(msg)) return false;

  if (msg.kind === "biddiff/open-side-panel") {
    if (msg.attachments) writeLastAttachments(msg.attachments);
    const windowId = sender.tab?.windowId;
    if (windowId !== undefined && chrome.sidePanel?.open) {
      chrome.sidePanel.open({ windowId }, () => {
        sendResponse({ ok: true });
      });
      return true;
    }
    sendResponse({ ok: false });
    return false;
  }

  if (msg.kind === "biddiff/get-last-attachments") {
    void readLastAttachments().then((attachments) => {
      const response: LastAttachmentsResponse = { ok: true, attachments };
      sendResponse(response);
    });
    return true; // async sendResponse
  }

  // Other message kinds flow side-panel ↔ offscreen directly via
  // runtime.sendMessage. The background just acts as a relay if needed.
  return false;
});

if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    /* non-fatal */
  });
}

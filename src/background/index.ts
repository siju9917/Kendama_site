/**
 * Background service worker (MV3).
 *
 * Responsibilities:
 *   - Open the side panel on demand.
 *   - Cache the most recently discovered attachments from the SAM content
 *     script so the side panel can pick them up at mount.
 */
import type { OpportunityAttachment } from "../core/interfaces.js";
import {
  isBidDiffMessage,
  type LastAttachmentsResponse,
} from "../shared/messages.js";

let lastAttachments: OpportunityAttachment[] = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!isBidDiffMessage(msg)) return false;

  if (msg.kind === "biddiff/open-side-panel") {
    if (msg.attachments) lastAttachments = msg.attachments;
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
    const response: LastAttachmentsResponse = { ok: true, attachments: lastAttachments };
    sendResponse(response);
    return false;
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

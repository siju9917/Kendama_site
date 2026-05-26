/**
 * Background service worker (MV3).
 *
 * Responsibilities:
 *   - Open the side panel on demand from popup or content script.
 *   - Persist job state across the service-worker lifecycle (sleeps/wakes).
 *   - Forward messages between content script and side panel.
 */

import type { OpportunityAttachment } from "../core/interfaces.js";

interface OpenSidePanelMessage {
  type: "OPEN_SIDE_PANEL";
  attachments?: OpportunityAttachment[];
}

type Msg = OpenSidePanelMessage;

/** In-memory cache of the most recently discovered attachments. */
let lastAttachments: OpportunityAttachment[] = [];

chrome.runtime.onMessage.addListener((msg: Msg, sender, sendResponse) => {
  if (msg.type === "OPEN_SIDE_PANEL") {
    if (msg.attachments) lastAttachments = msg.attachments;
    const windowId = sender.tab?.windowId;
    if (windowId !== undefined && chrome.sidePanel?.open) {
      chrome.sidePanel.open({ windowId }, () => {
        sendResponse({ ok: true });
      });
      return true; // async response
    }
    sendResponse({ ok: false, error: "sidePanel API unavailable" });
    return false;
  }
  // The side panel asks the background for the most recently discovered
  // attachments (populated by the content script just before opening).
  if ((msg as unknown as { type?: string })?.type === "GET_LAST_ATTACHMENTS") {
    sendResponse({ ok: true, attachments: lastAttachments });
    return false;
  }
  return false;
});

// Make clicking the action button also open the side panel.
if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    /* non-fatal */
  });
}

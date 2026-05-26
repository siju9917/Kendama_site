/**
 * Background service worker (MV3).
 *
 * Responsibilities:
 *   - Open the side panel on demand from popup or content script.
 *   - Persist job state across the service-worker lifecycle (sleeps/wakes).
 *   - Forward messages between content script and side panel.
 */

interface OpenSidePanelMessage {
  type: "OPEN_SIDE_PANEL";
}

type Msg = OpenSidePanelMessage;

chrome.runtime.onMessage.addListener((msg: Msg, sender, sendResponse) => {
  if (msg.type === "OPEN_SIDE_PANEL") {
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
  return false;
});

// Make clicking the action button also open the side panel.
if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    /* non-fatal */
  });
}

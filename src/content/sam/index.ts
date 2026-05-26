/**
 * SAM.gov content script.
 *
 * THE ONLY PLACE WHERE SAM.gov-SPECIFIC SELECTORS LIVE. An automated test
 * (test/unit/integration-isolation.test.ts) greps the rest of `src/` for
 * SAM-specific patterns and fails if any leak out.
 */
import { SamIntegration } from "./sam-integration.js";
import { isBidDiffMessage, type OpenSidePanelMsg } from "../../shared/messages.js";

const integration = new SamIntegration();

function inject(): void {
  if (!integration.isOpportunityPage()) return;
  if (document.getElementById("biddiff-affordance")) return;

  const btn = document.createElement("button");
  btn.id = "biddiff-affordance";
  btn.textContent = "Compare with BidDiff";
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "16px",
    right: "16px",
    zIndex: "2147483647",
    background: "#1f5cd6",
    color: "white",
    border: "0",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "13px",
    fontFamily: "system-ui, sans-serif",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(20,24,31,0.18)",
  } satisfies Partial<CSSStyleDeclaration>);
  btn.addEventListener("click", async () => {
    let attachments: Awaited<ReturnType<typeof integration.findAttachments>> = [];
    try {
      attachments = await integration.findAttachments();
    } catch {
      attachments = [];
    }
    const msg: OpenSidePanelMsg = {
      kind: "biddiff/open-side-panel",
      attachments,
    };
    chrome.runtime.sendMessage(msg);
  });
  document.body.appendChild(btn);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!isBidDiffMessage(msg)) return false;
  if (msg.kind === "biddiff/get-sam-attachments") {
    integration
      .findAttachments()
      .then((attachments) => sendResponse({ ok: true, attachments }))
      .catch(() => sendResponse({ ok: false, attachments: [] }));
    return true;
  }
  return false;
});

const observer = new MutationObserver(() => inject());
observer.observe(document.body, { childList: true, subtree: true });
inject();

/**
 * SAM.gov content script.
 *
 * THE ONLY PLACE WHERE SAM.gov-SPECIFIC SELECTORS LIVE. An automated test
 * (test/unit/integration-isolation.test.ts) greps the rest of `src/` for
 * SAM-specific patterns and fails if any leak out.
 *
 * If SAM.gov redesigns its DOM, only this file should need to change.
 */
import { SamIntegration } from "./sam-integration.js";

const integration = new SamIntegration();

function inject(): void {
  if (!integration.isOpportunityPage()) return;
  if (document.getElementById("biddiff-affordance")) return;

  // Minimal injected affordance — a small button that opens the side panel.
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
  btn.addEventListener("click", () => {
    // Ask the background to open the side panel for this window.
    chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
  });
  document.body.appendChild(btn);
}

// Initial inject + retry on DOM mutations (SAM.gov is a single-page app).
const observer = new MutationObserver(() => inject());
observer.observe(document.body, { childList: true, subtree: true });
inject();

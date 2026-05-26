import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "BidDiff — Federal Solicitation Amendment Diff",
  short_name: "BidDiff",
  version: "0.1.0",
  description:
    "Diff amended U.S. federal solicitations against prior versions. Categorized changes, critical-flagged, on-device.",
  permissions: ["storage", "sidePanel", "offscreen"],
  host_permissions: ["*://sam.gov/*", "*://*.sam.gov/*"],
  action: {
    default_popup: "src/popup/index.html",
    default_title: "BidDiff",
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  // The offscreen document is created at runtime via chrome.offscreen.
  // Listing it as a web-accessible resource ensures CRXJS bundles it.
  web_accessible_resources: [
    {
      resources: ["src/offscreen/index.html"],
      matches: ["<all_urls>"],
    },
  ],
  content_scripts: [
    {
      matches: ["*://sam.gov/*", "*://*.sam.gov/*"],
      js: ["src/content/sam/index.ts"],
      run_at: "document_idle",
    },
  ],
  icons: {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
  },
});

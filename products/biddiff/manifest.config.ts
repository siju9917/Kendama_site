import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "BidDiff — Federal Solicitation Amendment Diff",
  short_name: "BidDiff",
  version: "0.1.0",
  description:
    "Diff amended U.S. federal solicitations against prior versions. Categorized changes, critical-flagged, on-device.",
  permissions: ["storage", "sidePanel", "offscreen"],
  host_permissions: ["https://sam.gov/*", "https://*.sam.gov/*"],
  // Explicit Content Security Policy. MV3 defaults already prohibit
  // remote script and inline execution; we restate it here so a future
  // manifest edit can't accidentally loosen it.
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'",
  },
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
  // The offscreen document is created at runtime via chrome.offscreen
  // (an extension-internal page load, which does NOT require
  // web-accessibility). The entry exists only so CRXJS bundles the
  // file; its `matches` is therefore scoped to sam.gov — the single
  // origin the extension operates on — rather than `<all_urls>`, so a
  // resource probe can't fingerprint the extension from arbitrary
  // sites (least privilege, Security Critic #3).
  web_accessible_resources: [
    {
      resources: ["src/offscreen/index.html"],
      matches: ["https://sam.gov/*", "https://*.sam.gov/*"],
    },
  ],
  content_scripts: [
    {
      matches: ["https://sam.gov/*", "https://*.sam.gov/*"],
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

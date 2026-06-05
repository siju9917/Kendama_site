# BidDiff Security Audit

Pre-launch security review (Phase 6.5), updated 2026-06-05 for the **on-device,
no-server, free** v1 (the license / telemetry / OCR server features were removed
— see `brain/DECISIONS.md` 2026-06-05). Performed against the production build.

## Threat model

Consolidated threat model (QUALITY_BAR "a threat model exists"). The
per-boundary detail follows; this is the explicit assets / boundaries /
threat→mitigation framing.

**Assets to protect.**
1. **The user's solicitation documents** — competitively sensitive bid data.
   The primary asset; its confidentiality is the product's core promise.
2. **Saved diff history** (chrome.storage.local + IndexedDB) — derived from #1.

**Trust boundaries** (everything crossing one is untrusted input):
- **B1 — document input:** a PDF/DOCX/TXT chosen by the user or fetched from
  sam.gov. May be malformed, adversarially crafted, or huge.
- **B2 — sam.gov page DOM:** the content script reads an external page that
  could be malformed or hostile (XSS on sam.gov, spoofed attachment hrefs).
- **B3 — persisted data:** chrome.storage/IDB values are tamperable and may be
  corrupt/partial (cleared in another tab, quota-evicted).
- **B4 — the network:** the **ONLY outbound call is the user-clicked sam.gov
  attachment fetch.** There is **no BidDiff server** — no license, telemetry, or
  OCR endpoint exists in the code or the shipped bundle. BidDiff is fully
  on-device.

**Threat → mitigation.**

| # | Threat (attacker capability) | Boundary | Mitigation (all implemented + tested) |
|---|---|---|---|
| T1 | Malicious PDF/DOCX crashes or hangs the extension, or exhausts memory | B1 | Parsers run on untrusted-input fuzz corpora; per-dimension LCS caps + a bounded dp product; recognized-but-unsupported kinds rejected at the boundary; an extraction failure surfaces a clean ERROR state (not a hang) |
| T2 | Malicious document content is injected into an export (XML/OOXML/Markdown) | B1 | `escapeXml` escapes metacharacters AND strips XML-illegal control chars (Word-corruption / injection); markdown routes user values through `mdInlineCode`; PDF text is WinAnsi-sanitized |
| T3 | Spoofed/hostile attachment href causes a fetch of a dangerous scheme | B2 | `isAllowedDownloadUrl` allowlists `https:` only (rejects `file:`/`data:`/`blob:`/`javascript:`/malformed); tested with bypass vectors |
| T4 | Malformed sam.gov DOM crashes the content script | B2 | Defensive parsing (optional chaining + fallbacks); degrades to empty results, never throws; tested on malformed rows |
| T5 | Corrupt/tampered stored data throws out of a UI handler or is trusted | B3 | Every `JSON.parse` of stored data is guarded → returns null/empty; a half-cleared store drops its pointer keys |
| T6 | Prompt-injection text inside a document redirects behavior | B1 | The engine treats document text as DATA only — it is diffed/classified deterministically, never executed or interpreted as instructions; there is no LLM in the v1 data path, so there is no instruction-following surface to inject into |
| T7 | Document content exfiltrated over the network | B4 | **No exfiltration path exists.** BidDiff runs no server and makes no analytics/telemetry/license call; the only outbound request is the user-initiated download of a sam.gov attachment. Enforced by inspection of the built bundle (no non-sam.gov BidDiff origin) |
| T8 | Over-broad permissions enable lateral abuse | — | Minimal permission set (storage/sidePanel/offscreen + `*://sam.gov/*`); `tabs`/`<all_urls>`/`scripting`/`cookies` explicitly not requested |

Residual/accepted risks are in "Known limitations" below. The model is
re-validated whenever a new trust boundary or outbound call is added.

## Permission audit

| Permission                            | Rationale                                                              | Removable? |
| ------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| `storage`                             | Settings + diff index in chrome.storage.local (on-device only)         | No         |
| `sidePanel`                           | The main workspace renders in the side panel                           | No         |
| `offscreen`                           | Heavy CPU/canvas work hosted off the side-panel thread                 | No         |
| `host_permissions: *://sam.gov/*`     | Content script for the in-page affordance                              | No (used)  |

Permissions explicitly NOT requested:

- `tabs`, `webRequest`, `<all_urls>` — would be over-broad. Not requested.
- `scripting` — not requested. Affordance injection is via the content script.
- `cookies`, `webNavigation`, `history` — not requested.

## Data flow

See `ARCHITECTURE.md` for the full diagram.

| Path                                              | Content?   | Sender → Receiver                          |
| ------------------------------------------------- | ---------- | ------------------------------------------ |
| File selected in side panel → offscreen / panel   | Document   | Internal to extension; never leaves device |
| Extract → diff                                    | Document   | Internal                                   |
| Save diff → storage                               | Document   | Internal (`chrome.storage.local` + IDB)    |
| User clicks "Compare with BidDiff" → fetch file   | Document   | sam.gov → side panel (https-only, user-initiated) |

Nothing in the data flow leaves the device except the user-initiated download of
a sam.gov attachment. There is no other network path.

## Attachment-download boundary

- `isAllowedDownloadUrl` (`src/sidepanel/FilePickerWithSam.tsx`, exported +
  unit-tested) gates the privileged fetch of a SAM.gov attachment to
  `protocol === "https:"`, rejecting `http:`/`file:`/`data:`/`blob:`/
  `javascript:` and malformed URLs. This guards against a malformed link or a
  sam.gov XSS injecting a non-https href into the extension's privileged
  context.
- **Scheme-only, NOT a host allowlist — deliberate (verified 2026-05-30).**
  SAM serves attachments from CDN/object-store hostnames (e.g.
  `falextracts.s3.amazonaws.com`), not only `sam.gov`, so a host allowlist
  would false-reject legitimate downloads. The test suite pins both the S3
  hostname (allowed) and every dangerous scheme (rejected). A future
  "tighten to a host allowlist" suggestion is therefore a regression, not a
  hardening — the correct boundary is scheme + the content script's host
  scoping (manifest `host_permissions` are sam.gov-scoped).

## Scanned-PDF handling (no OCR, no upload)

A scanned (image-only) PDF has no text layer. BidDiff detects this and surfaces a
warning advising the user to OCR the file themselves (e.g. in Word/Acrobat) and
re-import. **BidDiff performs no OCR and never uploads a document** — the scanned
case is handled entirely with an on-device warning.

## Dependency surface

Runtime production dependencies:

- `react` / `react-dom` — well-maintained, audited.
- `pdfjs-dist` (Mozilla) — well-maintained.
- `jszip` — DOCX zip handling.
- `pdf-lib` — used only in export, sandboxed in side-panel.

No production dependency requests network access on its own. The PDF.js
worker URL is bundled by Vite/CRXJS so it resolves to the extension's
own origin.

## CSP

Manifest V3 defaults to a strict CSP that disallows remote script.
We do not loosen it. All scripts ship in the extension bundle.

## Secrets

- **No secrets in the bundle, and no server to hold any.** BidDiff has no
  backend, no API key, and no credential of any kind.

## Known limitations (documented, not bugs)

- A user can extract the PDF.js worker and the bundle from any installed
  extension. Nothing in the bundle is sensitive (no secrets, no server).

## Dependency audit — 2026-05-30 (Kendama K2 re-confirm)

`npm audit` re-run during the K2 ship-gate dry run. **Key fact: zero
of the flagged vulnerabilities ship in the extension.** The MV3 bundle
contains only app JS + the pdf.js *browser* build + wasm; none of the
flagged packages (`tar`, `esbuild`, `rollup`, `vite`, `canvas`) is in
it.

- **Fixed surgically:** added `overrides: { tar: "^7.5.15" }` to
  `package.json`. The high `tar` advisories came in via
  `pdfjs-dist → canvas (optional, Node-only, browser-UNUSED) →
  @mapbox/node-pre-gyp → tar`. The override pins a patched `tar`.
- **Remaining advisories** are entirely the **Vite/Vitest build & test
  toolchain** — devDependencies, build-time and test-time only. **None is
  exploitable in the shipped product or in the factory's headless build.**
- **Disposition:** logged as a maintenance task (`PROGRESS.md`) to be done
  with full re-verification — not rushed at ship gate, because it cannot
  reduce shipped risk (already zero) and a botched toolchain bump would.

## Verdict

The Phase 6.5 security audit signs off (updated 2026-06-05 for the on-device,
no-server build):

- All permissions are necessary and justified, and minimal
  (`web_accessible_resources` scoped to sam.gov; https-only fetch of
  DOM-sourced URLs).
- **Document content never leaves the device.** There is no server, no
  telemetry, no OCR upload, and no license call — verified against the shipped
  bundle (only sam.gov appears as a BidDiff network origin).
- **No high-severity dependency vulnerabilities in the SHIPPED bundle.** The
  advisories from `npm audit` are all dev/build toolchain and do not ship.
- No secrets in the bundle.

Approved for production submission pending the remaining human action items in
`docs/SUBMISSION_PREP.md` (Chrome Web Store $5 developer account; a hosted
privacy-policy URL and a real support URL).

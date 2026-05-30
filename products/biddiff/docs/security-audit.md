# BidDiff Security Audit

Pre-launch security review (Phase 6.5). Performed against the
production build at branch `claude/biddiff-extension-ijZiE`.

## Permission audit

| Permission                            | Rationale                                                              | Removable? |
| ------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| `storage`                             | Settings, license key, diff index in chrome.storage.local              | No         |
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
| License validation                                | License key only | Side panel / background → license endpoint |
| Telemetry (opt-out)                               | Counts / event names | Side panel → telemetry endpoint   |
| Server OCR (per-document opt-in)                  | Document   | Side panel → OCR endpoint (consent gated)  |

The integration-isolation test (`test/unit/integration-isolation.test.ts`)
enforces this at the import layer: `src/core/licensing/` cannot import
any model/diff/extract type. Re-run on every commit.

## License validation

- Validation payload contains only the license key string and a request
  timestamp.
- Response is HMAC-SHA256 signed by the server (`server/handlers.ts`
  `handleLicenseValidate`). The client refuses to accept an unsigned
  response in production.
- A 7-day offline grace window applies — a user with a previously valid
  license is not locked out by transient connectivity loss.
- Local trial state is stored in chrome.storage; we accept this is
  tamperable but the server-side enforcement is the canonical check.
  Tampering only extends the local trial illegitimately; paid features
  remain server-gated.

## Telemetry boundary

- `handleTelemetry` enforces a strict event-name whitelist and rejects
  any non-numeric `counts.*` value (`server/handlers.test.ts` covers this).
- No file name, no document content, no path, no anchor text reaches
  the telemetry layer. The schema makes it structurally impossible to
  include them.
- Opt-out is a single toggle in the options page; the default ships ON
  (anonymous statistics enabled) per industry convention but the user
  can disable it before their first diff.

## Server OCR boundary

- The OCR endpoint accepts the encoded PDF only when the user has
  explicitly clicked the per-document consent button.
- The endpoint does not retain the document. The production deploy
  configures the underlying OCR provider with a no-retention contract.
- The consent flow is per-document, not per-user — there is no "always
  allow" toggle for this path.

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

- No secrets in the extension bundle. The HMAC secret used by the
  license server lives in the deployment environment (env var,
  managed-secret store), never in the client.
- The telemetry endpoint requires no client secret.

## Known limitations (documented, not bugs)

- A determined attacker with full local device access can edit
  chrome.storage.local to extend a trial. We accept this; paid features
  are server-gated.
- A user can extract the PDF.js worker and the bundle from any
  installed extension. Nothing in the bundle is sensitive.

## Dependency audit — 2026-05-30 (Kendama K2 re-confirm)

`npm audit` re-run during the K2 ship-gate dry run. **Key fact: zero
of the flagged vulnerabilities ship in the extension.** The MV3 bundle
contains only app JS + the pdf.js *browser* build + wasm; none of the
flagged packages (`tar`, `esbuild`, `rollup`, `vite`, `canvas`) is in
it.

- **Before:** 11 vulns (6 high, 5 moderate).
- **Fixed surgically:** added `overrides: { tar: "^7.5.15" }` to
  `package.json`. The 6 high `tar` advisories came in via
  `pdfjs-dist → canvas (optional, Node-only, browser-UNUSED) →
  @mapbox/node-pre-gyp → tar`. The override pins a patched `tar`;
  build + 262 tests + lint + typecheck all still green. → **11 → 7.**
- **Remaining 7 (5 moderate, 2 high):** entirely the **Vite/Vitest
  build & test toolchain** (`esbuild ≤0.24.2` via vite/vitest/
  vite-node/@vitest/mocker; `rollup` path-traversal). These are
  devDependencies — build-time and test-time only. The esbuild
  advisory only matters when running `vite dev` with an untrusted
  website open (not a factory/CI condition); rollup's is build-time
  over trusted input. **None is exploitable in the shipped product or
  in the factory's headless build.**
- **Disposition:** the remaining 7 require a breaking Vite 5→6/7 +
  Vitest 2→3 major bump. That is logged as a **maintenance task**
  (`PROGRESS.md`) to be done with full re-verification (config +
  plugin compat + the whole suite) — not rushed at ship gate, because
  it cannot reduce shipped risk (already zero) and a botched toolchain
  bump would.

## Verdict

The Phase 6.5 security audit signs off (re-confirmed 2026-05-30):

- All permissions are necessary and justified — and tightened this
  session (`web_accessible_resources` scoped off `<all_urls>` to
  sam.gov; https-only fetch of DOM-sourced URLs).
- Document content does not leave the device outside the opt-in OCR
  path. Enforced by integration-isolation test + telemetry schema.
- License validation is tamper-evident on the wire.
- **No high-severity dependency vulnerabilities in the SHIPPED
  bundle.** The high-severity advisories from `npm audit` are all in
  the dev/build toolchain (see "Dependency audit" above) and do not
  ship; the optional Node-only `canvas`/`tar` chain was pinned to a
  patched `tar`.
- No secrets in the bundle.

Approved for production submission pending the human action items in
`BLOCKERS.md` (cloud deployment credentials, MoR account, store account).

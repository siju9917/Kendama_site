# BidDiff Security Audit

Pre-launch security review (Phase 6.5). Performed against the
production build at branch `claude/biddiff-extension-ijZiE`.

## Threat model

Consolidated threat model (QUALITY_BAR "a threat model exists"). The
per-boundary detail follows in the sections below; this is the explicit
assets / boundaries / threat→mitigation framing.

**Assets to protect.**
1. **The user's solicitation documents** — competitively sensitive bid data.
   The primary asset; its confidentiality is the product's core promise.
2. **Saved diff history** (chrome.storage.local + IndexedDB) — derived from #1.
3. **License key / trial state.**

**Trust boundaries** (everything crossing one is untrusted input):
- **B1 — document input:** a PDF/DOCX/TXT chosen by the user or fetched from
  sam.gov. May be malformed, adversarially crafted, or huge.
- **B2 — sam.gov page DOM:** the content script reads an external page that
  could be malformed or hostile (XSS on sam.gov, spoofed attachment hrefs).
- **B3 — persisted data:** chrome.storage/IDB values are tamperable and may be
  corrupt/partial (cleared in another tab, quota-evicted).
- **B4 — the network:** in **v1 the ONLY outbound call is the user-clicked
  sam.gov attachment fetch.** The license/telemetry/OCR endpoints below are
  *designed but unwired in v1* (see "Known limitations" + the Compliance item
  in `../PROGRESS.md` / `human/NEED_FROM_HUMAN.md` #7); v1 is effectively
  on-device.

**Threat → mitigation.**

| # | Threat (attacker capability) | Boundary | Mitigation (all implemented + tested) |
|---|---|---|---|
| T1 | Malicious PDF/DOCX crashes or hangs the extension, or exhausts memory | B1 | Parsers run on untrusted-input fuzz corpora; per-dimension LCS caps + a bounded dp product; recognized-but-unsupported kinds rejected at the boundary; an extraction failure surfaces a clean ERROR state (not a hang) |
| T2 | Malicious document content is injected into an export (XML/OOXML/Markdown) | B1 | `escapeXml` escapes metacharacters AND strips XML-illegal control chars (Word-corruption / injection); markdown routes user values through `mdInlineCode`; PDF text is WinAnsi-sanitized |
| T3 | Spoofed/hostile attachment href causes a fetch of a dangerous scheme | B2 | `isAllowedDownloadUrl` allowlists `https:` only (rejects `file:`/`data:`/`blob:`/`javascript:`/malformed); tested with bypass vectors |
| T4 | Malformed sam.gov DOM crashes the content script | B2 | Defensive parsing (optional chaining + fallbacks); degrades to empty results, never throws; tested on malformed rows |
| T5 | Corrupt/tampered stored data throws out of a UI handler or is trusted | B3 | Every `JSON.parse` of stored data is guarded → returns null/empty; a half-cleared store drops its pointer keys; license trial state treated as tamperable, paid features server-gated by design |
| T6 | Prompt-injection text inside a document redirects behavior | B1 | The engine treats document text as DATA only — it is diffed/classified deterministically, never executed or interpreted as instructions; there is no LLM in the v1 data path, so there is no instruction-following surface to inject into |
| T7 | PII/document content leaks via telemetry | B4 | Telemetry is unwired in v1; by design it is a key-allowlisted, finite-integer counts schema (no free text, no document content) enforced at the handler |
| T8 | Over-broad permissions enable lateral abuse | — | Minimal permission set (storage/sidePanel/offscreen + `*://sam.gov/*`); `tabs`/`<all_urls>`/`scripting`/`cookies` explicitly not requested |

Residual/accepted risks are in "Known limitations" below. The model is
re-validated whenever a new trust boundary or outbound call is added.

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

- `handleTelemetry` enforces a strict event-name whitelist AND a strict
  `counts` schema: an allow-list of keys (`changes`/`critical`/`pages` only)
  plus finite NON-NEGATIVE INTEGERS — so a buggy/compromised client cannot
  smuggle a numeric id (e.g. `secretUserId`) or a non-finite value through
  (hardened 2026-05-30, bug-hunt pass 45; `server/handlers.test.ts` covers
  unknown-key, NaN/Infinity/negative/non-integer, and array rejection).
- No file name, no document content, no path, no anchor text reaches
  the telemetry layer. The schema makes it structurally impossible to
  include them.
- Opt-out is a single toggle in the options page; the default ships ON
  (anonymous statistics enabled) per industry convention but the user
  can disable it before their first diff.

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

## Server-handler trust boundaries (adversarial sweep — 2026-05-30)

Every `server/handlers.ts` boundary was red-teamed (the server is unwired in
v1 per the Compliance item, but it is the shipped server *contract*):

- **/telemetry** — HARDENED this session (bug-hunt pass 45): event-name
  allow-list + a strict `counts` schema (key allow-list `changes/critical/
  pages` + finite non-negative integers). Confirmed it now rejects an unknown
  numeric key (`secretUserId` PII-smuggling), NaN/Infinity, negatives,
  non-integers, and arrays.
- **/license/validate** — sound: delegates verification to an injected HMAC
  verifier (the `DEV-` default is a documented dev stub), validates the key is
  a non-empty string, and SIGNS the response (HMAC over key+server-issuedAt)
  so a client cannot forge a "valid" reply. The `|` delimiter has no
  collision risk (issuedAt is server-generated, not client input).
- **/clauses/lookup** — sound: rejects a non-array; a mixed adversarial array
  (numbers/null/objects/`__proto__`) returns only valid found clauses (no
  prototype pollution — `__proto__` is not a clause number so is never
  written); 100k-element array handled in ~6ms (no DoS).
- **/ocr** — sound for its v1 stub contract: rejects an empty/non-string
  `pdfBase64`; the stub does not decode (the production adapter owns
  decode-bomb defense).
- **/health** — trivial, no input.

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

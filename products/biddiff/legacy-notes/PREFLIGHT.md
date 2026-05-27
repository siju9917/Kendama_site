# Pre-flight (Part 17.2)

## Environment

- **Node**: v20+ available.
- **Platform**: Linux container.
- **Browser for Playwright**: assumed available via @playwright/test; if `npx playwright install` fails the e2e tests are written but marked needs-browser in `BLOCKERS.md`.
- **Network**: outbound HTTP available (per environment description). SAM.gov reachability tested at Phase 1.1.

## Dependency installs (Phase 0)

- `npm install` completed successfully on first try. All Phase 0 dependencies present:
  typescript, vite, vitest, @vitejs/plugin-react, eslint, @typescript-eslint/*,
  @crxjs/vite-plugin, prettier, @playwright/test, react/react-dom, @types/chrome.

## Dependencies still to add (later phases)

- `pdfjs-dist` (Phase 2.1 — PDF extraction).
- `mammoth` or `@xmldom/xmldom` + `jszip` (Phase 2.2 — DOCX extraction).
- `tesseract.js` (Phase 2.10 — OCR).
- `pdf-lib` (Phase 4.11 — PDF report export).
- `jsdom` for content-script unit tests (Phase 4).

## Credentials & external

- Chrome Web Store account → human action item (`BLOCKERS.md`).
- Billing provider key → human action item.
- Cloud deployment → human action item.

## Pre-flight result

PASS. Nothing external blocks Phase 0 → Phase 4 development. Phase 5 deployment
needs human credentials, stubbed cleanly.

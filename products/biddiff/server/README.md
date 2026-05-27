# BidDiff server (Phase 5)

A minimal serverless backend designed to run on a scale-to-zero platform
(Cloudflare Workers, AWS Lambda + API Gateway, or Vercel Edge). Idle
cost approaches zero; per-call cost is negligible at the scale BidDiff
targets.

## Endpoints

| Route | Method | Purpose |
| ----- | ------ | ------- |
| `/health` | GET | liveness check |
| `/clauses/lookup` | POST | augment the bundled clause dataset with server-side data |
| `/license/validate` | POST | verify a cryptographically signed license key |
| `/telemetry` | POST | accept anonymous event counters (content-free) |
| `/ocr` | POST | opt-in server OCR on a document the user explicitly consented to upload |

## Privacy boundary

Every endpoint except `/ocr` is content-free by design. `/telemetry`
schema is restricted (see `server/schemas/telemetry.ts`) so document
content cannot be sent even by mistake.

## Deployment

The platform-specific wiring (worker config, deploy script) is recorded
in `BLOCKERS.md` as a human action item — it needs production
credentials. The source is fully written and unit-testable in Node.

## Local development

```bash
node server/dev-server.mjs
```

A tiny local HTTP server that serves the same handlers as the
serverless deployment.

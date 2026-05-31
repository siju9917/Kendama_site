/**
 * Platform-agnostic request handlers. The Cloudflare/Lambda/Vercel
 * adapters wrap these. Tests can drive them directly.
 */

import { CLAUSES } from "../src/core/clauses/data/clauses.js";

export type Json = unknown;

export interface HandlerResponse {
  status: number;
  body: Json;
}

export function ok(body: Json): HandlerResponse {
  return { status: 200, body };
}
export function bad(message: string): HandlerResponse {
  return { status: 400, body: { error: message } };
}
export function unauthorized(): HandlerResponse {
  return { status: 401, body: { error: "unauthorized" } };
}

/* ----------------- /health ----------------- */

export function handleHealth(): HandlerResponse {
  return ok({ ok: true, ts: new Date().toISOString() });
}

/* ----------------- /clauses/lookup ----------------- */

export interface ClausesLookupBody {
  clauseNumbers: string[];
}

export function handleClausesLookup(body: ClausesLookupBody): HandlerResponse {
  if (!body || !Array.isArray(body.clauseNumbers)) return bad("clauseNumbers[] required");
  const index = new Map(CLAUSES.map((c) => [c.clauseNumber, c] as const));
  const out: Record<string, unknown> = {};
  for (const n of body.clauseNumbers) {
    const info = index.get(n);
    if (info) out[n] = info;
  }
  return ok({ clauses: out });
}

/* ----------------- /license/validate ----------------- */

export interface LicenseValidateBody {
  licenseKey: string;
}

/**
 * In production, the server-side verifier validates the HMAC-SHA256
 * signature against the secret. For local development this stub accepts
 * any key starting with "DEV-".
 */
export async function handleLicenseValidate(
  body: LicenseValidateBody,
  opts: { secret?: string; verify?: (k: string) => Promise<boolean> } = {},
): Promise<HandlerResponse> {
  if (!body?.licenseKey || typeof body.licenseKey !== "string") return bad("licenseKey required");
  const k = body.licenseKey.trim();
  const verify = opts.verify ?? (async (key) => key.startsWith("DEV-"));
  const valid = await verify(k);
  if (!valid) return unauthorized();
  // Signed response so the client cannot forge a "valid" reply.
  const issuedAt = new Date().toISOString();
  const signature = opts.secret ? await hmacHex(opts.secret, `${k}|${issuedAt}`) : "dev";
  return ok({
    status: "active",
    tier: "solo",
    issuedAt,
    expiresAt: addDays(issuedAt, 7),
    signature,
  });
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString();
}

/* ----------------- /telemetry ----------------- */

/**
 * Strictly-typed schema so document content can't be sent even by mistake.
 * Only event name and small numeric fields allowed.
 */
export interface TelemetryEvent {
  event:
    | "diff_started"
    | "diff_completed"
    | "diff_failed"
    | "export_pdf"
    | "export_clipboard";
  /** Optional non-PII context: numeric counts only. */
  counts?: { changes?: number; critical?: number; pages?: number };
  /** Optional error code (no message). */
  errorCode?: string;
  /** Client-generated session UUID; not tied to any user. */
  sessionId: string;
}

const ALLOWED_EVENTS = new Set([
  "diff_started",
  "diff_completed",
  "diff_failed",
  "export_pdf",
  "export_clipboard",
]);

export function handleTelemetry(body: TelemetryEvent): HandlerResponse {
  if (!body?.event || !ALLOWED_EVENTS.has(body.event)) return bad("unknown event");
  if (typeof body.sessionId !== "string") return bad("sessionId required");
  // Validate counts schema STRICTLY (the whole point of this boundary is that
  // no PII can be sent even by a buggy/compromised client): an allow-list of
  // keys + finite non-negative integers only. Reject unknown keys (so a
  // numeric ID like `secretUserId` can't be smuggled through), NaN/Infinity,
  // negatives, and non-integers.
  if (body.counts !== undefined) {
    const counts = body.counts as Record<string, unknown>;
    if (typeof counts !== "object" || counts === null || Array.isArray(counts)) {
      return bad("counts must be an object");
    }
    const ALLOWED_COUNT_KEYS = new Set(["changes", "critical", "pages"]);
    for (const k of Object.keys(counts)) {
      if (!ALLOWED_COUNT_KEYS.has(k)) return bad(`counts.${k} is not an allowed field`);
      const v = counts[k];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
        return bad(`counts.${k} must be a non-negative integer`);
      }
    }
  }
  // The handler is intentionally side-effect-free here; the deploy adapter
  // is responsible for writing to the analytics store.
  return ok({ accepted: true });
}

/* ----------------- /ocr ----------------- */

export interface OcrBody {
  /** Base64-encoded PDF. The client explicitly consented per document. */
  pdfBase64: string;
}

export async function handleOcr(body: OcrBody): Promise<HandlerResponse> {
  if (!body?.pdfBase64 || typeof body.pdfBase64 !== "string") return bad("pdfBase64 required");
  // The actual OCR call goes to an OCR provider; this stub returns an
  // empty result so the rest of the system can be tested end-to-end.
  // The deploy adapter swaps this implementation for the real provider.
  return ok({ text: "", pages: 0, note: "OCR is stubbed in dev; production deploy uses the real provider." });
}

/* ----------------- HMAC helper ----------------- */

async function hmacHex(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoApi = (globalThis as { crypto?: Crypto }).crypto;
  if (!cryptoApi?.subtle) return "no-crypto";
  const key = await cryptoApi.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await cryptoApi.subtle.sign("HMAC", key, enc.encode(msg));
  const bytes = new Uint8Array(sig);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

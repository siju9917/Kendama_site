#!/usr/bin/env node
/**
 * Tiny local HTTP server for development. Wraps the platform-agnostic
 * handlers in node:http. Production uses the platform's adapter
 * (Cloudflare Worker / Lambda / Vercel).
 */
import http from "node:http";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const SECRET = process.env.BIDDIFF_SECRET ?? "dev-secret";

// Reasonable upper bound on a request body. Real endpoints take small
// JSON (a license key, a few clause numbers, a telemetry event). The
// /ocr path takes a base64 PDF — capped at 75 MB encoded (~55 MB raw)
// to match the extension's MAX_DOCUMENT_BYTES with base64 overhead.
const MAX_BODY_BYTES = 75 * 1024 * 1024;

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    // Collect Buffers and decode once at the end. `buf += chunk`
    // would do an implicit toString per chunk and corrupt any
    // multi-byte UTF-8 sequence that happened to straddle a chunk
    // boundary.
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy(new Error("body too large"));
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf8");
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

async function route(req) {
  const url = new URL(req.url, "http://x");
  const path = url.pathname;
  if (req.method === "GET" && path === "/health") {
    const { handleHealth } = await import("./handlers.ts");
    return handleHealth();
  }
  if (req.method === "POST" && path === "/clauses/lookup") {
    const { handleClausesLookup } = await import("./handlers.ts");
    return handleClausesLookup(await readBody(req));
  }
  if (req.method === "POST" && path === "/license/validate") {
    const { handleLicenseValidate } = await import("./handlers.ts");
    return handleLicenseValidate(await readBody(req), { secret: SECRET });
  }
  if (req.method === "POST" && path === "/telemetry") {
    const { handleTelemetry } = await import("./handlers.ts");
    return handleTelemetry(await readBody(req));
  }
  if (req.method === "POST" && path === "/ocr") {
    const { handleOcr } = await import("./handlers.ts");
    return handleOcr(await readBody(req));
  }
  return { status: 404, body: { error: "not found" } };
}

const server = http.createServer(async (req, res) => {
  try {
    const r = await route(req);
    res.writeHead(r.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(r.body));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(e) }));
  }
});

server.listen(PORT, () => {
  console.log(`BidDiff dev server listening on http://127.0.0.1:${PORT}`);
});

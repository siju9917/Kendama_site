import { describe, it, expect } from "vitest";
import {
  handleClausesLookup,
  handleHealth,
  handleLicenseValidate,
  handleOcr,
  handleTelemetry,
} from "./handlers.js";

describe("server handlers", () => {
  it("health returns ok", () => {
    const r = handleHealth();
    expect(r.status).toBe(200);
  });

  it("clauses/lookup returns known clauses", () => {
    const r = handleClausesLookup({ clauseNumbers: ["52.204-21", "999.999-99"] });
    expect(r.status).toBe(200);
    const body = r.body as { clauses: Record<string, unknown> };
    expect(body.clauses["52.204-21"]).toBeDefined();
    expect(body.clauses["999.999-99"]).toBeUndefined();
  });

  it("clauses/lookup rejects malformed input", () => {
    const r = handleClausesLookup({} as unknown as { clauseNumbers: string[] });
    expect(r.status).toBe(400);
  });

  it("license/validate accepts DEV- keys with default verifier", async () => {
    const r = await handleLicenseValidate({ licenseKey: "DEV-abc123" });
    expect(r.status).toBe(200);
  });

  it("license/validate rejects non-DEV keys with default verifier", async () => {
    const r = await handleLicenseValidate({ licenseKey: "fake-key" });
    expect(r.status).toBe(401);
  });

  it("license/validate produces an HMAC signature when a secret is supplied", async () => {
    const r = await handleLicenseValidate(
      { licenseKey: "DEV-x" },
      { secret: "shared-secret" },
    );
    expect(r.status).toBe(200);
    const body = r.body as { signature: string };
    // Falls back to "no-crypto" only if globalThis.crypto.subtle is missing,
    // which it is NOT in Node 20+. So we expect a real hex string.
    expect(body.signature).toMatch(/^[0-9a-f]+$/);
    expect(body.signature.length).toBe(64); // SHA-256 = 32 bytes = 64 hex chars
  });

  it("telemetry accepts known events and rejects unknown ones", () => {
    const ok = handleTelemetry({ event: "diff_completed", sessionId: "abc" });
    expect(ok.status).toBe(200);

    const bad = handleTelemetry({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      event: "send_document" as any,
      sessionId: "abc",
    });
    expect(bad.status).toBe(400);
  });

  it("telemetry rejects non-numeric counts", () => {
    const r = handleTelemetry({
      event: "diff_completed",
      sessionId: "abc",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      counts: { changes: "many" as any },
    });
    expect(r.status).toBe(400);
  });

  it("ocr returns a stub result", async () => {
    const r = await handleOcr({ pdfBase64: "AAA" });
    expect(r.status).toBe(200);
  });

  it("ocr rejects missing body", async () => {
    const r = await handleOcr({} as unknown as { pdfBase64: string });
    expect(r.status).toBe(400);
  });
});

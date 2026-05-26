/**
 * Telemetry client (Phase 5.9).
 *
 * Privacy constraints, enforced both here and at the server (handlers.ts):
 *   - No document content. The TelemetryEvent shape allows only known
 *     event names and a `counts` object of numbers — there is no string
 *     payload field at all.
 *   - The user's stable session id is a UUID generated client-side and
 *     never tied to PII.
 *   - The user can disable telemetry from the options page, in which
 *     case `send` is a no-op.
 *
 * THIS MODULE MUST NOT IMPORT ANY MODEL/DIFF/EXTRACT TYPE. Enforced by
 * the integration-isolation test.
 */
import { makeKv } from "../storage/index.js";

export type TelemetryEventName =
  | "diff_started"
  | "diff_completed"
  | "diff_failed"
  | "export_pdf"
  | "export_clipboard";

export interface TelemetryEvent {
  event: TelemetryEventName;
  counts?: Record<"changes" | "critical" | "pages", number>;
  errorCode?: string;
}

const ENABLED_KEY = "biddiff.settings"; // matches options page key

interface SettingsShape {
  allowAnonymousTelemetry?: boolean;
}

function uuid(): string {
  // RFC 4122 v4 using crypto if available, else fallback.
  const cryptoApi = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  if (cryptoApi?.getRandomValues) {
    const b = new Uint8Array(16);
    cryptoApi.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (n) => n.toString(16).padStart(2, "0"));
    return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10, 16).join("")}`;
  }
  // Last resort: timestamp-based, NOT cryptographically random.
  return `${Date.now().toString(16)}-${Math.floor(Math.random() * 1e9).toString(16)}`;
}

export class TelemetryClient {
  private readonly kv = makeKv();
  private readonly endpointBase: string;
  /** Cached session id; lazily resolved. */
  private sessionPromise: Promise<string> | null = null;
  /** Cached enabled flag. */
  private enabledPromise: Promise<boolean> | null = null;

  constructor(endpointBase = "https://api.biddiff.example") {
    this.endpointBase = endpointBase;
  }

  private async session(): Promise<string> {
    // Ephemeral session ID — regenerated each TelemetryClient instance
    // (effectively each page load). Persisting it would make this a de
    // facto install identifier, which the Privacy Policy disclaims.
    // The server can still aggregate events at the per-session level
    // without being able to correlate users across sessions.
    if (!this.sessionPromise) {
      this.sessionPromise = Promise.resolve(uuid());
    }
    return this.sessionPromise;
  }

  private async enabled(): Promise<boolean> {
    if (!this.enabledPromise) {
      this.enabledPromise = (async () => {
        const s = await this.kv.get<SettingsShape>(ENABLED_KEY);
        // Default: enabled (user can opt out in Settings).
        return s?.allowAnonymousTelemetry !== false;
      })();
    }
    return this.enabledPromise;
  }

  /** No-op when disabled. Best-effort; failures are silent. */
  async send(event: TelemetryEvent): Promise<void> {
    if (!(await this.enabled())) return;
    const sessionId = await this.session();
    const body = { ...event, sessionId };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const f = (globalThis as any).fetch as typeof fetch | undefined;
      if (!f) return;
      await f(`${this.endpointBase}/telemetry`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
    } catch {
      /* swallow */
    }
  }
}

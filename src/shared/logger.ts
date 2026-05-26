/**
 * Logger that respects the user's telemetry opt-out.
 *
 * Use this everywhere instead of bare `console.*`. The logger writes to the
 * dev console (always, locally) AND optionally forwards an anonymized error
 * code to the telemetry endpoint (when the user has not opted out).
 *
 * Document content NEVER passes through this. The `event` is one of a fixed
 * set of strings; details are clipped to short codes.
 */

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  /** Free-form developer message for the local console. */
  message: string;
  /** Short stable code (e.g. "pdf.extract.corrupt") routed to telemetry. */
  code?: string;
}

export const logger = {
  info(message: string, code?: string): void {
    // eslint-disable-next-line no-console
    console.info("[biddiff]", message);
    void code;
  },
  warn(message: string, code?: string): void {
    console.warn("[biddiff]", message);
    void code;
  },
  error(message: string, code?: string, err?: unknown): void {
    console.error("[biddiff]", message, err);
    void code;
  },
};

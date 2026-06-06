import type { BreakingChange, OapiChangeType, OapiRawChange, Severity } from "./types.js";

interface ClassifyRule {
  /** Return the Severity if this rule matches, or null to fall through. */
  matches: (c: OapiRawChange) => Severity | null;
  message: (c: OapiRawChange) => string;
}

const CLASSIFY_RULES: ClassifyRule[] = [
  // ─── Hard BREAKING ──────────────────────────────────────────────────────
  {
    matches: (c) => c.type === "endpoint-removed" ? "BREAKING" : null,
    message: (c) => `Endpoint removed: ${c.location}. All clients calling this endpoint will receive 404.`,
  },
  {
    matches: (c) => c.type === "parameter-removed" ? "BREAKING" : null,
    message: (c) => `Parameter removed: ${c.location}. Clients sending this parameter will have it silently ignored or may get 400.`,
  },
  {
    matches: (c) =>
      c.type === "parameter-required-changed" && c.before === false && c.after === true
        ? "BREAKING"
        : null,
    message: (c) => `Parameter became required: ${c.location}. Existing clients not sending this parameter will now receive 400.`,
  },
  {
    matches: (c) => c.type === "parameter-type-changed" ? "BREAKING" : null,
    message: (c) => `Parameter type changed: ${c.location} (${c.before} → ${c.after}). Clients sending the old type will fail validation.`,
  },
  {
    matches: (c) => c.type === "parameter-format-changed" ? "BREAKING" : null,
    message: (c) => `Parameter format changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). May break serialization/validation.`,
  },
  {
    matches: (c) => {
      if (c.type !== "parameter-enum-changed") return null;
      const before = c.before as unknown[] | undefined;
      const after = c.after as unknown[] | undefined;
      if (!before || !after) return "BREAKING";
      const added = after.filter((v) => !before.includes(v));
      const removed = before.filter((v) => !after.includes(v));
      if (removed.length > 0) return "BREAKING";
      if (added.length > 0) return "INFO";
      return null;
    },
    message: (c) => {
      const before = c.before as unknown[] | undefined;
      const after = c.after as unknown[] | undefined;
      if (!before || !after) return `Enum changed for ${c.location}: values may be removed.`;
      const removed = before.filter((v) => !after.includes(v));
      if (removed.length > 0) return `Enum values removed from ${c.location}: [${removed.join(", ")}] no longer accepted. Clients sending these values will fail validation.`;
      const added = after.filter((v) => !before.includes(v));
      return `Enum values added to ${c.location}: [${added.join(", ")}] are now accepted (non-breaking).`;
    },
  },
  {
    matches: (c) =>
      c.type === "request-body-required-changed" && c.before === false && c.after === true
        ? "BREAKING"
        : null,
    message: (c) => `Request body became required: ${c.location}. Clients omitting the body will now receive 400.`,
  },
  {
    matches: (c) => c.type === "request-schema-field-required-added" ? "BREAKING" : null,
    message: (c) => `Required field added to request body: ${c.location}. Clients not sending this field will now receive 400.`,
  },
  {
    matches: (c) => c.type === "request-schema-type-changed" ? "BREAKING" : null,
    message: (c) => `Request body field type changed: ${c.location} (${c.before} → ${c.after}). Clients sending the old type will fail validation.`,
  },
  {
    matches: (c) => c.type === "response-status-removed" ? "BREAKING" : null,
    message: (c) => `Response status code removed: ${c.location}. Clients expecting this status code will not handle the new response correctly.`,
  },
  {
    matches: (c) => c.type === "response-schema-field-required-removed" ? "BREAKING" : null,
    message: (c) => `Required response field removed: ${c.location}. Clients that depend on this field being present will break.`,
  },
  {
    matches: (c) => c.type === "response-schema-type-changed" ? "BREAKING" : null,
    message: (c) => `Response field type changed: ${c.location} (${c.before} → ${c.after}). Clients parsing this field with the old type will fail.`,
  },
  {
    matches: (c) =>
      c.type === "response-schema-nullable-changed" && c.before === true && c.after === false
        ? "BREAKING"
        : null,
    message: (c) => `Response field became non-nullable: ${c.location}. Clients handling null values will need to be updated.`,
  },

  {
    matches: (c) => c.type === "response-schema-property-type-changed" ? "BREAKING" : null,
    message: (c) => `Response property type changed: ${c.location} (${c.before} → ${c.after}). Clients parsing this property with the old type will fail.`,
  },
  {
    matches: (c) => c.type === "response-schema-property-removed" ? "BREAKING" : null,
    message: (c) => `Response property removed: ${c.location}. Clients that access this property will receive undefined/null.`,
  },
  {
    matches: (c) => c.type === "request-schema-property-type-changed" ? "BREAKING" : null,
    message: (c) => `Request body property type changed: ${c.location} (${c.before} → ${c.after}). Clients sending the old type will fail validation.`,
  },
  {
    matches: (c) => c.type === "request-schema-property-removed" ? "BREAKING" : null,
    message: (c) => `Request body property removed: ${c.location}. The server no longer accepts this property (silently ignored or rejected).`,
  },
  {
    matches: (c) => c.type === "response-schema-items-type-changed" ? "BREAKING" : null,
    message: (c) => `Response array element type changed: ${c.location} (${c.before} → ${c.after}). Clients iterating this array will receive the wrong element type.`,
  },
  {
    matches: (c) => c.type === "request-schema-items-type-changed" ? "BREAKING" : null,
    message: (c) => `Request body array element type changed: ${c.location} (${c.before} → ${c.after}). Clients sending the old element type will fail validation.`,
  },
  {
    matches: (c) => {
      if (c.type !== "request-schema-property-enum-changed") return null;
      const before = c.before as unknown[] | undefined;
      const after = c.after as unknown[] | undefined;
      if (!before || !after) return "BREAKING";
      const removed = before.filter((v) => !after.includes(v));
      if (removed.length > 0) return "BREAKING";
      return "INFO";
    },
    message: (c) => {
      const before = c.before as unknown[] | undefined;
      const after = c.after as unknown[] | undefined;
      if (!before || !after) return `Request property enum changed at ${c.location}: values may be removed.`;
      const removed = before.filter((v) => !after.includes(v));
      if (removed.length > 0) return `Request property enum values removed at ${c.location}: [${removed.join(", ")}] no longer accepted. Clients sending these values will fail validation.`;
      const added = after.filter((v) => !before.includes(v));
      return `Request property enum values added at ${c.location}: [${added.join(", ")}] are now accepted (non-breaking).`;
    },
  },
  {
    matches: (c) => {
      if (c.type !== "response-schema-property-enum-changed") return null;
      const before = c.before as unknown[] | undefined;
      const after = c.after as unknown[] | undefined;
      if (!before || !after) return "BREAKING";
      const added = after.filter((v) => !before.includes(v));
      if (added.length > 0) return "BREAKING";
      return "INFO";
    },
    message: (c) => {
      const before = c.before as unknown[] | undefined;
      const after = c.after as unknown[] | undefined;
      if (!before || !after) return `Response property enum changed at ${c.location}: values may be added.`;
      const added = after.filter((v) => !before.includes(v));
      if (added.length > 0) return `Response property enum values added at ${c.location}: [${added.join(", ")}]. Clients with exhaustive enum handling (e.g. switch statements without default) will break.`;
      const removed = before.filter((v) => !after.includes(v));
      return `Response property enum values removed at ${c.location}: [${removed.join(", ")}] no longer returned (non-breaking for clients).`;
    },
  },

  // ─── SAFE / INFO ────────────────────────────────────────────────────────
  {
    matches: (c) => c.type === "endpoint-added" ? "INFO" : null,
    message: (c) => `New endpoint added: ${c.location}. Existing clients are unaffected.`,
  },
  {
    matches: (c) => c.type === "response-schema-property-added" ? "INFO" : null,
    message: (c) => `New response property added: ${c.location}. Existing clients can ignore or use the new field.`,
  },
  {
    matches: (c) => c.type === "request-schema-property-added" ? "INFO" : null,
    message: (c) => `New request body property added: ${c.location}. Clients may optionally send this field.`,
  },
  {
    matches: (c) =>
      c.type === "parameter-added" ? "INFO" : null,
    message: (c) => {
      const param = c.after as { required?: boolean; name?: string; in?: string } | null;
      if (param?.required) {
        return `Required parameter added: ${c.location}. BREAKING: existing clients not sending this parameter will receive 400.`;
      }
      return `Optional parameter added: ${c.location}. Existing clients are unaffected.`;
    },
  },
  {
    matches: (c) =>
      c.type === "parameter-required-changed" && c.before === true && c.after === false
        ? "INFO"
        : null,
    message: (c) => `Parameter became optional: ${c.location}. Existing clients still sending it are unaffected.`,
  },
  {
    matches: (c) => c.type === "request-schema-field-required-removed" ? "INFO" : null,
    message: (c) => `Required request field is now optional: ${c.location}. Existing clients sending it are unaffected.`,
  },
  {
    matches: (c) => c.type === "response-status-added" ? "INFO" : null,
    message: (c) => `New response status code added: ${c.location}. Clients should handle this new status.`,
  },
  {
    matches: (c) => c.type === "response-schema-field-required-added" ? "INFO" : null,
    message: (c) => `Response now guarantees a required field: ${c.location}. Clients can now rely on this field being present.`,
  },
  {
    matches: (c) =>
      c.type === "response-schema-nullable-changed" && c.before === false && c.after === true
        ? "INFO"
        : null,
    message: (c) => `Response field can now be null: ${c.location}. Clients should handle null values for this field.`,
  },
  {
    matches: (c) => c.type === "operation-deprecated-changed" && c.after === true ? "INFO" : null,
    message: (c) => `Operation deprecated: ${c.location}. This endpoint is scheduled for removal; clients should migrate to a replacement.`,
  },
  {
    matches: (c) => c.type === "operation-deprecated-changed" && c.after === false ? "INFO" : null,
    message: (c) => `Operation un-deprecated: ${c.location}. This endpoint is no longer marked for removal.`,
  },
];

/**
 * Classify a raw diff as BREAKING, SAFE, or INFO.
 * Returns null if no rule matches (unknown change type — caller should treat as INFO).
 */
function classifyOne(change: OapiRawChange): BreakingChange | null {
  for (const rule of CLASSIFY_RULES) {
    const severity = rule.matches(change);
    if (severity !== null) {
      return {
        severity,
        type: change.type,
        path: change.path,
        method: change.method,
        location: change.location,
        message: rule.message(change),
        before: change.before,
        after: change.after,
      };
    }
  }
  return null;
}

/**
 * Special-case: a parameter-added change with required:true is BREAKING, not INFO.
 * This re-classifies the parameter-added rule.
 */
function adjustAddedRequiredParam(change: BreakingChange): BreakingChange {
  if (change.type !== "parameter-added") return change;
  const param = change.after as { required?: boolean } | null;
  if (param?.required) {
    return { ...change, severity: "BREAKING" };
  }
  return change;
}

/** Classify all raw diff changes, returning the full list of BreakingChange objects. */
export function classifyChanges(rawChanges: OapiRawChange[]): BreakingChange[] {
  const results: BreakingChange[] = [];
  for (const raw of rawChanges) {
    const classified = classifyOne(raw);
    if (classified) {
      results.push(adjustAddedRequiredParam(classified));
    } else {
      results.push({
        severity: "INFO",
        type: raw.type as OapiChangeType,
        path: raw.path,
        method: raw.method,
        location: raw.location,
        message: `Change detected at ${raw.location}: ${raw.type}`,
        before: raw.before,
        after: raw.after,
      });
    }
  }
  return results;
}

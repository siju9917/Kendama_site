import type { BreakingChange, OapiChangeType, OapiRawChange, Severity } from "./types.js";

interface ClassifyRule {
  /** Return the Severity if this rule matches, or null to fall through. */
  matches: (c: OapiRawChange) => Severity | null;
  message: (c: OapiRawChange) => string;
}

// ORDERING INVARIANT: Within each OapiChangeType, BREAKING rules must appear before INFO rules.
// For multi-condition types (e.g. response-schema-property-type-changed), the conditions are
// mutually exclusive (null vs non-null sentinels), so reordering CANNOT produce wrong severities
// today. However, the convention is enforced defensively: the completeness test in
// classify.test.ts verifies every OapiChangeType has at least one matching rule, and the
// Record<OapiChangeType,...> stub map causes a TypeScript compile error if a new type is added
// without updating the test — that is the primary guard against silent INFO fallback.
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
    matches: (c) =>
      c.type === "request-body-required-changed" && c.before === true && c.after === null
        ? "BREAKING"
        : null,
    message: (c) => `Required request body removed from spec: ${c.location}. The server contract no longer documents this body; clients sending it may be rejected.`,
  },
  {
    matches: (c) =>
      c.type === "request-body-required-changed" && c.before === true && c.after === false
        ? "INFO"
        : null,
    message: (c) => `Request body became optional: ${c.location}. Existing clients sending the body are unaffected; new clients may omit it.`,
  },
  {
    matches: (c) =>
      c.type === "request-body-required-changed" && c.before === false && c.after === null
        ? "INFO"
        : null,
    message: (c) => `Optional request body removed from spec: ${c.location}. Clients not sending the body are unaffected.`,
  },
  {
    matches: (c) => c.type === "request-schema-field-required-added" ? "BREAKING" : null,
    message: (c) => `Required field added to request body: ${c.location}. Clients not sending this field will now receive 400.`,
  },
  // request-schema-type-changed: direction-aware (mirrors request-schema-property-type-changed).
  // after !== null: type changed or added → BREAKING (server now validates a specific type).
  {
    matches: (c) => c.type === "request-schema-type-changed" && c.after !== null ? "BREAKING" : null,
    message: (c) => c.before === null
      ? `Request body type constraint added: ${c.location}. Server now requires type ${c.after}; clients sending other types will fail validation.`
      : `Request body field type changed: ${c.location} (${c.before} → ${c.after}). Clients sending the old type will fail validation.`,
  },
  // after === null: type removed → INFO (server no longer enforces type; existing clients still work).
  {
    matches: (c) => c.type === "request-schema-type-changed" && c.after === null ? "INFO" : null,
    message: (c) => `Request body type constraint removed: ${c.location}. Server no longer enforces a specific type (non-breaking for clients).`,
  },
  {
    matches: (c) => c.type === "response-status-removed" ? "BREAKING" : null,
    message: (c) => `Response status code removed: ${c.location}. Clients expecting this status code will not handle the new response correctly.`,
  },
  {
    matches: (c) => c.type === "response-schema-field-required-removed" ? "BREAKING" : null,
    message: (c) => `Required response field removed: ${c.location}. Clients that depend on this field being present will break.`,
  },
  // response-schema-type-changed: direction-aware (mirrors response-schema-property-type-changed).
  // before !== null: type changed or removed → BREAKING (clients relying on old type may break).
  {
    matches: (c) => c.type === "response-schema-type-changed" && c.before !== null ? "BREAKING" : null,
    message: (c) => c.after === null
      ? `Response body type constraint removed: ${c.location}. Server may now return any type; clients expecting ${c.before} will break.`
      : `Response field type changed: ${c.location} (${c.before} → ${c.after}). Clients parsing this field with the old type will fail.`,
  },
  // before === null: type added → INFO (server now guarantees type, clients benefit).
  {
    matches: (c) => c.type === "response-schema-type-changed" && c.before === null ? "INFO" : null,
    message: (c) => `Response body type added: ${c.location}. Server now guarantees type ${c.after} (previously unspecified).`,
  },
  {
    matches: (c) =>
      c.type === "response-schema-nullable-changed" && c.before === true && c.after === false
        ? "BREAKING"
        : null,
    message: (c) => `Response field became non-nullable: ${c.location}. Clients handling null values will need to be updated.`,
  },
  {
    matches: (c) =>
      c.type === "request-schema-nullable-changed" && c.before === true && c.after === false
        ? "BREAKING"
        : null,
    message: (c) => `Request body field became non-nullable: ${c.location}. Clients sending null for this field will now receive 400.`,
  },

  {
    matches: (c) =>
      c.type === "response-schema-property-type-changed" && c.before !== null && c.after !== null ? "BREAKING" : null,
    message: (c) => `Response property type changed: ${c.location} (${c.before} → ${c.after}). Clients parsing this property with the old type will fail.`,
  },
  {
    matches: (c) =>
      c.type === "response-schema-property-type-changed" && c.before !== null && c.after === null ? "BREAKING" : null,
    message: (c) => `Response property type constraint removed: ${c.location}. Property was ${c.before}; clients relying on this type will receive unspecified values.`,
  },
  {
    matches: (c) => c.type === "response-schema-property-removed" ? "BREAKING" : null,
    message: (c) => `Response property removed: ${c.location}. Clients that access this property will receive undefined/null.`,
  },
  {
    matches: (c) =>
      c.type === "request-schema-property-type-changed" && c.after !== null ? "BREAKING" : null,
    message: (c) => c.before === null
      ? `Request property type constraint added: ${c.location}. Server now enforces type ${c.after}; clients sending other types will fail validation.`
      : `Request body property type changed: ${c.location} (${c.before} → ${c.after}). Clients sending the old type will fail validation.`,
  },
  {
    matches: (c) => c.type === "request-schema-property-removed" ? "BREAKING" : null,
    message: (c) => `Request body property removed: ${c.location}. The server no longer accepts this property (silently ignored or rejected).`,
  },
  {
    matches: (c) => c.type === "response-schema-items-format-changed" ? "BREAKING" : null,
    message: (c) => `Response array element format changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Clients deserializing array elements with the old format may fail.`,
  },
  {
    matches: (c) => c.type === "request-schema-items-format-changed" ? "BREAKING" : null,
    message: (c) => `Request array element format changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Clients sending elements in the old format will fail validation.`,
  },
  {
    matches: (c) =>
      c.type === "response-schema-property-nullable-changed" && c.before === false && c.after === true
        ? "BREAKING"
        : null,
    message: (c) => `Response property became nullable: ${c.location}. Clients that assume this field is never null will break.`,
  },
  {
    matches: (c) =>
      c.type === "request-schema-property-nullable-changed" && c.before === true && c.after === false
        ? "BREAKING"
        : null,
    message: (c) => `Request property became non-nullable: ${c.location}. Clients that send null for this property will now receive 400.`,
  },
  {
    matches: (c) => {
      if (c.type !== "response-schema-items-enum-changed") return null;
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before || !after) return "BREAKING";
      const added = after.filter((v) => !before.includes(v));
      if (added.length > 0) return "BREAKING";
      return "INFO";
    },
    message: (c) => {
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before || !after) return `Response array items enum changed: ${c.location}.`;
      const added = after.filter((v) => !before.includes(v));
      if (added.length > 0) return `Response array items enum values added at ${c.location}: [${added.join(", ")}]. Clients with exhaustive enum handling will break.`;
      const removed = before.filter((v) => !after.includes(v));
      return `Response array items enum values removed at ${c.location}: [${removed.join(", ")}] no longer returned (non-breaking for clients).`;
    },
  },
  {
    matches: (c) => {
      if (c.type !== "request-schema-items-enum-changed") return null;
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before || !after) return "BREAKING";
      const removed = before.filter((v) => !after.includes(v));
      if (removed.length > 0) return "BREAKING";
      return "INFO";
    },
    message: (c) => {
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before || !after) return `Request array items enum changed: ${c.location}.`;
      const removed = before.filter((v) => !after.includes(v));
      if (removed.length > 0) return `Request array items enum values removed at ${c.location}: [${removed.join(", ")}] no longer accepted. Clients sending these values will fail validation.`;
      const added = after.filter((v) => !before.includes(v));
      return `Request array items enum values added at ${c.location}: [${added.join(", ")}] are now accepted (non-breaking).`;
    },
  },
  {
    matches: (c) =>
      c.type === "response-schema-items-nullable-changed" && c.before === false && c.after === true
        ? "BREAKING"
        : null,
    message: (c) => `Response array items became nullable: ${c.location}. Clients iterating this array will now receive null elements.`,
  },
  {
    matches: (c) =>
      c.type === "request-schema-items-nullable-changed" && c.before === true && c.after === false
        ? "BREAKING"
        : null,
    message: (c) => `Request array items became non-nullable: ${c.location}. Clients sending null elements in this array will now receive 400.`,
  },
  {
    matches: (c) => c.type === "response-schema-items-type-changed" && c.before !== null && c.after !== null ? "BREAKING" : null,
    message: (c) => `Response array element type changed: ${c.location} (${c.before} → ${c.after}). Clients iterating this array will receive the wrong element type.`,
  },
  {
    matches: (c) => c.type === "response-schema-items-type-changed" && c.before !== null && c.after === null ? "BREAKING" : null,
    message: (c) => `Response array items type constraint removed: ${c.location}. Clients that relied on elements being ${c.before} may now receive any type.`,
  },
  {
    matches: (c) => c.type === "request-schema-items-type-changed" && c.after !== null ? "BREAKING" : null,
    message: (c) => c.before === null
      ? `Request array items type constraint added: ${c.location}. Clients sending elements that are not ${c.after} will fail validation.`
      : `Request body array element type changed: ${c.location} (${c.before} → ${c.after}). Clients sending the old element type will fail validation.`,
  },
  {
    matches: (c) => c.type === "response-schema-property-format-changed" ? "BREAKING" : null,
    message: (c) => `Response property format changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Clients deserializing this field with the old format may fail.`,
  },
  {
    matches: (c) => c.type === "request-schema-property-format-changed" ? "BREAKING" : null,
    message: (c) => `Request property format changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Clients sending data in the old format will fail validation.`,
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

  // ─── Parameter nullable ───────────────────────────────────────────────────
  {
    matches: (c) =>
      c.type === "parameter-nullable-changed" && c.before === true && c.after === false
        ? "BREAKING"
        : null,
    message: (c) => `Parameter became non-nullable: ${c.location}. Clients sending null for this parameter will now receive 400.`,
  },
  {
    matches: (c) =>
      c.type === "parameter-nullable-changed" && c.before === false && c.after === true
        ? "INFO"
        : null,
    message: (c) => `Parameter became nullable: ${c.location}. Clients may optionally send null for this parameter.`,
  },

  // ─── Constraint changes (direction-aware) ────────────────────────────────
  {
    matches: (c) => {
      if (c.type !== "request-schema-property-constraint-changed") return null;
      const loc = String(c.location);
      const before = c.before as number | string | null;
      const after = c.after as number | string | null;
      if (loc.endsWith(".pattern")) return "BREAKING";
      if (loc.endsWith(".minimum") || loc.endsWith(".minLength") || loc.endsWith(".minItems")) {
        if (after === null) return "INFO";
        if (before === null) return "BREAKING";
        return typeof after === "number" && typeof before === "number" && after > before ? "BREAKING" : "INFO";
      }
      if (loc.endsWith(".maximum") || loc.endsWith(".maxLength") || loc.endsWith(".maxItems")) {
        if (after === null) return "INFO";
        if (before === null) return "BREAKING";
        return typeof after === "number" && typeof before === "number" && after < before ? "BREAKING" : "INFO";
      }
      return "INFO";
    },
    message: (c) => {
      const loc = String(c.location);
      const constraintName = loc.split(".").pop() ?? loc;
      if (loc.endsWith(".pattern")) {
        return `Request property pattern constraint changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Clients sending values matching the old pattern may fail validation.`;
      }
      if (c.after === null) {
        return `Request property constraint removed: ${c.location}. The ${constraintName} restriction is no longer enforced (non-breaking for clients).`;
      }
      if (c.before === null) {
        return `Request property constraint added: ${c.location}. Server now enforces ${constraintName} = ${c.after}; clients sending out-of-range values will fail validation.`;
      }
      const bNum = c.before as number;
      const aNum = c.after as number;
      const tightened =
        loc.endsWith(".minimum") || loc.endsWith(".minLength") || loc.endsWith(".minItems")
          ? aNum > bNum
          : aNum < bNum;
      return tightened
        ? `Request property constraint tightened: ${c.location} (${c.before} → ${c.after}). Clients sending values that were previously valid may now fail validation.`
        : `Request property constraint loosened: ${c.location} (${c.before} → ${c.after}). More values are now accepted (non-breaking for clients).`;
    },
  },
  {
    matches: (c) => {
      if (c.type !== "response-schema-property-constraint-changed") return null;
      const loc = String(c.location);
      const before = c.before as number | string | null;
      const after = c.after as number | string | null;
      if (loc.endsWith(".pattern")) return "BREAKING";
      if (loc.endsWith(".minimum") || loc.endsWith(".minLength") || loc.endsWith(".minItems")) {
        if (after === null) return "BREAKING";
        if (before === null) return "INFO";
        return typeof after === "number" && typeof before === "number" && after < before ? "BREAKING" : "INFO";
      }
      if (loc.endsWith(".maximum") || loc.endsWith(".maxLength") || loc.endsWith(".maxItems")) {
        if (after === null) return "BREAKING";
        if (before === null) return "INFO";
        return typeof after === "number" && typeof before === "number" && after > before ? "BREAKING" : "INFO";
      }
      return "INFO";
    },
    message: (c) => {
      const loc = String(c.location);
      const constraintName = loc.split(".").pop() ?? loc;
      if (loc.endsWith(".pattern")) {
        return `Response property pattern constraint changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Server may now return values not matching the old pattern; clients validating this pattern will break.`;
      }
      if (c.after === null) {
        return `Response property constraint removed: ${c.location}. The ${constraintName} restriction is no longer enforced; server may now return values outside the former constraint. Clients relying on this constraint will break.`;
      }
      if (c.before === null) {
        return `Response property constraint added: ${c.location}. Server now guarantees ${constraintName} = ${c.after} (non-breaking for clients).`;
      }
      const bNum = c.before as number;
      const aNum = c.after as number;
      const loosened =
        loc.endsWith(".minimum") || loc.endsWith(".minLength") || loc.endsWith(".minItems")
          ? aNum < bNum
          : aNum > bNum;
      return loosened
        ? `Response property constraint loosened: ${c.location} (${c.before} → ${c.after}). Server may now return values outside the former constraint. Clients relying on it will break.`
        : `Response property constraint tightened: ${c.location} (${c.before} → ${c.after}). Server now guarantees stricter values (non-breaking for clients).`;
    },
  },

  {
    matches: (c) => {
      if (c.type !== "parameter-constraint-changed") return null;
      const loc = String(c.location);
      const before = c.before as number | string | null;
      const after = c.after as number | string | null;
      if (loc.endsWith(".pattern")) return "BREAKING";
      if (loc.endsWith(".minimum") || loc.endsWith(".minLength") || loc.endsWith(".minItems")) {
        if (after === null) return "INFO";
        if (before === null) return "BREAKING";
        return typeof after === "number" && typeof before === "number" && after > before ? "BREAKING" : "INFO";
      }
      if (loc.endsWith(".maximum") || loc.endsWith(".maxLength") || loc.endsWith(".maxItems")) {
        if (after === null) return "INFO";
        if (before === null) return "BREAKING";
        return typeof after === "number" && typeof before === "number" && after < before ? "BREAKING" : "INFO";
      }
      return "INFO";
    },
    message: (c) => {
      const loc = String(c.location);
      const constraintName = loc.split(".").pop() ?? loc;
      if (loc.endsWith(".pattern")) {
        return `Parameter pattern constraint changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Clients sending values matching the old pattern may fail validation.`;
      }
      if (c.after === null) {
        return `Parameter constraint removed: ${c.location}. The ${constraintName} restriction is no longer enforced (non-breaking for clients).`;
      }
      if (c.before === null) {
        return `Parameter constraint added: ${c.location}. Server now enforces ${constraintName} = ${c.after}; clients sending out-of-range values will fail validation.`;
      }
      const bNum = c.before as number;
      const aNum = c.after as number;
      const tightened =
        loc.endsWith(".minimum") || loc.endsWith(".minLength") || loc.endsWith(".minItems")
          ? aNum > bNum
          : aNum < bNum;
      return tightened
        ? `Parameter constraint tightened: ${c.location} (${c.before} → ${c.after}). Clients sending values that were previously valid may now fail validation.`
        : `Parameter constraint loosened: ${c.location} (${c.before} → ${c.after}). More values are now accepted (non-breaking for clients).`;
    },
  },
  {
    matches: (c) => {
      if (c.type !== "request-schema-items-constraint-changed") return null;
      const loc = String(c.location);
      const before = c.before as number | string | null;
      const after = c.after as number | string | null;
      if (loc.endsWith(".pattern")) return "BREAKING";
      if (loc.endsWith(".minimum") || loc.endsWith(".minLength") || loc.endsWith(".minItems")) {
        if (after === null) return "INFO";
        if (before === null) return "BREAKING";
        return typeof after === "number" && typeof before === "number" && after > before ? "BREAKING" : "INFO";
      }
      if (loc.endsWith(".maximum") || loc.endsWith(".maxLength") || loc.endsWith(".maxItems")) {
        if (after === null) return "INFO";
        if (before === null) return "BREAKING";
        return typeof after === "number" && typeof before === "number" && after < before ? "BREAKING" : "INFO";
      }
      return "INFO";
    },
    message: (c) => {
      const loc = String(c.location);
      const constraintName = loc.split(".").pop() ?? loc;
      if (loc.endsWith(".pattern")) {
        return `Request array items pattern constraint changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Clients sending values matching the old pattern may fail validation.`;
      }
      if (c.after === null) {
        return `Request array items constraint removed: ${c.location}. The ${constraintName} restriction is no longer enforced (non-breaking for clients).`;
      }
      if (c.before === null) {
        return `Request array items constraint added: ${c.location}. Server now enforces ${constraintName} = ${c.after}; clients sending out-of-range element values will fail validation.`;
      }
      const bNum = c.before as number;
      const aNum = c.after as number;
      const tightened =
        loc.endsWith(".minimum") || loc.endsWith(".minLength") || loc.endsWith(".minItems")
          ? aNum > bNum
          : aNum < bNum;
      return tightened
        ? `Request array items constraint tightened: ${c.location} (${c.before} → ${c.after}). Clients sending element values that were previously valid may now fail validation.`
        : `Request array items constraint loosened: ${c.location} (${c.before} → ${c.after}). More element values are now accepted (non-breaking for clients).`;
    },
  },
  {
    matches: (c) => {
      if (c.type !== "response-schema-items-constraint-changed") return null;
      const loc = String(c.location);
      const before = c.before as number | string | null;
      const after = c.after as number | string | null;
      if (loc.endsWith(".pattern")) return "BREAKING";
      if (loc.endsWith(".minimum") || loc.endsWith(".minLength") || loc.endsWith(".minItems")) {
        if (after === null) return "BREAKING";
        if (before === null) return "INFO";
        return typeof after === "number" && typeof before === "number" && after < before ? "BREAKING" : "INFO";
      }
      if (loc.endsWith(".maximum") || loc.endsWith(".maxLength") || loc.endsWith(".maxItems")) {
        if (after === null) return "BREAKING";
        if (before === null) return "INFO";
        return typeof after === "number" && typeof before === "number" && after > before ? "BREAKING" : "INFO";
      }
      return "INFO";
    },
    message: (c) => {
      const loc = String(c.location);
      const constraintName = loc.split(".").pop() ?? loc;
      if (loc.endsWith(".pattern")) {
        return `Response array items pattern constraint changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Server may now return element values not matching the old pattern; clients validating this pattern will break.`;
      }
      if (c.after === null) {
        return `Response array items constraint removed: ${c.location}. The ${constraintName} restriction is no longer enforced; server may now return element values outside the former constraint. Clients relying on this constraint will break.`;
      }
      if (c.before === null) {
        return `Response array items constraint added: ${c.location}. Server now guarantees ${constraintName} = ${c.after} for each element (non-breaking for clients).`;
      }
      const bNum = c.before as number;
      const aNum = c.after as number;
      const loosened =
        loc.endsWith(".minimum") || loc.endsWith(".minLength") || loc.endsWith(".minItems")
          ? aNum < bNum
          : aNum > bNum;
      return loosened
        ? `Response array items constraint loosened: ${c.location} (${c.before} → ${c.after}). Server may now return element values outside the former constraint. Clients relying on it will break.`
        : `Response array items constraint tightened: ${c.location} (${c.before} → ${c.after}). Server now guarantees stricter element values (non-breaking for clients).`;
    },
  },

  // ─── BREAKING for writeOnly/readOnly semantic changes ────────────────────
  {
    matches: (c) =>
      c.type === "response-schema-property-writeonly-changed" && c.before === false && c.after === true
        ? "BREAKING"
        : null,
    message: (c) => `Response property became write-only: ${c.location}. Clients that read this field will no longer receive it in responses.`,
  },
  {
    matches: (c) =>
      c.type === "request-schema-property-readonly-changed" && c.before === false && c.after === true
        ? "BREAKING"
        : null,
    message: (c) => `Request property became read-only: ${c.location}. Clients that send this property will now receive a 400 or have it ignored.`,
  },

  // ─── INFO for property/items nullable direction changes ──────────────────
  {
    matches: (c) =>
      c.type === "response-schema-property-nullable-changed" && c.before === true && c.after === false
        ? "INFO"
        : null,
    message: (c) => `Response property became non-nullable: ${c.location}. Server guarantees this field is never null.`,
  },
  {
    matches: (c) =>
      c.type === "request-schema-property-nullable-changed" && c.before === false && c.after === true
        ? "INFO"
        : null,
    message: (c) => `Request property became nullable: ${c.location}. Clients may optionally send null for this property.`,
  },
  {
    matches: (c) =>
      c.type === "response-schema-items-nullable-changed" && c.before === true && c.after === false
        ? "INFO"
        : null,
    message: (c) => `Response array items became non-nullable: ${c.location}. Server guarantees array elements are never null.`,
  },
  {
    matches: (c) =>
      c.type === "request-schema-items-nullable-changed" && c.before === false && c.after === true
        ? "INFO"
        : null,
    message: (c) => `Request array items became nullable: ${c.location}. Clients may optionally send null elements in this array.`,
  },
  {
    matches: (c) =>
      c.type === "response-schema-property-readonly-changed" ? "INFO" : null,
    message: (c) => c.after === true
      ? `Response property became read-only: ${c.location}. Clients still receive this field but the server signals it cannot be written.`
      : `Response property is no longer read-only: ${c.location}. This field may now be accepted in request bodies.`,
  },
  {
    matches: (c) =>
      c.type === "response-schema-property-writeonly-changed" && c.before === true && c.after === false
        ? "INFO"
        : null,
    message: (c) => `Response property is no longer write-only: ${c.location}. This field will now appear in response bodies.`,
  },
  {
    matches: (c) =>
      c.type === "request-schema-property-readonly-changed" && c.before === true && c.after === false
        ? "INFO"
        : null,
    message: (c) => `Request property is no longer read-only: ${c.location}. Clients may now send this property in requests.`,
  },
  {
    matches: (c) =>
      c.type === "request-schema-property-writeonly-changed" ? "INFO" : null,
    message: (c) => c.after === true
      ? `Request property became write-only: ${c.location}. This property is now accepted in requests but will not appear in responses.`
      : `Request property is no longer write-only: ${c.location}. This property may now appear in response bodies.`,
  },

  // ─── INFO for property type direction changes ────────────────────────────
  {
    matches: (c) =>
      c.type === "response-schema-property-type-changed" && c.before === null ? "INFO" : null,
    message: (c) => `Response property type added: ${c.location}. Server now specifies type ${c.after} for this property (previously unspecified).`,
  },
  {
    matches: (c) =>
      c.type === "request-schema-property-type-changed" && c.after === null ? "INFO" : null,
    message: (c) => `Request property type constraint removed: ${c.location}. Server now accepts any type for this property (non-breaking for clients).`,
  },

  // ─── INFO for items direction changes ────────────────────────────────────
  {
    matches: (c) => c.type === "response-schema-items-type-changed" && c.before === null ? "INFO" : null,
    message: (c) => `Response array items type added: ${c.location}. Server now guarantees elements are ${c.after} (previously unspecified).`,
  },
  {
    matches: (c) => c.type === "request-schema-items-type-changed" && c.after === null ? "INFO" : null,
    message: (c) => `Request array items type constraint removed: ${c.location}. Server now accepts any element type (non-breaking for clients).`,
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
    matches: (c) =>
      c.type === "request-schema-nullable-changed" && c.before === false && c.after === true
        ? "INFO"
        : null,
    message: (c) => `Request body field can now be null: ${c.location}. Clients may optionally send null for this field.`,
  },
  {
    matches: (c) => c.type === "operation-deprecated-changed" && c.after === true ? "INFO" : null,
    message: (c) => `Operation deprecated: ${c.location}. This endpoint is scheduled for removal; clients should migrate to a replacement.`,
  },
  {
    matches: (c) => c.type === "operation-deprecated-changed" && c.after === false ? "INFO" : null,
    message: (c) => `Operation un-deprecated: ${c.location}. This endpoint is no longer marked for removal.`,
  },
  {
    matches: (c) => c.type === "parameter-deprecated-changed" && c.after === true ? "INFO" : null,
    message: (c) => `Parameter deprecated: ${c.location}. Clients should stop using this parameter; it is scheduled for removal.`,
  },
  {
    matches: (c) => c.type === "parameter-deprecated-changed" && c.after === false ? "INFO" : null,
    message: (c) => `Parameter un-deprecated: ${c.location}. This parameter is no longer marked for removal.`,
  },

  // ─── Parameter items (array parameter element schema) ─────────────────────
  {
    matches: (c) => c.type === "parameter-items-type-changed" ? "BREAKING" : null,
    message: (c) => `Parameter array element type changed: ${c.location} (${c.before ?? "unspecified"} → ${c.after ?? "unspecified"}). Clients sending arrays with the old element type will fail validation.`,
  },
  {
    matches: (c) => c.type === "parameter-items-format-changed" ? "BREAKING" : null,
    message: (c) => `Parameter array element format changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Clients sending elements in the old format may fail validation.`,
  },
  {
    matches: (c) => {
      if (c.type !== "parameter-items-enum-changed") return null;
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before || !after) return "BREAKING"; // enum added or removed entirely
      // Request: values removed = BREAKING (clients sending now-invalid values will fail).
      const removed = before.filter((v) => !after.includes(v));
      return removed.length > 0 ? "BREAKING" : "INFO";
    },
    message: (c) => {
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before) return `Parameter array element enum added: ${c.location}. Elements must now be one of [${(after ?? []).join(", ")}].`;
      if (!after) return `Parameter array element enum removed: ${c.location}. Enum restriction no longer enforced on array elements.`;
      const removed = before.filter((v) => !after.includes(v));
      return removed.length > 0
        ? `Parameter array element enum values removed: ${c.location}. Removed: [${removed.join(", ")}]. Clients sending these values will receive 422.`
        : `Parameter array element enum values added: ${c.location}. New accepted values: [${after.filter((v) => !before.includes(v)).join(", ")}].`;
    },
  },
  {
    matches: (c) =>
      c.type === "parameter-items-nullable-changed" && c.before === true && c.after === false
        ? "BREAKING" : null,
    message: (c) => `Parameter array element became non-nullable: ${c.location}. Clients sending null elements will now receive 400.`,
  },
  {
    matches: (c) =>
      c.type === "parameter-items-nullable-changed" && c.before === false && c.after === true
        ? "INFO" : null,
    message: (c) => `Parameter array element became nullable: ${c.location}. Clients may now send null elements.`,
  },
  {
    matches: (c) => {
      if (c.type !== "parameter-items-constraint-changed") return null;
      const loc = String(c.location);
      const before = c.before as number | string | null;
      const after = c.after as number | string | null;
      if (loc.endsWith(".pattern")) return "BREAKING";
      if (loc.endsWith(".minimum") || loc.endsWith(".minLength") || loc.endsWith(".minItems")) {
        if (after === null) return "INFO";
        if (before === null) return "BREAKING";
        return typeof after === "number" && typeof before === "number" && after > before ? "BREAKING" : "INFO";
      }
      if (loc.endsWith(".maximum") || loc.endsWith(".maxLength") || loc.endsWith(".maxItems")) {
        if (after === null) return "INFO";
        if (before === null) return "BREAKING";
        return typeof after === "number" && typeof before === "number" && after < before ? "BREAKING" : "INFO";
      }
      return "INFO";
    },
    message: (c) => {
      const loc = String(c.location);
      const constraintName = loc.split(".").pop() ?? loc;
      if (loc.endsWith(".pattern")) {
        return `Parameter array element pattern changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Clients sending elements matching the old pattern may now fail validation.`;
      }
      if (c.after === null) return `Parameter array element constraint removed: ${c.location}. The ${constraintName} restriction on array elements is no longer enforced.`;
      if (c.before === null) return `Parameter array element constraint added: ${c.location}. Elements must now satisfy ${constraintName} = ${c.after}.`;
      const bNum = c.before as number;
      const aNum = c.after as number;
      const tightened =
        loc.endsWith(".minimum") || loc.endsWith(".minLength") || loc.endsWith(".minItems")
          ? aNum > bNum : aNum < bNum;
      return tightened
        ? `Parameter array element constraint tightened: ${c.location} (${c.before} → ${c.after}). Clients sending elements that were previously valid may now fail validation.`
        : `Parameter array element constraint loosened: ${c.location} (${c.before} → ${c.after}). More element values are now accepted.`;
    },
  },

  // ─── Items readOnly / writeOnly (direction-aware, mirrors property rules) ───
  // Response items readOnly: INFO in both directions (annotation-only; doesn't change payload).
  {
    matches: (c) => c.type === "response-schema-items-readonly-changed" ? "INFO" : null,
    message: (c) => c.after === true
      ? `Response array items became read-only: ${c.location}. Server signals these elements are not writable.`
      : `Response array items are no longer read-only: ${c.location}. Elements may now be writable.`,
  },
  // Request items readOnly false→true: BREAKING (clients can no longer send these items).
  {
    matches: (c) =>
      c.type === "request-schema-items-readonly-changed" && c.before === false && c.after === true
        ? "BREAKING"
        : null,
    message: (c) => `Request array items became read-only: ${c.location}. Clients that send these items will now receive a 400 or have them ignored.`,
  },
  {
    matches: (c) =>
      c.type === "request-schema-items-readonly-changed" && c.before === true && c.after === false
        ? "INFO"
        : null,
    message: (c) => `Request array items are no longer read-only: ${c.location}. Clients may now send these items.`,
  },
  // Response items writeOnly false→true: BREAKING (items disappear from responses).
  {
    matches: (c) =>
      c.type === "response-schema-items-writeonly-changed" && c.before === false && c.after === true
        ? "BREAKING"
        : null,
    message: (c) => `Response array items became write-only: ${c.location}. Clients that read these items will no longer receive them in responses.`,
  },
  {
    matches: (c) =>
      c.type === "response-schema-items-writeonly-changed" && c.before === true && c.after === false
        ? "INFO"
        : null,
    message: (c) => `Response array items are no longer write-only: ${c.location}. These items will now appear in responses.`,
  },
  // Request items writeOnly: INFO in both directions.
  {
    matches: (c) => c.type === "request-schema-items-writeonly-changed" ? "INFO" : null,
    message: (c) => c.after === true
      ? `Request array items became write-only: ${c.location}. These items are accepted in requests but will not appear in responses.`
      : `Request array items are no longer write-only: ${c.location}. These items may now appear in responses.`,
  },

  // ─── Top-level body schema format ─────────────────────────────────────────
  {
    matches: (c) => c.type === "request-schema-format-changed" ? "BREAKING" : null,
    message: (c) => `Request body schema format changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Clients sending data in the old format may fail validation.`,
  },
  {
    matches: (c) => c.type === "response-schema-format-changed" ? "BREAKING" : null,
    message: (c) => `Response body schema format changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Clients parsing the response with the old format assumptions will break.`,
  },

  // ─── Top-level body schema enum ───────────────────────────────────────────
  {
    matches: (c) => {
      if (c.type !== "request-schema-enum-changed") return null;
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before || !after) return "BREAKING"; // enum added or removed entirely
      // Values removed from request enum = BREAKING (previously-valid values now rejected).
      const removed = before.filter((v) => !after.includes(v));
      return removed.length > 0 ? "BREAKING" : "INFO";
    },
    message: (c) => {
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before) return `Request body schema enum added: ${c.location}. Server now restricts accepted values to [${(after ?? []).join(", ")}].`;
      if (!after) return `Request body schema enum removed: ${c.location}. Server no longer enforces enum restriction on this value.`;
      const removed = before.filter((v) => !after.includes(v));
      return removed.length > 0
        ? `Request body schema enum values removed: ${c.location}. Removed: [${removed.join(", ")}]. Clients sending these values will now receive 422.`
        : `Request body schema enum values added: ${c.location}. New accepted values: [${after.filter((v) => !before.includes(v)).join(", ")}].`;
    },
  },
  {
    matches: (c) => {
      if (c.type !== "response-schema-enum-changed") return null;
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before || !after) return "BREAKING"; // enum added or removed entirely
      // Values added to response enum = BREAKING (clients expecting exhaustive enums break).
      const added = (after ?? []).filter((v) => !before.includes(v));
      return added.length > 0 ? "BREAKING" : "INFO";
    },
    message: (c) => {
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before) return `Response body schema enum added: ${c.location}. Server now constrains this value to [${(after ?? []).join(", ")}].`;
      if (!after) return `Response body schema enum removed: ${c.location}. Server no longer guarantees a restricted set for this value.`;
      const added = (after ?? []).filter((v) => !(before ?? []).includes(v));
      return added.length > 0
        ? `Response body schema enum values added: ${c.location}. New values: [${added.join(", ")}]. Exhaustive clients will not handle these values.`
        : `Response body schema enum values removed: ${c.location}. Removed: [${(before ?? []).filter((v) => !(after ?? []).includes(v)).join(", ")}].`;
    },
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

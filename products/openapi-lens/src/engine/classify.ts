import type { BreakingChange, OapiChangeType, OapiRawChange, Severity } from "./types.js";

// ─── Constraint direction helpers ─────────────────────────────────────────────
// Single source of truth for which constraint field names are "min-sense"
// (higher value = tighter) vs "max-sense" (lower value = tighter).
// Adding a new constraint field requires updating only these Sets, not all 6 classify rules.
const MIN_SENSE_FIELDS = new Set(["minimum", "minLength", "minItems", "minProperties"]);
const MAX_SENSE_FIELDS = new Set(["maximum", "maxLength", "maxItems", "maxProperties"]);

type ConstraintKind = "min-sense" | "max-sense" | "pattern" | "other";

function constraintKind(loc: string): ConstraintKind {
  const field = loc.split(".").pop() ?? "";
  if (field === "pattern") return "pattern";
  if (MIN_SENSE_FIELDS.has(field)) return "min-sense";
  if (MAX_SENSE_FIELDS.has(field)) return "max-sense";
  return "other";
}

/** Returns BREAKING if tightening a REQUEST constraint (min increased, max decreased, pattern added/changed). */
function requestConstraintSeverity(loc: string, before: number | string | null, after: number | string | null): Severity {
  const kind = constraintKind(loc);
  if (kind === "pattern") return after === null ? "INFO" : "BREAKING";
  if (kind === "min-sense") {
    if (after === null) return "INFO";
    if (before === null) return "BREAKING";
    return typeof after === "number" && typeof before === "number" && after > before ? "BREAKING" : "INFO";
  }
  if (kind === "max-sense") {
    if (after === null) return "INFO";
    if (before === null) return "BREAKING";
    return typeof after === "number" && typeof before === "number" && after < before ? "BREAKING" : "INFO";
  }
  return "INFO";
}

/** Returns BREAKING if loosening a RESPONSE constraint (min decreased, max increased, pattern removed/changed). */
function responseConstraintSeverity(loc: string, before: number | string | null, after: number | string | null): Severity {
  const kind = constraintKind(loc);
  if (kind === "pattern") return before === null ? "INFO" : "BREAKING";
  if (kind === "min-sense") {
    if (after === null) return "BREAKING";
    if (before === null) return "INFO";
    return typeof after === "number" && typeof before === "number" && after < before ? "BREAKING" : "INFO";
  }
  if (kind === "max-sense") {
    if (after === null) return "BREAKING";
    if (before === null) return "INFO";
    return typeof after === "number" && typeof before === "number" && after > before ? "BREAKING" : "INFO";
  }
  return "INFO";
}

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
  // parameter-type-changed: direction-aware.
  // after truthy: type added or changed → BREAKING. after null/undefined: type removed → INFO (less restrictive).
  {
    matches: (c) => c.type === "parameter-type-changed" && c.after !== null && c.after !== undefined ? "BREAKING" : null,
    message: (c) => c.before === null || c.before === undefined
      ? `Parameter type constraint added: ${c.location}. Server now requires type ${c.after}; clients sending other types will fail validation.`
      : `Parameter type changed: ${c.location} (${c.before} → ${c.after}). Clients sending the old type will fail validation.`,
  },
  {
    matches: (c) => c.type === "parameter-type-changed" && (c.after === null || c.after === undefined) ? "INFO" : null,
    message: (c) => `Parameter type constraint removed: ${c.location}. Server no longer enforces a specific type (non-breaking for existing clients).`,
  },
  // parameter-format-changed: direction-aware.
  // after truthy: format added or changed → BREAKING. after null/undefined: format removed → INFO (less restrictive).
  {
    matches: (c) => c.type === "parameter-format-changed" && c.after !== null && c.after !== undefined ? "BREAKING" : null,
    message: (c) => c.before === null || c.before === undefined
      ? `Parameter format constraint added: ${c.location}. Server now enforces format '${c.after}'; clients sending other formats will fail validation.`
      : `Parameter format changed: ${c.location} (${c.before} → ${c.after}). Clients sending data in the old format may fail validation.`,
  },
  {
    matches: (c) => c.type === "parameter-format-changed" && (c.after === null || c.after === undefined) ? "INFO" : null,
    message: (c) => `Parameter format constraint removed: ${c.location}. Server no longer enforces '${c.before}' format (non-breaking for existing clients).`,
  },
  {
    matches: (c) => {
      if (c.type !== "parameter-enum-changed") return null;
      const before = c.before as unknown[] | undefined;
      const after = c.after as unknown[] | undefined;
      if (!before && after) return "BREAKING"; // enum added = new constraint
      if (before && !after) return "INFO"; // enum removed = constraint relaxed
      if (!before || !after) return "BREAKING"; // null-null edge
      const added = after.filter((v) => !before.includes(v));
      const removed = before.filter((v) => !after.includes(v));
      if (removed.length > 0) return "BREAKING";
      if (added.length > 0) return "INFO";
      return null;
    },
    message: (c) => {
      const before = c.before as unknown[] | undefined;
      const after = c.after as unknown[] | undefined;
      if (!before && after) return `Parameter enum added: ${c.location}. Server now restricts accepted values to [${after.join(", ")}]. Clients sending other values will fail validation.`;
      if (before && !after) return `Parameter enum removed: ${c.location}. Server no longer enforces enum restriction; any value is now accepted (non-breaking for existing clients).`;
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
    matches: (c) => c.type === "response-schema-items-format-changed" && c.before !== null ? "BREAKING" : null,
    message: (c) => `Response array element format changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Clients deserializing array elements with the old format may fail.`,
  },
  {
    matches: (c) => c.type === "response-schema-items-format-changed" && c.before === null && c.after !== null ? "INFO" : null,
    message: (c) => `Response array items format constraint added: ${c.location}. Server now guarantees elements use format '${c.after}' (non-breaking for clients).`,
  },
  // request-schema-items-format-changed: direction-aware.
  // after truthy: format added or changed → BREAKING. after null: format removed → INFO (less restrictive).
  {
    matches: (c) => c.type === "request-schema-items-format-changed" && c.after !== null ? "BREAKING" : null,
    message: (c) => c.before === null
      ? `Request array items format constraint added: ${c.location}. Elements must now use format '${c.after}'; clients sending other formats will fail validation.`
      : `Request array element format changed: ${c.location} (${c.before} → ${c.after}). Clients sending elements in the old format will fail validation.`,
  },
  {
    matches: (c) => c.type === "request-schema-items-format-changed" && c.after === null ? "INFO" : null,
    message: (c) => `Request array items format constraint removed: ${c.location}. Server no longer enforces '${c.before}' format on elements (non-breaking for existing clients).`,
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
      // Enum added to previously unconstrained items: server now promises only these values (INFO, not BREAKING).
      if (!before && after) return "INFO";
      // Enum removed from response items: server no longer restricts element values; exhaustive clients break.
      if (before && !after) return "BREAKING";
      // Null-null edge (shouldn't fire due to diff guard, but defend): BREAKING.
      if (!before || !after) return "BREAKING";
      const added = after.filter((v) => !before.includes(v));
      if (added.length > 0) return "BREAKING";
      return "INFO";
    },
    message: (c) => {
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before && after) return `Response array items enum added: ${c.location}. Server now guarantees elements are one of [${(after as unknown[]).join(", ")}] (non-breaking for clients).`;
      if (before && !after) return `Response array items enum constraint removed: ${c.location}. Server may now return elements with any value; clients with exhaustive enum handling will break.`;
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
      if (!before && after) return "BREAKING"; // enum added to request items = new constraint
      if (before && !after) return "INFO"; // enum removed from request items = constraint relaxed
      if (!before || !after) return "BREAKING"; // null-null edge
      const removed = before.filter((v) => !after.includes(v));
      if (removed.length > 0) return "BREAKING";
      return "INFO";
    },
    message: (c) => {
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before && after) return `Request array items enum added at ${c.location}: elements must now be one of [${after.join(", ")}]. Clients sending other element values will fail validation.`;
      if (before && !after) return `Request array items enum removed at ${c.location}. Server no longer restricts element values (non-breaking for existing clients).`;
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
    matches: (c) => c.type === "response-schema-items-type-changed" && c.before === null && c.after !== null ? "INFO" : null,
    message: (c) => `Response array items type constraint added: ${c.location}. Server now guarantees elements are of type '${c.after}' (non-breaking for clients).`,
  },
  {
    matches: (c) => c.type === "request-schema-items-type-changed" && c.after !== null ? "BREAKING" : null,
    message: (c) => c.before === null
      ? `Request array items type constraint added: ${c.location}. Clients sending elements that are not ${c.after} will fail validation.`
      : `Request body array element type changed: ${c.location} (${c.before} → ${c.after}). Clients sending the old element type will fail validation.`,
  },
  {
    matches: (c) => c.type === "request-schema-items-type-changed" && c.after === null ? "INFO" : null,
    message: (c) => `Request array items type constraint removed: ${c.location}. Server now accepts array elements of any type (previously required '${c.before}').`,
  },
  {
    matches: (c) => c.type === "response-schema-property-format-changed" && c.before !== null ? "BREAKING" : null,
    message: (c) => `Response property format changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Clients deserializing this field with the old format may fail.`,
  },
  {
    matches: (c) => c.type === "response-schema-property-format-changed" && c.before === null && c.after !== null ? "INFO" : null,
    message: (c) => `Response property format constraint added: ${c.location}. Server now guarantees this field uses format '${c.after}' (non-breaking for clients).`,
  },
  // request-schema-property-format-changed: direction-aware.
  // after truthy: format added or changed → BREAKING. after null: format removed → INFO (less restrictive).
  {
    matches: (c) => c.type === "request-schema-property-format-changed" && c.after !== null ? "BREAKING" : null,
    message: (c) => c.before === null
      ? `Request property format constraint added: ${c.location}. Server now enforces format '${c.after}'; clients sending other formats will fail validation.`
      : `Request property format changed: ${c.location} (${c.before} → ${c.after}). Clients sending data in the old format will fail validation.`,
  },
  {
    matches: (c) => c.type === "request-schema-property-format-changed" && c.after === null ? "INFO" : null,
    message: (c) => `Request property format constraint removed: ${c.location}. Server no longer enforces '${c.before}' format for this property (non-breaking for existing clients).`,
  },
  {
    matches: (c) => {
      if (c.type !== "request-schema-property-enum-changed") return null;
      const before = c.before as unknown[] | undefined;
      const after = c.after as unknown[] | undefined;
      if (!before && after) return "BREAKING"; // enum added = new constraint
      if (before && !after) return "INFO"; // enum removed = constraint relaxed (non-breaking)
      if (!before || !after) return "BREAKING"; // null-null edge
      const removed = before.filter((v) => !after.includes(v));
      if (removed.length > 0) return "BREAKING";
      return "INFO";
    },
    message: (c) => {
      const before = c.before as unknown[] | undefined;
      const after = c.after as unknown[] | undefined;
      if (!before && after) return `Request property enum added at ${c.location}: [${after.join(", ")}]. Clients sending other values will fail validation.`;
      if (before && !after) return `Request property enum removed at ${c.location}. Server no longer restricts values for this property (non-breaking for existing clients).`;
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
      const before = c.before as unknown[] | undefined | null;
      const after = c.after as unknown[] | undefined | null;
      // Enum added to previously unconstrained property: server now promises only these values (INFO).
      if (!before && after) return "INFO";
      // Enum removed from response property: server no longer restricts values; exhaustive clients break.
      if (before && !after) return "BREAKING";
      // Null-null edge (shouldn't fire due to diff guard, but defend): BREAKING.
      if (!before || !after) return "BREAKING";
      const added = after.filter((v) => !before.includes(v));
      if (added.length > 0) return "BREAKING";
      return "INFO";
    },
    message: (c) => {
      const before = c.before as unknown[] | undefined | null;
      const after = c.after as unknown[] | undefined | null;
      if (!before && after) return `Response property enum added: ${c.location}. Server now guarantees this field is one of [${(after as unknown[]).join(", ")}] (non-breaking for clients).`;
      if (before && !after) return `Response property enum constraint removed: ${c.location}. Server may now return any value for this property; clients with exhaustive enum handling will break.`;
      if (!before || !after) return `Response property enum changed at ${c.location}.`;
      const added = (after as unknown[]).filter((v) => !(before as unknown[]).includes(v));
      if (added.length > 0) return `Response property enum values added at ${c.location}: [${added.join(", ")}]. Clients with exhaustive enum handling (e.g. switch statements without default) will break.`;
      const removed = (before as unknown[]).filter((v) => !(after as unknown[]).includes(v));
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
      return requestConstraintSeverity(loc, before, after);
    },
    message: (c) => {
      const loc = String(c.location);
      const constraintName = loc.split(".").pop() ?? loc;
      if (loc.endsWith(".pattern")) {
        if (c.after === null) return `Request property pattern constraint removed: ${c.location}. Pattern '${c.before}' no longer enforced; clients sending any value are now accepted (non-breaking).`;
        if (c.before === null) return `Request property pattern constraint added: ${c.location}. Server now requires values to match pattern '${c.after}'; clients sending non-matching values will fail validation.`;
        return `Request property pattern constraint changed: ${c.location} (${c.before} → ${c.after}). Clients sending values matching the old pattern may fail validation.`;
      }
      if (c.after === null) {
        return `Request property constraint removed: ${c.location}. The ${constraintName} restriction is no longer enforced (non-breaking for clients).`;
      }
      if (c.before === null) {
        return `Request property constraint added: ${c.location}. Server now enforces ${constraintName} = ${c.after}; clients sending out-of-range values will fail validation.`;
      }
      const bNum = c.before as number;
      const aNum = c.after as number;
      const tightened = constraintKind(loc) === "min-sense" ? aNum > bNum : aNum < bNum;
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
      return responseConstraintSeverity(loc, before, after);
    },
    message: (c) => {
      const loc = String(c.location);
      const constraintName = loc.split(".").pop() ?? loc;
      if (loc.endsWith(".pattern")) {
        if (c.before === null) return `Response property pattern constraint added: ${c.location}. Server now guarantees values match pattern '${c.after}' (non-breaking for clients).`;
        if (c.after === null) return `Response property pattern constraint removed: ${c.location}. Server may now return values not matching '${c.before}'; clients validating this pattern will break.`;
        return `Response property pattern constraint changed: ${c.location} (${c.before} → ${c.after}). Server may now return values not matching the old pattern; clients validating this pattern will break.`;
      }
      if (c.after === null) {
        return `Response property constraint removed: ${c.location}. The ${constraintName} restriction is no longer enforced; server may now return values outside the former constraint. Clients relying on this constraint will break.`;
      }
      if (c.before === null) {
        return `Response property constraint added: ${c.location}. Server now guarantees ${constraintName} = ${c.after} (non-breaking for clients).`;
      }
      const bNum = c.before as number;
      const aNum = c.after as number;
      const loosened = constraintKind(loc) === "min-sense" ? aNum < bNum : aNum > bNum;
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
      return requestConstraintSeverity(loc, before, after);
    },
    message: (c) => {
      const loc = String(c.location);
      const constraintName = loc.split(".").pop() ?? loc;
      if (loc.endsWith(".pattern")) {
        if (c.after === null) return `Parameter pattern constraint removed: ${c.location}. Pattern '${c.before}' no longer enforced; clients sending any value are now accepted (non-breaking).`;
        if (c.before === null) return `Parameter pattern constraint added: ${c.location}. Server now requires values to match pattern '${c.after}'; clients sending non-matching values will fail validation.`;
        return `Parameter pattern constraint changed: ${c.location} (${c.before} → ${c.after}). Clients sending values matching the old pattern may fail validation.`;
      }
      if (c.after === null) {
        return `Parameter constraint removed: ${c.location}. The ${constraintName} restriction is no longer enforced (non-breaking for clients).`;
      }
      if (c.before === null) {
        return `Parameter constraint added: ${c.location}. Server now enforces ${constraintName} = ${c.after}; clients sending out-of-range values will fail validation.`;
      }
      const bNum = c.before as number;
      const aNum = c.after as number;
      const tightened = constraintKind(loc) === "min-sense" ? aNum > bNum : aNum < bNum;
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
      return requestConstraintSeverity(loc, before, after);
    },
    message: (c) => {
      const loc = String(c.location);
      const constraintName = loc.split(".").pop() ?? loc;
      if (loc.endsWith(".pattern")) {
        if (c.after === null) return `Request array items pattern constraint removed: ${c.location}. Pattern '${c.before}' no longer enforced on array elements (non-breaking).`;
        if (c.before === null) return `Request array items pattern constraint added: ${c.location}. Array elements must now match pattern '${c.after}'; clients sending non-matching elements will fail validation.`;
        return `Request array items pattern constraint changed: ${c.location} (${c.before} → ${c.after}). Clients sending values matching the old pattern may fail validation.`;
      }
      if (c.after === null) {
        return `Request array items constraint removed: ${c.location}. The ${constraintName} restriction is no longer enforced (non-breaking for clients).`;
      }
      if (c.before === null) {
        return `Request array items constraint added: ${c.location}. Server now enforces ${constraintName} = ${c.after}; clients sending out-of-range element values will fail validation.`;
      }
      const bNum = c.before as number;
      const aNum = c.after as number;
      const tightened = constraintKind(loc) === "min-sense" ? aNum > bNum : aNum < bNum;
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
      return responseConstraintSeverity(loc, before, after);
    },
    message: (c) => {
      const loc = String(c.location);
      const constraintName = loc.split(".").pop() ?? loc;
      if (loc.endsWith(".pattern")) {
        if (c.before === null) return `Response array items pattern constraint added: ${c.location}. Server now guarantees array elements match pattern '${c.after}' (non-breaking for clients).`;
        if (c.after === null) return `Response array items pattern constraint removed: ${c.location}. Server may now return elements not matching '${c.before}'; clients validating this pattern will break.`;
        return `Response array items pattern constraint changed: ${c.location} (${c.before} → ${c.after}). Server may now return element values not matching the old pattern; clients validating this pattern will break.`;
      }
      if (c.after === null) {
        return `Response array items constraint removed: ${c.location}. The ${constraintName} restriction is no longer enforced; server may now return element values outside the former constraint. Clients relying on this constraint will break.`;
      }
      if (c.before === null) {
        return `Response array items constraint added: ${c.location}. Server now guarantees ${constraintName} = ${c.after} for each element (non-breaking for clients).`;
      }
      const bNum = c.before as number;
      const aNum = c.after as number;
      const loosened = constraintKind(loc) === "min-sense" ? aNum < bNum : aNum > bNum;
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

  // ─── additionalProperties direction-aware ────────────────────────────────
  // Request body: adding additionalProperties:false closes the schema = BREAKING (extra properties rejected).
  {
    matches: (c) => c.type === "request-schema-additional-properties-changed" && c.after === false ? "BREAKING" : null,
    message: (c) => `Request schema closed: ${c.location}. Server now rejects extra properties (\`additionalProperties: false\`). Clients sending undocumented properties will receive 400.`,
  },
  // Request body: removing additionalProperties:false = INFO (server now accepts extra properties).
  {
    matches: (c) => c.type === "request-schema-additional-properties-changed" && c.after === true ? "INFO" : null,
    message: (c) => `Request schema opened: ${c.location}. Server no longer enforces \`additionalProperties: false\`; extra properties are now accepted (non-breaking for clients).`,
  },
  // Response schema: both directions are INFO (schema annotation, doesn't affect client response handling).
  {
    matches: (c) => c.type === "response-schema-additional-properties-changed" && c.after === false ? "INFO" : null,
    message: (c) => `Response schema closed: ${c.location}. Server now guarantees no extra properties are returned (\`additionalProperties: false\`). Clients benefit from stricter guarantee.`,
  },
  {
    matches: (c) => c.type === "response-schema-additional-properties-changed" && c.after === true ? "INFO" : null,
    message: (c) => `Response schema opened: ${c.location}. Server may now return extra properties beyond what is documented. Clients should handle unknown fields gracefully.`,
  },
  // Property-level additionalProperties: same direction logic as top-level.
  {
    matches: (c) => c.type === "request-schema-property-additional-properties-changed" && c.after === false ? "BREAKING" : null,
    message: (c) => `Request property schema closed: ${c.location}. Nested object now rejects extra properties; clients sending undocumented fields will receive 400.`,
  },
  {
    matches: (c) => c.type === "request-schema-property-additional-properties-changed" && c.after === true ? "INFO" : null,
    message: (c) => `Request property schema opened: ${c.location}. Nested object no longer enforces \`additionalProperties: false\`; extra fields are now accepted (non-breaking for clients).`,
  },
  {
    matches: (c) => c.type === "response-schema-property-additional-properties-changed" && c.after === false ? "INFO" : null,
    message: (c) => `Response property schema closed: ${c.location}. Nested object now guarantees no extra fields are returned.`,
  },
  {
    matches: (c) => c.type === "response-schema-property-additional-properties-changed" && c.after === true ? "INFO" : null,
    message: (c) => `Response property schema opened: ${c.location}. Nested object may now return extra fields beyond what is documented.`,
  },
  // Items-level additionalProperties: same direction logic as body and property levels.
  {
    matches: (c) => c.type === "request-schema-items-additional-properties-changed" && c.after === false ? "BREAKING" : null,
    message: (c) => `Request array items schema closed: ${c.location}. Server now rejects array elements with extra properties (\`additionalProperties: false\`). Clients sending elements with undocumented fields will receive 400.`,
  },
  {
    matches: (c) => c.type === "request-schema-items-additional-properties-changed" && c.after === true ? "INFO" : null,
    message: (c) => `Request array items schema opened: ${c.location}. Server no longer enforces \`additionalProperties: false\` on array elements; extra fields are now accepted (non-breaking for clients).`,
  },
  {
    matches: (c) => c.type === "response-schema-items-additional-properties-changed" && c.after === false ? "INFO" : null,
    message: (c) => `Response array items schema closed: ${c.location}. Server now guarantees array elements have no extra properties (\`additionalProperties: false\`). Clients benefit from stricter element guarantee.`,
  },
  {
    matches: (c) => c.type === "response-schema-items-additional-properties-changed" && c.after === true ? "INFO" : null,
    message: (c) => `Response array items schema opened: ${c.location}. Server may now return array elements with extra properties beyond what is documented. Clients should handle unknown fields in elements gracefully.`,
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
  // parameter-items-type-changed: direction-aware.
  // after truthy: type added or changed → BREAKING. after null: type removed → INFO (less restrictive).
  {
    matches: (c) => c.type === "parameter-items-type-changed" && c.after !== null ? "BREAKING" : null,
    message: (c) => c.before === null
      ? `Parameter array element type added: ${c.location}. Elements must now be type '${c.after}'; clients sending other types will fail validation.`
      : `Parameter array element type changed: ${c.location} (${c.before} → ${c.after}). Clients sending arrays with the old element type will fail validation.`,
  },
  {
    matches: (c) => c.type === "parameter-items-type-changed" && c.after === null ? "INFO" : null,
    message: (c) => `Parameter array element type constraint removed: ${c.location}. Server no longer enforces element type (non-breaking for existing clients).`,
  },
  // parameter-items-format-changed: direction-aware.
  // after truthy: format added or changed → BREAKING. after null: format removed → INFO (less restrictive).
  {
    matches: (c) => c.type === "parameter-items-format-changed" && c.after !== null ? "BREAKING" : null,
    message: (c) => c.before === null
      ? `Parameter array element format added: ${c.location}. Elements must now use format '${c.after}'.`
      : `Parameter array element format changed: ${c.location} (${c.before} → ${c.after}). Clients sending elements in the old format may fail validation.`,
  },
  {
    matches: (c) => c.type === "parameter-items-format-changed" && c.after === null ? "INFO" : null,
    message: (c) => `Parameter array element format constraint removed: ${c.location}. Server no longer enforces '${c.before}' format on elements (non-breaking for existing clients).`,
  },
  {
    matches: (c) => {
      if (c.type !== "parameter-items-enum-changed") return null;
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before && after) return "BREAKING"; // enum added to parameter items = new constraint
      if (before && !after) return "INFO"; // enum removed from parameter items = constraint relaxed
      if (!before || !after) return "BREAKING"; // null-null edge
      // Request: values removed = BREAKING (clients sending now-invalid values will fail).
      const removed = before.filter((v) => !after.includes(v));
      return removed.length > 0 ? "BREAKING" : "INFO";
    },
    message: (c) => {
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before && after) return `Parameter array element enum added: ${c.location}. Elements must now be one of [${after.join(", ")}]. Clients sending other values will receive 422.`;
      if (before && !after) return `Parameter array element enum removed: ${c.location}. Enum restriction no longer enforced on array elements (non-breaking for existing clients).`;
      if (!before || !after) return `Parameter array element enum changed: ${c.location}.`;
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
      return requestConstraintSeverity(loc, before, after);
    },
    message: (c) => {
      const loc = String(c.location);
      const constraintName = loc.split(".").pop() ?? loc;
      if (loc.endsWith(".pattern")) {
        if (c.after === null) return `Parameter array element pattern constraint removed: ${c.location}. Pattern '${c.before}' no longer enforced on array elements (non-breaking).`;
        if (c.before === null) return `Parameter array element pattern constraint added: ${c.location}. Array elements must now match pattern '${c.after}'; clients sending non-matching elements will fail validation.`;
        return `Parameter array element pattern changed: ${c.location} (${c.before} → ${c.after}). Clients sending elements matching the old pattern may now fail validation.`;
      }
      if (c.after === null) return `Parameter array element constraint removed: ${c.location}. The ${constraintName} restriction on array elements is no longer enforced.`;
      if (c.before === null) return `Parameter array element constraint added: ${c.location}. Elements must now satisfy ${constraintName} = ${c.after}.`;
      const bNum = c.before as number;
      const aNum = c.after as number;
      const tightened = constraintKind(loc) === "min-sense" ? aNum > bNum : aNum < bNum;
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
  // request-schema-format-changed: direction-aware.
  // after truthy: format added or changed → BREAKING. after null: format removed → INFO (less restrictive).
  {
    matches: (c) => c.type === "request-schema-format-changed" && c.after !== null ? "BREAKING" : null,
    message: (c) => c.before === null
      ? `Request body schema format constraint added: ${c.location}. Server now enforces format '${c.after}'; clients sending other formats will fail validation.`
      : `Request body schema format changed: ${c.location} (${c.before} → ${c.after}). Clients sending data in the old format may fail validation.`,
  },
  {
    matches: (c) => c.type === "request-schema-format-changed" && c.after === null ? "INFO" : null,
    message: (c) => `Request body schema format constraint removed: ${c.location}. Server no longer enforces '${c.before}' format (non-breaking for existing clients).`,
  },
  {
    matches: (c) => c.type === "response-schema-format-changed" && c.before !== null ? "BREAKING" : null,
    message: (c) => `Response body schema format changed: ${c.location} (${c.before ?? "none"} → ${c.after ?? "none"}). Clients parsing the response with the old format assumptions will break.`,
  },
  {
    matches: (c) => c.type === "response-schema-format-changed" && c.before === null && c.after !== null ? "INFO" : null,
    message: (c) => `Response body schema format constraint added: ${c.location}. Server now guarantees the response uses format '${c.after}' (non-breaking for clients).`,
  },

  // ─── Top-level body schema enum ───────────────────────────────────────────
  {
    matches: (c) => {
      if (c.type !== "request-schema-enum-changed") return null;
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before && after) return "BREAKING"; // enum added = new constraint introduced
      if (before && !after) return "INFO"; // enum removed = constraint relaxed (non-breaking)
      if (!before || !after) return "BREAKING"; // null-null edge
      // Values removed from request enum = BREAKING (previously-valid values now rejected).
      const removed = before.filter((v) => !after.includes(v));
      return removed.length > 0 ? "BREAKING" : "INFO";
    },
    message: (c) => {
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before && after) return `Request body schema enum added: ${c.location}. Server now restricts accepted values to [${after.join(", ")}]. Clients sending other values will receive 422.`;
      if (before && !after) return `Request body schema enum removed: ${c.location}. Server no longer enforces enum restriction; any value is now accepted (non-breaking for existing clients).`;
      if (!before || !after) return `Request body schema enum changed: ${c.location}.`;
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
      // Enum added to previously unconstrained body: server now promises only these values (INFO).
      if (!before && after) return "INFO";
      if (!before || !after) return "BREAKING"; // enum removed or other null-null edge
      // Values added to response enum = BREAKING (clients expecting exhaustive enums break).
      const added = (after ?? []).filter((v) => !before.includes(v));
      return added.length > 0 ? "BREAKING" : "INFO";
    },
    message: (c) => {
      const before = c.before as unknown[] | null;
      const after = c.after as unknown[] | null;
      if (!before && after) return `Response body schema enum added: ${c.location}. Server now constrains this value to [${(after ?? []).join(", ")}] (non-breaking for clients).`;
      if (!before) return `Response body schema enum added: ${c.location}. Server now constrains this value to [${(after ?? []).join(", ")}].`;
      if (!after) return `Response body schema enum removed: ${c.location}. Server no longer guarantees a restricted set for this value.`;
      const added = (after ?? []).filter((v) => !(before ?? []).includes(v));
      return added.length > 0
        ? `Response body schema enum values added: ${c.location}. New values: [${added.join(", ")}]. Exhaustive clients will not handle these values.`
        : `Response body schema enum values removed: ${c.location}. Removed: [${(before ?? []).filter((v) => !(after ?? []).includes(v)).join(", ")}].`;
    },
  },

  // ─── Top-level body schema readOnly / writeOnly (direction-aware) ──────────
  // Response body readOnly: INFO in both directions (annotation-only; payload unchanged).
  {
    matches: (c) => c.type === "response-schema-readonly-changed" ? "INFO" : null,
    message: (c) => c.after === true
      ? `Response body schema became read-only: ${c.location}. Server signals this payload is not writable; no payload change for clients.`
      : `Response body schema is no longer read-only: ${c.location}. The payload may now be accepted in request bodies.`,
  },
  // Request body readOnly false→true: BREAKING (server will reject/ignore the body).
  {
    matches: (c) =>
      c.type === "request-schema-readonly-changed" && c.before === false && c.after === true
        ? "BREAKING"
        : null,
    message: (c) => `Request body schema became read-only: ${c.location}. Clients sending this body will now receive a 400 or have it ignored.`,
  },
  {
    matches: (c) =>
      c.type === "request-schema-readonly-changed" && c.before === true && c.after === false
        ? "INFO"
        : null,
    message: (c) => `Request body schema is no longer read-only: ${c.location}. Clients may now send this body in requests.`,
  },
  // Response body writeOnly false→true: BREAKING (payload disappears from responses).
  {
    matches: (c) =>
      c.type === "response-schema-writeonly-changed" && c.before === false && c.after === true
        ? "BREAKING"
        : null,
    message: (c) => `Response body schema became write-only: ${c.location}. Clients that read this payload will no longer receive it in responses.`,
  },
  {
    matches: (c) =>
      c.type === "response-schema-writeonly-changed" && c.before === true && c.after === false
        ? "INFO"
        : null,
    message: (c) => `Response body schema is no longer write-only: ${c.location}. This payload will now appear in responses.`,
  },
  // Request body writeOnly: INFO in both directions (annotation about request bodies).
  {
    matches: (c) => c.type === "request-schema-writeonly-changed" ? "INFO" : null,
    message: (c) => c.after === true
      ? `Request body schema became write-only: ${c.location}. This body is accepted in requests but will not appear in responses.`
      : `Request body schema is no longer write-only: ${c.location}. This body may now appear in response payloads.`,
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

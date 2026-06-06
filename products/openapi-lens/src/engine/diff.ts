import type {
  HttpMethod,
  OapiOperation,
  OapiParameter,
  OapiRawChange,
  OapiSchema,
  OapiSpec,
} from "./types.js";

/** Key used to look up operations: "METHOD /path" */
function opKey(op: OapiOperation): string {
  return `${op.method} ${op.path}`;
}

/** Deep-equal check for two JSON-serializable values. */
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Compare two enum arrays as sets (order-insensitive). Reordering enum values is not a change. */
function enumSetsEqual(a: unknown[] | undefined, b: unknown[] | undefined): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  if (a.length !== b.length) return false;
  const aSet = new Set(a.map((v) => JSON.stringify(v)));
  return b.every((v) => aSet.has(JSON.stringify(v)));
}

/** Compare two parameter lists and emit changes. */
function diffParameters(
  path: string,
  method: HttpMethod,
  baseline: OapiParameter[],
  current: OapiParameter[],
  changes: OapiRawChange[],
): void {
  const bMap = new Map(baseline.map((p) => [`${p.in}:${p.name}`, p]));
  const cMap = new Map(current.map((p) => [`${p.in}:${p.name}`, p]));

  for (const [key, bp] of bMap) {
    const cp = cMap.get(key);
    if (!cp) {
      changes.push({ type: "parameter-removed", path, method, location: `parameter(${bp.in}:${bp.name})`, before: bp, after: null });
      continue;
    }
    if (bp.required !== cp.required) {
      changes.push({ type: "parameter-required-changed", path, method, location: `parameter(${bp.in}:${bp.name}).required`, before: bp.required, after: cp.required });
    }
    if (bp.schema.type !== cp.schema.type) {
      changes.push({ type: "parameter-type-changed", path, method, location: `parameter(${bp.in}:${bp.name}).schema.type`, before: bp.schema.type, after: cp.schema.type });
    }
    if (bp.schema.format !== cp.schema.format && (bp.schema.format !== undefined || cp.schema.format !== undefined)) {
      changes.push({ type: "parameter-format-changed", path, method, location: `parameter(${bp.in}:${bp.name}).schema.format`, before: bp.schema.format, after: cp.schema.format });
    }
    if (!enumSetsEqual(bp.schema.enum, cp.schema.enum)) {
      const bEnum = bp.schema.enum;
      const cEnum = cp.schema.enum;
      if (bEnum !== undefined || cEnum !== undefined) {
        changes.push({ type: "parameter-enum-changed", path, method, location: `parameter(${bp.in}:${bp.name}).schema.enum`, before: bEnum, after: cEnum });
      }
    }
    const bDep = bp.deprecated ?? false;
    const cDep = cp.deprecated ?? false;
    if (bDep !== cDep) {
      changes.push({ type: "parameter-deprecated-changed", path, method, location: `parameter(${bp.in}:${bp.name}).deprecated`, before: bDep, after: cDep });
    }
    const bNull = bp.schema.nullable ?? false;
    const cNull = cp.schema.nullable ?? false;
    if (bNull !== cNull) {
      changes.push({ type: "parameter-nullable-changed", path, method, location: `parameter(${bp.in}:${bp.name}).schema.nullable`, before: bNull, after: cNull });
    }
    const paramConstraintFields = ["minimum", "maximum", "minLength", "maxLength", "pattern", "minItems", "maxItems", "minProperties", "maxProperties"] as const;
    for (const cf of paramConstraintFields) {
      const bVal = bp.schema[cf] ?? null;
      const cVal = cp.schema[cf] ?? null;
      if (bVal !== cVal) {
        changes.push({
          type: "parameter-constraint-changed",
          path, method,
          location: `parameter(${bp.in}:${bp.name}).schema.${cf}`,
          before: bVal,
          after: cVal,
        });
      }
    }
    // Diff items schema for array-type parameters (e.g. query param with type:array).
    const bItems = bp.schema.items;
    const cItems = cp.schema.items;
    if (bItems || cItems) {
      const paramItemsLoc = `parameter(${bp.in}:${bp.name}).schema.items`;
      const bType = bItems?.type ?? null;
      const cType = cItems?.type ?? null;
      if (bType !== cType) {
        changes.push({ type: "parameter-items-type-changed", path, method, location: `${paramItemsLoc}.type`, before: bType, after: cType });
      }
      // Scalar field comparisons only when both item schemas exist (avoids double-reporting
      // alongside parameter-items-type-changed when items are newly added or removed).
      if (bItems && cItems) {
        const bFmt = bItems.format ?? null;
        const cFmt = cItems.format ?? null;
        if (bFmt !== cFmt) {
          changes.push({ type: "parameter-items-format-changed", path, method, location: `${paramItemsLoc}.format`, before: bFmt, after: cFmt });
        }
        if (!enumSetsEqual(bItems.enum, cItems.enum) && (bItems.enum !== undefined || cItems.enum !== undefined)) {
          changes.push({ type: "parameter-items-enum-changed", path, method, location: `${paramItemsLoc}.enum`, before: bItems.enum ?? null, after: cItems.enum ?? null });
        }
        const bNull = bItems.nullable ?? false;
        const cNull = cItems.nullable ?? false;
        if (bNull !== cNull) {
          changes.push({ type: "parameter-items-nullable-changed", path, method, location: `${paramItemsLoc}.nullable`, before: bNull, after: cNull });
        }
        const paramItemsConstraints = ["minimum", "maximum", "minLength", "maxLength", "pattern", "minItems", "maxItems", "minProperties", "maxProperties"] as const;
        for (const cf of paramItemsConstraints) {
          const bVal = bItems[cf] ?? null;
          const cVal = cItems[cf] ?? null;
          if (bVal !== cVal) {
            changes.push({ type: "parameter-items-constraint-changed", path, method, location: `${paramItemsLoc}.${cf}`, before: bVal, after: cVal });
          }
        }
      }
    }
  }

  for (const [key, cp] of cMap) {
    if (!bMap.has(key)) {
      changes.push({ type: "parameter-added", path, method, location: `parameter(${cp.in}:${cp.name})`, before: null, after: cp });
    }
  }
}

/** Compare required fields in two schemas and emit request or response schema changes. */
function diffSchemaRequiredFields(
  path: string,
  method: HttpMethod,
  location: string,
  baseline: OapiSchema | null,
  current: OapiSchema | null,
  isRequest: boolean,
  changes: OapiRawChange[],
): void {
  const bRequired = new Set(baseline?.required ?? []);
  const cRequired = new Set(current?.required ?? []);

  for (const field of cRequired) {
    if (!bRequired.has(field)) {
      changes.push({
        type: isRequest ? "request-schema-field-required-added" : "response-schema-field-required-added",
        path, method,
        location: `${location}.required[${field}]`,
        before: false,
        after: true,
      });
    }
  }
  for (const field of bRequired) {
    if (!cRequired.has(field)) {
      changes.push({
        type: isRequest ? "request-schema-field-required-removed" : "response-schema-field-required-removed",
        path, method,
        location: `${location}.required[${field}]`,
        before: true,
        after: false,
      });
    }
  }
}

/** Compare the type of a schema and emit a type-changed event. */
function diffSchemaType(
  path: string,
  method: HttpMethod,
  location: string,
  baseline: OapiSchema | null,
  current: OapiSchema | null,
  isRequest: boolean,
  changes: OapiRawChange[],
): void {
  // Use null sentinel so that type-removed (string→undefined) and type-added (undefined→string)
  // transitions are emitted — the same pattern as diffSchemaProperties (item 54 fix).
  const bType = baseline?.type ?? null;
  const cType = current?.type ?? null;
  if (bType !== cType && (bType !== null || cType !== null)) {
    changes.push({
      type: isRequest ? "request-schema-type-changed" : "response-schema-type-changed",
      path, method,
      location: `${location}.type`,
      before: bType,
      after: cType,
    });
  }
}

/** Maximum nesting depth for recursive property diffing. Guards against pathological schemas. */
const MAX_PROPERTY_DEPTH = 5;

/** Maximum nesting depth for recursive items diffing (e.g. array<array<array<T>>>). */
const MAX_ITEMS_DEPTH = 3;

/**
 * Compare properties of two object schemas, recursing into nested objects up to MAX_PROPERTY_DEPTH.
 * Detects type changes, removals, and additions at any nesting level; the `location` field carries
 * the full dotted path (e.g. `requestBody.content.schema.properties.user.properties.address.properties.zipCode`).
 */
function diffSchemaProperties(
  path: string,
  method: HttpMethod,
  location: string,
  baseline: OapiSchema | null,
  current: OapiSchema | null,
  isRequest: boolean,
  changes: OapiRawChange[],
  depth: number = 0,
): void {
  if (depth >= MAX_PROPERTY_DEPTH) return;

  const bProps = baseline?.properties ?? {};
  const cProps = current?.properties ?? {};
  const bKeys = new Set(Object.keys(bProps));
  const cKeys = new Set(Object.keys(cProps));

  for (const key of bKeys) {
    const bProp = bProps[key]!;
    const cProp = cProps[key];
    if (!cProp) {
      changes.push({
        type: isRequest ? "request-schema-property-removed" : "response-schema-property-removed",
        path, method,
        location: `${location}.properties.${key}`,
        before: bProp.type ?? "(object)",
        after: null,
      });
      continue;
    }
    const bType = bProp.type ?? null;
    const cType = cProp.type ?? null;
    if (bType !== cType) {
      changes.push({
        type: isRequest ? "request-schema-property-type-changed" : "response-schema-property-type-changed",
        path, method,
        location: `${location}.properties.${key}.type`,
        before: bType,
        after: cType,
      });
    }
    if (!enumSetsEqual(bProp.enum, cProp.enum)) {
      const bEnum = bProp.enum;
      const cEnum = cProp.enum;
      if (bEnum !== undefined || cEnum !== undefined) {
        changes.push({
          type: isRequest ? "request-schema-property-enum-changed" : "response-schema-property-enum-changed",
          path, method,
          location: `${location}.properties.${key}.enum`,
          before: bEnum,
          after: cEnum,
        });
      }
    }
    if (bProp.format !== cProp.format && (bProp.format !== undefined || cProp.format !== undefined)) {
      changes.push({
        type: isRequest ? "request-schema-property-format-changed" : "response-schema-property-format-changed",
        path, method,
        location: `${location}.properties.${key}.format`,
        before: bProp.format ?? null,
        after: cProp.format ?? null,
      });
    }
    const bPropNull = bProp.nullable ?? false;
    const cPropNull = cProp.nullable ?? false;
    if (bPropNull !== cPropNull) {
      changes.push({
        type: isRequest ? "request-schema-property-nullable-changed" : "response-schema-property-nullable-changed",
        path, method,
        location: `${location}.properties.${key}.nullable`,
        before: bPropNull,
        after: cPropNull,
      });
    }
    const bReadOnly = bProp.readOnly ?? false;
    const cReadOnly = cProp.readOnly ?? false;
    if (bReadOnly !== cReadOnly) {
      changes.push({
        type: isRequest ? "request-schema-property-readonly-changed" : "response-schema-property-readonly-changed",
        path, method,
        location: `${location}.properties.${key}.readOnly`,
        before: bReadOnly,
        after: cReadOnly,
      });
    }
    const bWriteOnly = bProp.writeOnly ?? false;
    const cWriteOnly = cProp.writeOnly ?? false;
    if (bWriteOnly !== cWriteOnly) {
      changes.push({
        type: isRequest ? "request-schema-property-writeonly-changed" : "response-schema-property-writeonly-changed",
        path, method,
        location: `${location}.properties.${key}.writeOnly`,
        before: bWriteOnly,
        after: cWriteOnly,
      });
    }

    // Compare validation constraint fields.
    const constraintFields: Array<keyof typeof bProp> = ["minimum", "maximum", "minLength", "maxLength", "pattern", "minItems", "maxItems", "minProperties", "maxProperties"];
    for (const cf of constraintFields) {
      const bVal = bProp[cf] ?? null;
      const cVal = cProp[cf] ?? null;
      if (bVal !== cVal) {
        changes.push({
          type: isRequest ? "request-schema-property-constraint-changed" : "response-schema-property-constraint-changed",
          path, method,
          location: `${location}.properties.${key}.${cf}`,
          before: bVal,
          after: cVal,
        });
      }
    }

    // Diff items schema for array-typed properties (e.g. user.tags: array<string>).
    if (bProp.items || cProp.items) {
      diffSchemaItems(path, method, `${location}.properties.${key}`, bProp, cProp, isRequest, changes);
    }

    // Diff additionalProperties on nested object properties.
    diffPropertyAdditionalProperties(path, method, `${location}.properties.${key}`, bProp, cProp, isRequest, changes);

    // Recurse into nested object properties (both old and new exist — diff them).
    if (bProp.properties || cProp.properties || bProp.required || cProp.required) {
      diffSchemaRequiredFields(
        path, method,
        `${location}.properties.${key}`,
        bProp, cProp,
        isRequest, changes,
      );
      diffSchemaProperties(
        path, method,
        `${location}.properties.${key}`,
        bProp, cProp,
        isRequest, changes,
        depth + 1,
      );
    }
  }

  for (const key of cKeys) {
    if (!bKeys.has(key)) {
      changes.push({
        type: isRequest ? "request-schema-property-added" : "response-schema-property-added",
        path, method,
        location: `${location}.properties.${key}`,
        before: null,
        after: cProps[key]?.type ?? "(object)",
      });
    }
  }
}

/** Compare the items schema type for array-typed schemas. */
function diffSchemaItems(
  path: string,
  method: HttpMethod,
  location: string,
  baseline: OapiSchema | null,
  current: OapiSchema | null,
  isRequest: boolean,
  changes: OapiRawChange[],
  depth: number = 0,
): void {
  if (depth >= MAX_ITEMS_DEPTH) return;
  const bItems = baseline?.items;
  const cItems = current?.items;
  if (!bItems && !cItems) return;
  const bType = bItems?.type ?? null;
  const cType = cItems?.type ?? null;
  if (bType !== cType) {
    changes.push({
      type: isRequest ? "request-schema-items-type-changed" : "response-schema-items-type-changed",
      path, method,
      location: `${location}.items.type`,
      before: bType,
      after: cType,
    });
  }
  // When both items schemas exist, compare all scalar fields. Guards against double-reporting
  // when items are newly added or removed — items-type-changed (before=null or after=null)
  // is the primary signal for those transitions. Mirrors the round-10/20 rationale for
  // readOnly/writeOnly/additionalProperties.
  if (bItems && cItems) {
    const bFmt = bItems.format ?? null;
    const cFmt = cItems.format ?? null;
    if (bFmt !== cFmt) {
      changes.push({
        type: isRequest ? "request-schema-items-format-changed" : "response-schema-items-format-changed",
        path, method,
        location: `${location}.items.format`,
        before: bFmt,
        after: cFmt,
      });
    }
    const bItemsEnum = bItems.enum;
    const cItemsEnum = cItems.enum;
    if (!enumSetsEqual(bItemsEnum, cItemsEnum) && (bItemsEnum !== undefined || cItemsEnum !== undefined)) {
      changes.push({
        type: isRequest ? "request-schema-items-enum-changed" : "response-schema-items-enum-changed",
        path, method,
        location: `${location}.items.enum`,
        before: bItemsEnum ?? null,
        after: cItemsEnum ?? null,
      });
    }
    const bItemsNull = bItems.nullable ?? false;
    const cItemsNull = cItems.nullable ?? false;
    if (bItemsNull !== cItemsNull) {
      changes.push({
        type: isRequest ? "request-schema-items-nullable-changed" : "response-schema-items-nullable-changed",
        path, method,
        location: `${location}.items.nullable`,
        before: bItemsNull,
        after: cItemsNull,
      });
    }
    const itemsConstraintFields = ["minimum", "maximum", "minLength", "maxLength", "pattern", "minItems", "maxItems", "minProperties", "maxProperties"] as const;
    for (const cf of itemsConstraintFields) {
      const bVal = bItems[cf] ?? null;
      const cVal = cItems[cf] ?? null;
      if (bVal !== cVal) {
        changes.push({
          type: isRequest ? "request-schema-items-constraint-changed" : "response-schema-items-constraint-changed",
          path, method,
          location: `${location}.items.${cf}`,
          before: bVal,
          after: cVal,
        });
      }
    }
    // additionalProperties: normalize absent/true → true (extras allowed); significant transition
    // is true ↔ false (schema closes/opens).
    const bAP = bItems.additionalProperties ?? true;
    const cAP = cItems.additionalProperties ?? true;
    if (bAP !== cAP) {
      changes.push({
        type: isRequest ? "request-schema-items-additional-properties-changed" : "response-schema-items-additional-properties-changed",
        path, method,
        location: `${location}.items.additionalProperties`,
        before: bAP,
        after: cAP,
      });
    }
    const bReadOnly = bItems.readOnly ?? false;
    const cReadOnly = cItems.readOnly ?? false;
    if (bReadOnly !== cReadOnly) {
      changes.push({
        type: isRequest ? "request-schema-items-readonly-changed" : "response-schema-items-readonly-changed",
        path, method,
        location: `${location}.items.readOnly`,
        before: bReadOnly,
        after: cReadOnly,
      });
    }
    const bWriteOnly = bItems.writeOnly ?? false;
    const cWriteOnly = cItems.writeOnly ?? false;
    if (bWriteOnly !== cWriteOnly) {
      changes.push({
        type: isRequest ? "request-schema-items-writeonly-changed" : "response-schema-items-writeonly-changed",
        path, method,
        location: `${location}.items.writeOnly`,
        before: bWriteOnly,
        after: cWriteOnly,
      });
    }
  }
  // Recurse into items object properties (e.g. array<{id: string, name: string}>).
  if (bItems?.properties || cItems?.properties || bItems?.required || cItems?.required) {
    diffSchemaRequiredFields(path, method, `${location}.items`, bItems ?? null, cItems ?? null, isRequest, changes);
    diffSchemaProperties(path, method, `${location}.items`, bItems ?? null, cItems ?? null, isRequest, changes, 0);
  }
  // Recurse into doubly-nested array items (e.g. array<array<T>> — matrix/batch endpoints).
  if (bItems?.items || cItems?.items) {
    diffSchemaItems(path, method, `${location}.items`, bItems ?? null, cItems ?? null, isRequest, changes, depth + 1);
  }
}

/**
 * Compare top-level validation constraint fields on a schema (not per-property — for body schemas
 * that are scalars or arrays rather than objects with named properties).
 */
function diffSchemaTopLevelConstraints(
  path: string,
  method: HttpMethod,
  location: string,
  baseline: OapiSchema | null,
  current: OapiSchema | null,
  isRequest: boolean,
  changes: OapiRawChange[],
): void {
  const constraintFields = ["minimum", "maximum", "minLength", "maxLength", "pattern", "minItems", "maxItems", "minProperties", "maxProperties"] as const;
  for (const cf of constraintFields) {
    const bVal = baseline?.[cf] ?? null;
    const cVal = current?.[cf] ?? null;
    if (bVal !== cVal) {
      changes.push({
        type: isRequest ? "request-schema-property-constraint-changed" : "response-schema-property-constraint-changed",
        path, method,
        location: `${location}.${cf}`,
        before: bVal,
        after: cVal,
      });
    }
  }
}

/**
 * Compare additionalProperties on a schema.
 * `undefined` (absent) and `true` are semantically equivalent (extras allowed).
 * The significant transition is: absent/true ↔ `false` (schema closes/opens).
 */
function diffAdditionalProperties(
  path: string,
  method: HttpMethod,
  location: string,
  baseline: OapiSchema | null,
  current: OapiSchema | null,
  isRequest: boolean,
  changes: OapiRawChange[],
): void {
  // Normalize: absent or explicit true → true (extras allowed); false → false (closed schema)
  const bAP = baseline?.additionalProperties ?? true;
  const cAP = current?.additionalProperties ?? true;
  if (bAP !== cAP) {
    changes.push({
      type: isRequest ? "request-schema-additional-properties-changed" : "response-schema-additional-properties-changed",
      path, method,
      location: `${location}.additionalProperties`,
      before: bAP,
      after: cAP,
    });
  }
}

/** Compare additionalProperties on schema properties (per-property level). */
function diffPropertyAdditionalProperties(
  path: string,
  method: HttpMethod,
  location: string,
  bProp: OapiSchema,
  cProp: OapiSchema,
  isRequest: boolean,
  changes: OapiRawChange[],
): void {
  const bAP = bProp.additionalProperties ?? true;
  const cAP = cProp.additionalProperties ?? true;
  if (bAP !== cAP) {
    changes.push({
      type: isRequest ? "request-schema-property-additional-properties-changed" : "response-schema-property-additional-properties-changed",
      path, method,
      location: `${location}.additionalProperties`,
      before: bAP,
      after: cAP,
    });
  }
}

/** Compare format and enum on a top-level request/response body schema. */
function diffSchemaTopLevelFields(
  path: string,
  method: HttpMethod,
  location: string,
  baseline: OapiSchema | null,
  current: OapiSchema | null,
  isRequest: boolean,
  changes: OapiRawChange[],
): void {
  const bFmt = baseline?.format ?? null;
  const cFmt = current?.format ?? null;
  if (bFmt !== cFmt) {
    changes.push({
      type: isRequest ? "request-schema-format-changed" : "response-schema-format-changed",
      path, method,
      location: `${location}.format`,
      before: bFmt,
      after: cFmt,
    });
  }
  const bEnum = baseline?.enum;
  const cEnum = current?.enum;
  if (!enumSetsEqual(bEnum, cEnum) && (bEnum !== undefined || cEnum !== undefined)) {
    changes.push({
      type: isRequest ? "request-schema-enum-changed" : "response-schema-enum-changed",
      path, method,
      location: `${location}.enum`,
      before: bEnum ?? null,
      after: cEnum ?? null,
    });
  }
}

/** Compare readOnly and writeOnly on a top-level request/response body schema. */
function diffSchemaTopLevelReadOnlyWriteOnly(
  path: string,
  method: HttpMethod,
  location: string,
  baseline: OapiSchema | null,
  current: OapiSchema | null,
  isRequest: boolean,
  changes: OapiRawChange[],
): void {
  const bReadOnly = baseline?.readOnly ?? false;
  const cReadOnly = current?.readOnly ?? false;
  if (bReadOnly !== cReadOnly) {
    changes.push({
      type: isRequest ? "request-schema-readonly-changed" : "response-schema-readonly-changed",
      path, method,
      location: `${location}.readOnly`,
      before: bReadOnly,
      after: cReadOnly,
    });
  }
  const bWriteOnly = baseline?.writeOnly ?? false;
  const cWriteOnly = current?.writeOnly ?? false;
  if (bWriteOnly !== cWriteOnly) {
    changes.push({
      type: isRequest ? "request-schema-writeonly-changed" : "response-schema-writeonly-changed",
      path, method,
      location: `${location}.writeOnly`,
      before: bWriteOnly,
      after: cWriteOnly,
    });
  }
}

/** Compare nullable in a schema (response or request). */
function diffNullable(
  path: string,
  method: HttpMethod,
  location: string,
  baseline: OapiSchema | null,
  current: OapiSchema | null,
  isRequest: boolean,
  changes: OapiRawChange[],
): void {
  const bNull = baseline?.nullable ?? false;
  const cNull = current?.nullable ?? false;
  if (bNull !== cNull) {
    changes.push({
      type: isRequest ? "request-schema-nullable-changed" : "response-schema-nullable-changed",
      path, method,
      location: `${location}.nullable`,
      before: bNull,
      after: cNull,
    });
  }
}

/** Compare requestBody objects. */
function diffRequestBody(
  path: string,
  method: HttpMethod,
  baseline: OapiOperation,
  current: OapiOperation,
  changes: OapiRawChange[],
): void {
  const bb = baseline.requestBody;
  const cb = current.requestBody;

  if (!bb && !cb) return;

  if (bb && !cb) {
    changes.push({ type: "request-body-required-changed", path, method, location: "requestBody", before: bb.required, after: null });
    return;
  }
  if (!bb && cb) {
    if (cb.required) {
      changes.push({ type: "request-body-required-changed", path, method, location: "requestBody.required", before: false, after: true });
    }
    return;
  }

  if (bb && cb) {
    if (!bb.required && cb.required) {
      changes.push({ type: "request-body-required-changed", path, method, location: "requestBody.required", before: false, after: true });
    }
    if (bb.required && !cb.required) {
      changes.push({ type: "request-body-required-changed", path, method, location: "requestBody.required", before: true, after: false });
    }
    diffSchemaType(path, method, "requestBody.content.schema", bb.schema, cb.schema, true, changes);
    diffSchemaRequiredFields(path, method, "requestBody.content.schema", bb.schema, cb.schema, true, changes);
    diffSchemaProperties(path, method, "requestBody.content.schema", bb.schema, cb.schema, true, changes);
    diffSchemaItems(path, method, "requestBody.content.schema", bb.schema, cb.schema, true, changes);
    diffNullable(path, method, "requestBody.content.schema", bb.schema, cb.schema, true, changes);
    diffSchemaTopLevelConstraints(path, method, "requestBody.content.schema", bb.schema, cb.schema, true, changes);
    diffSchemaTopLevelFields(path, method, "requestBody.content.schema", bb.schema, cb.schema, true, changes);
    diffAdditionalProperties(path, method, "requestBody.content.schema", bb.schema, cb.schema, true, changes);
    diffSchemaTopLevelReadOnlyWriteOnly(path, method, "requestBody.content.schema", bb.schema, cb.schema, true, changes);
  }
}

/** Compare responses maps. */
function diffResponses(
  path: string,
  method: HttpMethod,
  baseline: OapiOperation,
  current: OapiOperation,
  changes: OapiRawChange[],
): void {
  const bMap = baseline.responses;
  const cMap = current.responses;

  for (const [code, br] of Object.entries(bMap)) {
    const cr = cMap[code];
    if (!cr) {
      changes.push({ type: "response-status-removed", path, method, location: `responses[${code}]`, before: code, after: null });
      continue;
    }
    const loc = `responses[${code}].content.schema`;
    diffSchemaType(path, method, loc, br.schema, cr.schema, false, changes);
    diffSchemaRequiredFields(path, method, loc, br.schema, cr.schema, false, changes);
    diffNullable(path, method, loc, br.schema, cr.schema, false, changes);
    diffSchemaProperties(path, method, loc, br.schema, cr.schema, false, changes);
    diffSchemaItems(path, method, loc, br.schema, cr.schema, false, changes);
    diffSchemaTopLevelConstraints(path, method, loc, br.schema, cr.schema, false, changes);
    diffSchemaTopLevelFields(path, method, loc, br.schema, cr.schema, false, changes);
    diffAdditionalProperties(path, method, loc, br.schema, cr.schema, false, changes);
    diffSchemaTopLevelReadOnlyWriteOnly(path, method, loc, br.schema, cr.schema, false, changes);
  }

  for (const code of Object.keys(cMap)) {
    if (!bMap[code]) {
      changes.push({ type: "response-status-added", path, method, location: `responses[${code}]`, before: null, after: code });
    }
  }
}

/**
 * Compute the structural diff between a baseline and current OpenAPI spec.
 * Returns a flat list of raw changes (not yet classified).
 */
export function diffSpecs(baseline: OapiSpec, current: OapiSpec): OapiRawChange[] {
  const changes: OapiRawChange[] = [];

  const bMap = new Map(baseline.operations.map((op) => [opKey(op), op]));
  const cMap = new Map(current.operations.map((op) => [opKey(op), op]));

  for (const [key, bOp] of bMap) {
    const cOp = cMap.get(key);
    if (!cOp) {
      changes.push({
        type: "endpoint-removed",
        path: bOp.path,
        method: bOp.method,
        location: `${bOp.method.toUpperCase()} ${bOp.path}`,
        before: key,
        after: null,
      });
      continue;
    }
    diffParameters(bOp.path, bOp.method, bOp.parameters, cOp.parameters, changes);
    diffRequestBody(bOp.path, bOp.method, bOp, cOp, changes);
    diffResponses(bOp.path, bOp.method, bOp, cOp, changes);
    const bDep = bOp.deprecated ?? false;
    const cDep = cOp.deprecated ?? false;
    if (bDep !== cDep) {
      changes.push({
        type: "operation-deprecated-changed",
        path: bOp.path,
        method: bOp.method,
        location: `${bOp.method.toUpperCase()} ${bOp.path}.deprecated`,
        before: bDep,
        after: cDep,
      });
    }
  }

  for (const [key, cOp] of cMap) {
    if (!bMap.has(key)) {
      changes.push({
        type: "endpoint-added",
        path: cOp.path,
        method: cOp.method,
        location: `${cOp.method.toUpperCase()} ${cOp.path}`,
        before: null,
        after: key,
      });
    }
  }

  return changes;
}

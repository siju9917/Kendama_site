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
    if (!deepEqual(bp.schema.enum, cp.schema.enum)) {
      const bEnum = bp.schema.enum;
      const cEnum = cp.schema.enum;
      if (bEnum !== undefined || cEnum !== undefined) {
        changes.push({ type: "parameter-enum-changed", path, method, location: `parameter(${bp.in}:${bp.name}).schema.enum`, before: bEnum, after: cEnum });
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
  const bType = baseline?.type;
  const cType = current?.type;
  if (bType !== undefined && cType !== undefined && bType !== cType) {
    changes.push({
      type: isRequest ? "request-schema-type-changed" : "response-schema-type-changed",
      path, method,
      location: `${location}.type`,
      before: bType,
      after: cType,
    });
  }
}

/** Compare properties of two object schemas (one level deep) and emit property-level changes. */
function diffSchemaProperties(
  path: string,
  method: HttpMethod,
  location: string,
  baseline: OapiSchema | null,
  current: OapiSchema | null,
  isRequest: boolean,
  changes: OapiRawChange[],
): void {
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
    if (bProp.type !== undefined && cProp.type !== undefined && bProp.type !== cProp.type) {
      changes.push({
        type: isRequest ? "request-schema-property-type-changed" : "response-schema-property-type-changed",
        path, method,
        location: `${location}.properties.${key}.type`,
        before: bProp.type,
        after: cProp.type,
      });
    }
    if (!deepEqual(bProp.enum, cProp.enum)) {
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
): void {
  const bItems = baseline?.items;
  const cItems = current?.items;
  if (!bItems && !cItems) return;
  if (bItems?.type !== undefined && cItems?.type !== undefined && bItems.type !== cItems.type) {
    changes.push({
      type: isRequest ? "request-schema-items-type-changed" : "response-schema-items-type-changed",
      path, method,
      location: `${location}.items.type`,
      before: bItems.type,
      after: cItems.type,
    });
  }
}

/** Compare nullable in a response schema. */
function diffResponseNullable(
  path: string,
  method: HttpMethod,
  location: string,
  baseline: OapiSchema | null,
  current: OapiSchema | null,
  changes: OapiRawChange[],
): void {
  const bNull = baseline?.nullable ?? false;
  const cNull = current?.nullable ?? false;
  if (bNull !== cNull) {
    changes.push({
      type: "response-schema-nullable-changed",
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
    diffSchemaType(path, method, "requestBody.content.schema", bb.schema, cb.schema, true, changes);
    diffSchemaRequiredFields(path, method, "requestBody.content.schema", bb.schema, cb.schema, true, changes);
    diffSchemaProperties(path, method, "requestBody.content.schema", bb.schema, cb.schema, true, changes);
    diffSchemaItems(path, method, "requestBody.content.schema", bb.schema, cb.schema, true, changes);
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
    diffResponseNullable(path, method, loc, br.schema, cr.schema, changes);
    diffSchemaProperties(path, method, loc, br.schema, cr.schema, false, changes);
    diffSchemaItems(path, method, loc, br.schema, cr.schema, false, changes);
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

import yaml from "js-yaml";
import type {
  HttpMethod,
  OapiOperation,
  OapiParameter,
  OapiRequestBody,
  OapiResponse,
  OapiSchema,
  OapiSpec,
} from "./types.js";

const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "delete", "patch", "head", "options", "trace"];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function asBoolean(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Detect whether the raw parsed document is an OpenAPI 3.x or 2.x spec. */
function detectVersion(raw: Record<string, unknown>): OapiSpec["version"] {
  const oa = asString(raw["openapi"]);
  if (oa?.startsWith("3.1")) return "3.1";
  if (oa?.startsWith("3.")) return "3.0";
  const sw = asString(raw["swagger"]);
  if (sw?.startsWith("2.")) return "2.0";
  return "3.0";
}

/** Parse the #/components/schemas section into a flat map. */
function parseSchemas(raw: Record<string, unknown>): Record<string, OapiSchema> {
  const schemas: Record<string, OapiSchema> = {};
  const components = isObject(raw["components"]) ? raw["components"] : {};
  const rawSchemas = isObject(components["schemas"]) ? components["schemas"] : {};
  for (const [name, def] of Object.entries(rawSchemas)) {
    schemas[name] = normalizeSchema(def, rawSchemas);
  }
  return schemas;
}

/** Parse Swagger 2.0 definitions into a flat schema map. */
function parseDefinitions(raw: Record<string, unknown>): Record<string, OapiSchema> {
  const defs = isObject(raw["definitions"]) ? raw["definitions"] : {};
  const schemas: Record<string, OapiSchema> = {};
  for (const [name, def] of Object.entries(defs)) {
    schemas[name] = normalizeSchema(def, defs as Record<string, unknown>);
  }
  return schemas;
}

/**
 * Resolve a local $ref to the referenced schema. Returns empty schema on failure.
 * The `visited` set prevents infinite recursion on circular $ref chains.
 */
function resolveLocalRef(ref: string, lookup: Record<string, unknown>, visited: Set<string>): OapiSchema {
  const match = /^#\/(components\/schemas|definitions)\/(.+)$/.exec(ref);
  if (!match || !match[2]) return {};
  const name = match[2];
  // Cycle guard: a circular $ref (e.g. a Node schema referencing itself) terminates here.
  if (visited.has(name)) return {};
  const def = lookup[name];
  if (def === undefined) return {};
  visited.add(name);
  const result = normalizeSchema(def, lookup, visited);
  visited.delete(name);
  return result;
}

/**
 * Flatten allOf members into the parent schema.
 *
 * JSON Schema semantics: allOf means the instance must validate against ALL member schemas.
 * Merging: union of required[] (deduplicated), union of properties (parent wins on key
 * conflict since parent schemas override base schemas in typical inheritance patterns),
 * and fill-in of missing scalar fields (type, format, nullable, etc.) from members in order.
 *
 * oneOf/anyOf are intentionally NOT flattened — they require per-variant analysis (Phase 2).
 */
function flattenAllOf(schema: OapiSchema): OapiSchema {
  const members = schema.allOf ?? [];
  if (members.length === 0) return schema;

  const result: OapiSchema = { ...schema };
  delete result.allOf;

  for (const member of members) {
    if (member.required?.length) {
      const base = result.required ?? [];
      result.required = [...new Set([...base, ...member.required])];
    }
    if (member.properties) {
      // Spread member first so parent properties take precedence on key conflict.
      result.properties = { ...member.properties, ...(result.properties ?? {}) };
    }
    if (result.type === undefined && member.type !== undefined) result.type = member.type;
    if (result.format === undefined && member.format !== undefined) result.format = member.format;
    if (result.nullable === undefined && member.nullable !== undefined) result.nullable = member.nullable;
    if (result.readOnly === undefined && member.readOnly !== undefined) result.readOnly = member.readOnly;
    if (result.writeOnly === undefined && member.writeOnly !== undefined) result.writeOnly = member.writeOnly;
    if (result.items === undefined && member.items !== undefined) result.items = member.items;
    if (result.enum === undefined && member.enum !== undefined) result.enum = member.enum;
    if (result.additionalProperties === undefined && member.additionalProperties !== undefined) result.additionalProperties = member.additionalProperties;
    // Inherit constraint fields from members when parent doesn't define them.
    const numericConstraints = ["minimum", "maximum", "minLength", "maxLength", "minItems", "maxItems", "minProperties", "maxProperties"] as const;
    for (const cf of numericConstraints) {
      if (result[cf] === undefined && member[cf] !== undefined) result[cf] = member[cf];
    }
    if (result.pattern === undefined && member.pattern !== undefined) result.pattern = member.pattern;
  }

  return result;
}

/** Normalize a raw schema node, resolving $ref if local. */
function normalizeSchema(raw: unknown, lookup: Record<string, unknown>, visited: Set<string> = new Set()): OapiSchema {
  if (!isObject(raw)) return {};
  const ref = asString(raw["$ref"]);
  if (ref) return resolveLocalRef(ref, lookup, visited);

  const schema: OapiSchema = {};
  const type = asString(raw["type"]);
  if (type) schema.type = type;
  const format = asString(raw["format"]);
  if (format) schema.format = format;
  const nullable = asBoolean(raw["nullable"]);
  if (nullable !== undefined) schema.nullable = nullable;
  const readOnly = asBoolean(raw["readOnly"]);
  if (readOnly !== undefined) schema.readOnly = readOnly;
  const writeOnly = asBoolean(raw["writeOnly"]);
  if (writeOnly !== undefined) schema.writeOnly = writeOnly;

  const rawEnum = raw["enum"];
  if (Array.isArray(rawEnum)) schema.enum = rawEnum;

  const minimum = asNumber(raw["minimum"]);
  if (minimum !== undefined) schema.minimum = minimum;
  const maximum = asNumber(raw["maximum"]);
  if (maximum !== undefined) schema.maximum = maximum;
  const minLength = asNumber(raw["minLength"]);
  if (minLength !== undefined) schema.minLength = minLength;
  const maxLength = asNumber(raw["maxLength"]);
  if (maxLength !== undefined) schema.maxLength = maxLength;
  const pattern = asString(raw["pattern"]);
  if (pattern !== undefined) schema.pattern = pattern;
  const minItems = asNumber(raw["minItems"]);
  if (minItems !== undefined) schema.minItems = minItems;
  const maxItems = asNumber(raw["maxItems"]);
  if (maxItems !== undefined) schema.maxItems = maxItems;
  const minProperties = asNumber(raw["minProperties"]);
  if (minProperties !== undefined) schema.minProperties = minProperties;
  const maxProperties = asNumber(raw["maxProperties"]);
  if (maxProperties !== undefined) schema.maxProperties = maxProperties;

  const rawRequired = raw["required"];
  if (Array.isArray(rawRequired)) {
    schema.required = rawRequired.filter((v): v is string => typeof v === "string");
  }

  // additionalProperties: only capture boolean values (ignoring schema-valued additionalProperties).
  const rawAdditional = raw["additionalProperties"];
  if (typeof rawAdditional === "boolean") schema.additionalProperties = rawAdditional;

  const rawProps = raw["properties"];
  if (isObject(rawProps)) {
    schema.properties = {};
    for (const [k, v] of Object.entries(rawProps)) {
      schema.properties[k] = normalizeSchema(v, lookup, visited);
    }
  }

  const rawItems = raw["items"];
  if (rawItems !== undefined) schema.items = normalizeSchema(rawItems, lookup, visited);

  for (const key of ["allOf", "oneOf", "anyOf"] as const) {
    const arr = asArray(raw[key]);
    if (arr.length > 0) {
      schema[key] = arr.map((s) => normalizeSchema(s, lookup, visited));
    }
  }

  // Flatten allOf into the parent schema so the diff engine sees a single flat schema.
  // Breaking changes inside allOf members (e.g. an inherited required field becoming required)
  // are now detectable. oneOf/anyOf remain unflattened (Phase 2).
  if (schema.allOf && schema.allOf.length > 0) {
    return flattenAllOf(schema);
  }

  return schema;
}

/** Extract the JSON schema from a content map (application/json preferred, first otherwise). */
function extractContentSchema(content: unknown, lookup: Record<string, unknown>): OapiSchema | null {
  if (!isObject(content)) return null;
  const preferredMedia =
    isObject(content["application/json"]) ? content["application/json"] :
    Object.values(content).find(isObject);
  if (!preferredMedia || !isObject(preferredMedia)) return null;
  return normalizeSchema(preferredMedia["schema"], lookup);
}

/** Parse a single parameter object. Resolves $ref to components/parameters if paramLookup provided. */
function parseParameter(raw: unknown, schemaLookup: Record<string, unknown>, paramLookup?: Record<string, OapiParameter>): OapiParameter | null {
  if (!isObject(raw)) return null;
  const ref = asString(raw["$ref"]);
  if (ref && paramLookup) {
    const match = /^#\/(components\/parameters|parameters)\/(.+)$/.exec(ref);
    if (match && match[2]) return paramLookup[match[2]] ?? null;
    return null;
  }
  const name = asString(raw["name"]);
  const inVal = asString(raw["in"]);
  if (!name || !inVal) return null;
  if (!["path", "query", "header", "cookie"].includes(inVal)) return null;
  const required = asBoolean(raw["required"]) ?? (inVal === "path");
  const schema = normalizeSchema(raw["schema"] ?? raw, schemaLookup);
  const deprecated = asBoolean(raw["deprecated"]);
  return { name, in: inVal as OapiParameter["in"], required, schema, ...(deprecated ? { deprecated } : {}) };
}

/** Parse components/parameters (OAS 3.x) and top-level parameters (Swagger 2.0) into a lookup map. */
function parseSharedParameters(raw: Record<string, unknown>, schemaLookup: Record<string, unknown>): Record<string, OapiParameter> {
  const result: Record<string, OapiParameter> = {};
  const components = isObject(raw["components"]) ? raw["components"] : {};
  const compParams = isObject(components["parameters"]) ? components["parameters"] : {};
  const topLevelParams = isObject(raw["parameters"]) ? raw["parameters"] : {};
  const all = { ...topLevelParams, ...compParams };
  for (const [name, def] of Object.entries(all)) {
    const p = parseParameter(def, schemaLookup);
    if (p) result[name] = p;
  }
  return result;
}

/** Parse the parameters array, merging path-level and operation-level. */
function parseParameters(pathLevelParams: unknown[], opLevelParams: unknown[], schemaLookup: Record<string, unknown>, paramLookup: Record<string, OapiParameter>): OapiParameter[] {
  const merged = new Map<string, OapiParameter>();
  for (const raw of [...pathLevelParams, ...opLevelParams]) {
    const p = parseParameter(raw, schemaLookup, paramLookup);
    if (p) merged.set(`${p.in}:${p.name}`, p);
  }
  return [...merged.values()];
}

/** Parse a requestBody object (OAS 3.x). */
function parseRequestBody(raw: unknown, lookup: Record<string, unknown>): OapiRequestBody | null {
  if (!isObject(raw)) return null;
  const required = asBoolean(raw["required"]) ?? false;
  const schema = extractContentSchema(raw["content"], lookup);
  return { required, schema };
}

/** Parse responses into a status-code-keyed map (OAS 3.x and Swagger 2.0). */
function parseResponses(raw: unknown, lookup: Record<string, unknown>): Record<string, OapiResponse> {
  if (!isObject(raw)) return {};
  const result: Record<string, OapiResponse> = {};
  for (const [statusCode, resp] of Object.entries(raw)) {
    if (!isObject(resp)) continue;
    const schema =
      extractContentSchema(resp["content"], lookup) ??
      normalizeSchema(resp["schema"], lookup);
    result[statusCode] = { statusCode, schema: schema && Object.keys(schema).length > 0 ? schema : null };
  }
  return result;
}

/** Build a Swagger 2.0 request body from the operation's body parameters. */
function buildSwagger2RequestBody(parameters: unknown[], lookup: Record<string, unknown>): OapiRequestBody | null {
  const bodyParam = asArray(parameters).find((p) => isObject(p) && p["in"] === "body");
  if (!isObject(bodyParam)) return null;
  const required = asBoolean(bodyParam["required"]) ?? false;
  const schema = normalizeSchema(bodyParam["schema"], lookup);
  return { required, schema: Object.keys(schema).length > 0 ? schema : null };
}

/** Parse the paths object into a flat list of operations. */
function parseOperations(raw: Record<string, unknown>, schemaLookup: Record<string, unknown>, version: OapiSpec["version"]): OapiOperation[] {
  const paramLookup = parseSharedParameters(raw, schemaLookup);
  const paths = isObject(raw["paths"]) ? raw["paths"] : {};
  const ops: OapiOperation[] = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!isObject(pathItem)) continue;
    const pathLevelParams = asArray(pathItem["parameters"]);

    for (const method of HTTP_METHODS) {
      const opRaw = pathItem[method];
      if (!isObject(opRaw)) continue;

      const opLevelParams = asArray(opRaw["parameters"]);
      const parameters = parseParameters(pathLevelParams, opLevelParams, schemaLookup, paramLookup);
      const nonBodyParams = parameters.filter((p) => p.in !== ("body" as never));

      // For Swagger 2.0, op-level params take priority over path-level (op-level first so
      // .find() returns it before the path-level body param). A path-level body param is
      // valid per the Swagger 2.0 spec and must be inherited when the operation doesn't
      // define its own.
      const requestBody =
        version === "2.0"
          ? buildSwagger2RequestBody([...opLevelParams, ...pathLevelParams], schemaLookup)
          : parseRequestBody(opRaw["requestBody"], schemaLookup);

      const responses = parseResponses(opRaw["responses"], schemaLookup);
      const deprecated = asBoolean(opRaw["deprecated"]);

      ops.push({
        path,
        method,
        parameters: nonBodyParams,
        requestBody,
        responses,
        ...(deprecated ? { deprecated } : {}),
      });
    }
  }

  return ops;
}

/**
 * Parse an OpenAPI spec (YAML or JSON string) into a normalized OapiSpec.
 *
 * Supports OAS 3.0, OAS 3.1, and Swagger 2.0. Accepts both JSON and YAML.
 * Resolves local `#/components/schemas/X` and `#/definitions/X` refs inline.
 * Circular `$ref` chains are terminated (return empty schema `{}`).
 * Remote refs (`./other.yaml`, `https://...`) are silently treated as empty schema.
 *
 * @throws {Error} if the root of the document is not an object.
 * @throws {Error} if YAML parsing fails on malformed input.
 */
export function parseOapiSpec(input: string): OapiSpec {
  let raw: unknown;
  try {
    raw = JSON.parse(input);
  } catch {
    raw = yaml.load(input);
  }
  if (!isObject(raw)) throw new Error("Invalid OpenAPI spec: root must be an object");

  const version = detectVersion(raw);
  const schemas =
    version === "2.0" ? parseDefinitions(raw) : parseSchemas(raw);
  const operations = parseOperations(raw, schemas, version);

  return { version, operations, schemas };
}

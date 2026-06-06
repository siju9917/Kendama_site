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

/** Resolve a local $ref to the referenced schema. Returns empty schema on failure. */
function resolveLocalRef(ref: string, lookup: Record<string, unknown>): OapiSchema {
  const match = /^#\/(components\/schemas|definitions)\/(.+)$/.exec(ref);
  if (!match || !match[2]) return {};
  const name = match[2];
  const def = lookup[name];
  return def !== undefined ? normalizeSchema(def, lookup) : {};
}

/** Normalize a raw schema node, resolving $ref if local. */
function normalizeSchema(raw: unknown, lookup: Record<string, unknown>): OapiSchema {
  if (!isObject(raw)) return {};
  const ref = asString(raw["$ref"]);
  if (ref) return resolveLocalRef(ref, lookup);

  const schema: OapiSchema = {};
  const type = asString(raw["type"]);
  if (type) schema.type = type;
  const format = asString(raw["format"]);
  if (format) schema.format = format;
  const nullable = asBoolean(raw["nullable"]);
  if (nullable !== undefined) schema.nullable = nullable;

  const rawEnum = raw["enum"];
  if (Array.isArray(rawEnum)) schema.enum = rawEnum;

  const rawRequired = raw["required"];
  if (Array.isArray(rawRequired)) {
    schema.required = rawRequired.filter((v): v is string => typeof v === "string");
  }

  const rawProps = raw["properties"];
  if (isObject(rawProps)) {
    schema.properties = {};
    for (const [k, v] of Object.entries(rawProps)) {
      schema.properties[k] = normalizeSchema(v, lookup);
    }
  }

  const rawItems = raw["items"];
  if (rawItems !== undefined) schema.items = normalizeSchema(rawItems, lookup);

  for (const key of ["allOf", "oneOf", "anyOf"] as const) {
    const arr = asArray(raw[key]);
    if (arr.length > 0) {
      schema[key] = arr.map((s) => normalizeSchema(s, lookup));
    }
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

/** Parse a single parameter object. */
function parseParameter(raw: unknown, lookup: Record<string, unknown>): OapiParameter | null {
  if (!isObject(raw)) return null;
  const name = asString(raw["name"]);
  const inVal = asString(raw["in"]);
  if (!name || !inVal) return null;
  if (!["path", "query", "header", "cookie"].includes(inVal)) return null;
  const required = asBoolean(raw["required"]) ?? (inVal === "path");
  const schema = normalizeSchema(raw["schema"] ?? raw, lookup);
  return { name, in: inVal as OapiParameter["in"], required, schema };
}

/** Parse the parameters array, merging path-level and operation-level. */
function parseParameters(pathLevelParams: unknown[], opLevelParams: unknown[], lookup: Record<string, unknown>): OapiParameter[] {
  const merged = new Map<string, OapiParameter>();
  for (const raw of [...pathLevelParams, ...opLevelParams]) {
    const p = parseParameter(raw, lookup);
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
function parseOperations(raw: Record<string, unknown>, lookup: Record<string, unknown>, version: OapiSpec["version"]): OapiOperation[] {
  const paths = isObject(raw["paths"]) ? raw["paths"] : {};
  const ops: OapiOperation[] = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!isObject(pathItem)) continue;
    const pathLevelParams = asArray(pathItem["parameters"]);

    for (const method of HTTP_METHODS) {
      const opRaw = pathItem[method];
      if (!isObject(opRaw)) continue;

      const opLevelParams = asArray(opRaw["parameters"]);
      const parameters = parseParameters(pathLevelParams, opLevelParams, lookup);
      const nonBodyParams = parameters.filter((p) => p.in !== ("body" as never));

      const requestBody =
        version === "2.0"
          ? buildSwagger2RequestBody(opLevelParams, lookup)
          : parseRequestBody(opRaw["requestBody"], lookup);

      const responses = parseResponses(opRaw["responses"], lookup);
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
 * Throws on malformed input.
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

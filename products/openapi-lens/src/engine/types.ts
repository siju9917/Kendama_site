/** Core data types for the OpenAPI breaking-change engine. */

export type HttpMethod = "get" | "post" | "put" | "delete" | "patch" | "head" | "options" | "trace";

/** Normalized schema node (subset of JSON Schema / OpenAPI schema object). */
export interface OapiSchema {
  type?: string;
  format?: string;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, OapiSchema>;
  items?: OapiSchema;
  allOf?: OapiSchema[];
  oneOf?: OapiSchema[];
  anyOf?: OapiSchema[];
  /** Validation constraint fields (JSON Schema draft-07 / OpenAPI). */
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  minProperties?: number;
  maxProperties?: number;
  /**
   * Whether extra properties are permitted (JSON Schema `additionalProperties`).
   * undefined = spec omits the field (equivalent to `true` — extras are allowed).
   * false = server closes the schema — no extra properties accepted/returned.
   * true = explicitly permits extra properties (same as default).
   */
  additionalProperties?: boolean;
}

/** A parameter on an operation (path / query / header / cookie). */
export interface OapiParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  schema: OapiSchema;
  deprecated?: boolean;
}

/** A request body attached to an operation. */
export interface OapiRequestBody {
  required: boolean;
  schema: OapiSchema | null;
  contentTypes: string[];
}

/** A single documented response header. */
export interface OapiResponseHeader {
  name: string;
  required: boolean;
  schema: OapiSchema | null;
}

/** A single response by status code. */
export interface OapiResponse {
  statusCode: string;
  schema: OapiSchema | null;
  headers: Record<string, OapiResponseHeader>;
  contentTypes: string[];
}

/** One HTTP operation: a path + method + its inputs/outputs. */
export interface OapiOperation {
  path: string;
  method: HttpMethod;
  operationId?: string;
  /** Normalized security requirements: scheme → union of required scopes across all OR'd entries. */
  security?: Record<string, string[]>;
  parameters: OapiParameter[];
  requestBody: OapiRequestBody | null;
  responses: Record<string, OapiResponse>;
  deprecated?: boolean;
}

/** Normalized, parsed representation of an entire OpenAPI spec. */
export interface OapiSpec {
  version: "3.0" | "3.1" | "2.0";
  operations: OapiOperation[];
  schemas: Record<string, OapiSchema>;
  servers: string[];
}

// ─── Diff types ────────────────────────────────────────────────────────────

export type OapiChangeType =
  | "endpoint-added"
  | "endpoint-removed"
  | "parameter-added"
  | "parameter-removed"
  | "parameter-required-changed"
  | "parameter-type-changed"
  | "parameter-format-changed"
  | "parameter-enum-changed"
  | "request-body-required-changed"
  | "request-schema-field-required-added"
  | "request-schema-field-required-removed"
  | "request-schema-type-changed"
  | "response-status-added"
  | "response-status-removed"
  | "response-schema-field-required-added"
  | "response-schema-field-required-removed"
  | "response-schema-type-changed"
  | "response-schema-nullable-changed"
  | "response-schema-property-type-changed"
  | "response-schema-property-removed"
  | "response-schema-property-added"
  | "request-schema-property-type-changed"
  | "request-schema-property-removed"
  | "request-schema-property-added"
  | "response-schema-items-type-changed"
  | "request-schema-items-type-changed"
  | "response-schema-property-enum-changed"
  | "request-schema-property-enum-changed"
  | "operation-deprecated-changed"
  | "response-schema-property-format-changed"
  | "request-schema-property-format-changed"
  | "request-schema-nullable-changed"
  | "response-schema-items-format-changed"
  | "request-schema-items-format-changed"
  | "response-schema-property-nullable-changed"
  | "request-schema-property-nullable-changed"
  | "response-schema-items-enum-changed"
  | "request-schema-items-enum-changed"
  | "response-schema-items-nullable-changed"
  | "request-schema-items-nullable-changed"
  | "parameter-deprecated-changed"
  | "response-schema-property-readonly-changed"
  | "request-schema-property-readonly-changed"
  | "response-schema-property-writeonly-changed"
  | "request-schema-property-writeonly-changed"
  | "response-schema-property-constraint-changed"
  | "request-schema-property-constraint-changed"
  | "parameter-constraint-changed"
  | "response-schema-items-constraint-changed"
  | "request-schema-items-constraint-changed"
  | "parameter-nullable-changed"
  | "request-schema-format-changed"
  | "response-schema-format-changed"
  | "request-schema-enum-changed"
  | "response-schema-enum-changed"
  | "parameter-items-type-changed"
  | "parameter-items-format-changed"
  | "parameter-items-enum-changed"
  | "parameter-items-nullable-changed"
  | "parameter-items-constraint-changed"
  | "response-schema-items-readonly-changed"
  | "request-schema-items-readonly-changed"
  | "response-schema-items-writeonly-changed"
  | "request-schema-items-writeonly-changed"
  | "request-schema-additional-properties-changed"
  | "response-schema-additional-properties-changed"
  | "request-schema-property-additional-properties-changed"
  | "response-schema-property-additional-properties-changed"
  | "request-schema-items-additional-properties-changed"
  | "response-schema-items-additional-properties-changed"
  | "request-schema-readonly-changed"
  | "response-schema-readonly-changed"
  | "request-schema-writeonly-changed"
  | "response-schema-writeonly-changed"
  | "response-header-removed"
  | "response-header-added"
  | "response-header-type-changed"
  | "operation-id-changed"
  | "server-removed"
  | "server-added"
  | "operation-security-scheme-removed"
  | "operation-security-scheme-added"
  | "operation-security-scope-added"
  | "operation-security-scope-removed"
  | "response-header-required-changed"
  | "response-header-format-changed"
  | "response-header-enum-changed"
  | "response-header-nullable-changed"
  | "response-media-type-removed"
  | "response-media-type-added"
  | "request-media-type-removed"
  | "request-media-type-added";

/** A raw structural difference between two specs before classification. */
export interface OapiRawChange {
  type: OapiChangeType;
  path: string;
  method: HttpMethod;
  location: string;
  before: unknown;
  after: unknown;
}

// ─── Classification types ───────────────────────────────────────────────────

export type Severity = "BREAKING" | "SAFE" | "INFO";

/** A classified change with a human-readable message. */
export interface BreakingChange {
  severity: Severity;
  type: OapiChangeType;
  path: string;
  method: HttpMethod;
  location: string;
  message: string;
  before: unknown;
  after: unknown;
}

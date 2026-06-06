/** Core data types for the OpenAPI breaking-change engine. */

export type HttpMethod = "get" | "post" | "put" | "delete" | "patch" | "head" | "options" | "trace";

/** Normalized schema node (subset of JSON Schema / OpenAPI schema object). */
export interface OapiSchema {
  type?: string;
  format?: string;
  nullable?: boolean;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, OapiSchema>;
  items?: OapiSchema;
  allOf?: OapiSchema[];
  oneOf?: OapiSchema[];
  anyOf?: OapiSchema[];
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
}

/** A single response by status code. */
export interface OapiResponse {
  statusCode: string;
  schema: OapiSchema | null;
}

/** One HTTP operation: a path + method + its inputs/outputs. */
export interface OapiOperation {
  path: string;
  method: HttpMethod;
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
  | "request-schema-items-type-changed";

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

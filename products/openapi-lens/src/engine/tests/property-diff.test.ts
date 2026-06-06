/**
 * Tests for property-level diff (Phase 0 extension).
 * Covers response/request schema property type changes, removals, and additions.
 */
import { describe, expect, it } from "vitest";
import { analyzeOpenApiDiff, breakingOnly } from "../index.js";

function makeSpec(responseProperties: string, requestProperties?: string): string {
  return `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                required: [id, price]
                properties:
${responseProperties}
    ${requestProperties ? `post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
${requestProperties}
      responses:
        "201":
          description: created` : ""}
`;
}

const BASE_RESPONSE_PROPS = `                  id:
                    type: string
                  price:
                    type: number
                  description:
                    type: string`;

describe("property-level diff — response schema properties", () => {
  it("detects BREAKING when a response property type changes (number → string)", () => {
    const baseline = makeSpec(`                  id:
                    type: string
                  price:
                    type: number`);
    const current = makeSpec(`                  id:
                    type: string
                  price:
                    type: string`);
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "response-schema-property-type-changed")).toBe(true);
    const change = breaking.find((c) => c.type === "response-schema-property-type-changed")!;
    expect(change.before).toBe("number");
    expect(change.after).toBe("string");
    expect(change.location).toMatch(/price/);
  });

  it("detects BREAKING when a response property is removed", () => {
    const baseline = makeSpec(`                  id:
                    type: string
                  price:
                    type: number`);
    const current = makeSpec(`                  id:
                    type: string`);
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "response-schema-property-removed")).toBe(true);
    const removed = breaking.find((c) => c.type === "response-schema-property-removed")!;
    expect(removed.location).toMatch(/price/);
    expect(removed.before).toBe("number");
    expect(removed.after).toBeNull();
  });

  it("detects INFO when a new response property is added", () => {
    const baseline = makeSpec(`                  id:
                    type: string`);
    const current = makeSpec(`                  id:
                    type: string
                  createdAt:
                    type: string`);
    const changes = analyzeOpenApiDiff(baseline, current);
    const added = changes.find((c) => c.type === "response-schema-property-added")!;
    expect(added).toBeDefined();
    expect(added.severity).toBe("INFO");
    expect(added.location).toMatch(/createdAt/);
  });

  it("does not emit property-type-changed when types are identical", () => {
    const s = makeSpec(BASE_RESPONSE_PROPS);
    const changes = analyzeOpenApiDiff(s, s);
    expect(changes.filter((c) => c.type === "response-schema-property-type-changed")).toHaveLength(0);
  });

  it("handles multiple property type changes in a single response schema", () => {
    const baseline = makeSpec(`                  id:
                    type: string
                  price:
                    type: number
                  quantity:
                    type: integer`);
    const current = makeSpec(`                  id:
                    type: integer
                  price:
                    type: string
                  quantity:
                    type: integer`);
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChanges = changes.filter((c) => c.type === "response-schema-property-type-changed");
    expect(typeChanges).toHaveLength(2);
    const locations = typeChanges.map((c) => c.location);
    expect(locations.some((l) => l.includes("id"))).toBe(true);
    expect(locations.some((l) => l.includes("price"))).toBe(true);
  });

  it("does not emit property changes when a response has no schema (204 no content)", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items/{id}:
    delete:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "204":
          description: no content
`;
    expect(() => analyzeOpenApiDiff(baseline, baseline)).not.toThrow();
    expect(analyzeOpenApiDiff(baseline, baseline)).toHaveLength(0);
  });
});

describe("property-level diff — request schema properties", () => {
  const BASE_REQ_PROPS = `                  name:
                    type: string
                  email:
                    type: string`;

  it("detects BREAKING when a request body property type changes", () => {
    const baseline = makeSpec(`                  id:
                    type: string`, BASE_REQ_PROPS);
    const current = makeSpec(`                  id:
                    type: string`, `                  name:
                    type: string
                  email:
                    type: integer`);
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "request-schema-property-type-changed")).toBe(true);
    const change = breaking.find((c) => c.type === "request-schema-property-type-changed")!;
    expect(change.before).toBe("string");
    expect(change.after).toBe("integer");
    expect(change.location).toMatch(/email/);
  });

  it("detects BREAKING when a request body property is removed", () => {
    const baseline = makeSpec(`                  id:
                    type: string`, BASE_REQ_PROPS);
    const current = makeSpec(`                  id:
                    type: string`, `                  name:
                    type: string`);
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "request-schema-property-removed")).toBe(true);
  });

  it("detects INFO when a new request body property is added (P2-1 fix: correct type)", () => {
    const baseline = makeSpec(`                  id:
                    type: string`, `                  name:
                    type: string`);
    const current = makeSpec(`                  id:
                    type: string`, `                  name:
                    type: string
                  phone:
                    type: string`);
    const changes = analyzeOpenApiDiff(baseline, current);
    const added = changes.find((c) => c.type === "request-schema-property-added");
    expect(added).toBeDefined();
    expect(added?.severity).toBe("INFO");
    expect(added?.location).toMatch(/phone/);
    // Must NOT be classified as response-schema-property-added
    expect(changes.some((c) => c.type === "response-schema-property-added" && c.location.includes("phone"))).toBe(false);
  });
});

// ─── Array items diffing (5.7.5 fix, 2026-06-06) ──────────────────────────

function makeArraySpec(responseItemType: string, requestItemType?: string): string {
  return `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /list:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: ${responseItemType}
    ${requestItemType ? `post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: ${requestItemType}
      responses:
        "201":
          description: created` : ""}
`;
}

describe("array items diff — response", () => {
  it("detects BREAKING when response array element type changes (string → integer)", () => {
    const baseline = makeArraySpec("string");
    const current = makeArraySpec("integer");
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "response-schema-items-type-changed")).toBe(true);
    const change = breaking.find((c) => c.type === "response-schema-items-type-changed")!;
    expect(change.before).toBe("string");
    expect(change.after).toBe("integer");
    expect(change.location).toMatch(/items/);
  });

  it("does not emit items-type-changed when element type is unchanged", () => {
    const s = makeArraySpec("string");
    const changes = analyzeOpenApiDiff(s, s);
    expect(changes.filter((c) => c.type === "response-schema-items-type-changed")).toHaveLength(0);
  });

  it("detects INFO when response gains an items type constraint (was unspecified)", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /list:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
`;
    const current = makeArraySpec("string");
    const changes = analyzeOpenApiDiff(baseline, current);
    const change = changes.find((c) => c.type === "response-schema-items-type-changed");
    expect(change).toBeDefined();
    expect(change?.severity).toBe("INFO");
    expect(change?.before).toBeNull();
    expect(change?.after).toBe("string");
  });

  it("detects BREAKING when response loses its items type constraint", () => {
    const baseline = makeArraySpec("string");
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /list:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "response-schema-items-type-changed")).toBe(true);
    const change = breaking.find((c) => c.type === "response-schema-items-type-changed")!;
    expect(change.before).toBe("string");
    expect(change.after).toBeNull();
  });
});

describe("array items diff — request body", () => {
  it("detects BREAKING when request body array element type changes (string → integer)", () => {
    const baseline = makeArraySpec("string", "string");
    const current = makeArraySpec("string", "integer");
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "request-schema-items-type-changed")).toBe(true);
    const change = breaking.find((c) => c.type === "request-schema-items-type-changed")!;
    expect(change.before).toBe("string");
    expect(change.after).toBe("integer");
    expect(change.location).toMatch(/items/);
  });

  it("does not emit items-type-changed when request array element type is unchanged", () => {
    const s = makeArraySpec("number", "number");
    const changes = analyzeOpenApiDiff(s, s);
    expect(changes.filter((c) => c.type === "request-schema-items-type-changed")).toHaveLength(0);
  });

  it("detects BREAKING when response array element format changes (uuid → uri)", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /list:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                  format: uuid
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /list:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                  format: uri
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "response-schema-items-format-changed")).toBe(true);
    const change = breaking.find((c) => c.type === "response-schema-items-format-changed")!;
    expect(change.before).toBe("uuid");
    expect(change.after).toBe("uri");
  });

  it("does not conflate response and request items changes", () => {
    const baseline = makeArraySpec("string", "string");
    const current = makeArraySpec("integer", "boolean");
    const changes = analyzeOpenApiDiff(baseline, current);
    const responseChange = changes.find((c) => c.type === "response-schema-items-type-changed")!;
    const requestChange = changes.find((c) => c.type === "request-schema-items-type-changed")!;
    expect(responseChange).toBeDefined();
    expect(requestChange).toBeDefined();
    expect(responseChange.after).toBe("integer");
    expect(requestChange.after).toBe("boolean");
  });
});

// ─── Property-level enum diffing (5.7.5 continuation, 2026-06-06) ──────────

function makeEnumSpec(responseEnumValues: string[], requestEnumValues?: string[]): string {
  const respEnum = responseEnumValues.map((v) => `                      - ${v}`).join("\n");
  const reqEnum = requestEnumValues ? requestEnumValues.map((v) => `                      - ${v}`).join("\n") : "";
  return `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum:
${respEnum}
    ${requestEnumValues ? `post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  enum:
${reqEnum}
      responses:
        "201":
          description: created` : ""}
`;
}

describe("property-level enum diff — request schema", () => {
  it("detects BREAKING when a request schema property loses an enum value", () => {
    const baseline = makeEnumSpec(["pending", "active", "inactive"], ["pending", "active", "inactive"]);
    const current = makeEnumSpec(["pending", "active", "inactive"], ["active", "inactive"]);
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "request-schema-property-enum-changed")).toBe(true);
    const change = breaking.find((c) => c.type === "request-schema-property-enum-changed")!;
    expect(change.message).toMatch(/pending/);
    expect(change.message).toMatch(/no longer accepted/);
  });

  it("detects INFO when a request schema property gains an enum value", () => {
    const baseline = makeEnumSpec(["active", "inactive"], ["active", "inactive"]);
    const current = makeEnumSpec(["active", "inactive"], ["active", "inactive", "pending"]);
    const changes = analyzeOpenApiDiff(baseline, current);
    const info = changes.find((c) => c.type === "request-schema-property-enum-changed");
    expect(info).toBeDefined();
    expect(info?.severity).toBe("INFO");
    expect(info?.message).toMatch(/pending/);
  });

  it("does not emit enum-changed when request enum is unchanged", () => {
    const s = makeEnumSpec(["active", "inactive"], ["active", "inactive"]);
    expect(analyzeOpenApiDiff(s, s).filter((c) => c.type === "request-schema-property-enum-changed")).toHaveLength(0);
  });
});

describe("property-level enum diff — response schema", () => {
  it("detects BREAKING when a response schema property gains an enum value (exhaustive clients break)", () => {
    const baseline = makeEnumSpec(["active", "inactive"]);
    const current = makeEnumSpec(["active", "inactive", "pending"]);
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "response-schema-property-enum-changed")).toBe(true);
    const change = breaking.find((c) => c.type === "response-schema-property-enum-changed")!;
    expect(change.message).toMatch(/pending/);
    expect(change.message).toMatch(/exhaustive/);
  });

  it("detects INFO when a response schema property loses an enum value", () => {
    const baseline = makeEnumSpec(["active", "inactive", "pending"]);
    const current = makeEnumSpec(["active", "inactive"]);
    const changes = analyzeOpenApiDiff(baseline, current);
    const info = changes.find((c) => c.type === "response-schema-property-enum-changed");
    expect(info).toBeDefined();
    expect(info?.severity).toBe("INFO");
    expect(info?.message).toMatch(/pending/);
    expect(info?.message).toMatch(/no longer returned/);
  });

  it("does not emit enum-changed when response enum is unchanged", () => {
    const s = makeEnumSpec(["active", "inactive"]);
    expect(analyzeOpenApiDiff(s, s).filter((c) => c.type === "response-schema-property-enum-changed")).toHaveLength(0);
  });
});

// ─── Deprecated operation detection (5.7.5 continuation, 2026-06-06) ───────

const SIMPLE_SPEC = (deprecated: boolean) => `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      ${deprecated ? "deprecated: true" : ""}
      responses:
        "200":
          description: ok
`;

describe("operation deprecated detection", () => {
  it("detects INFO when an operation is deprecated (false → true)", () => {
    const baseline = SIMPLE_SPEC(false);
    const current = SIMPLE_SPEC(true);
    const changes = analyzeOpenApiDiff(baseline, current);
    const dep = changes.find((c) => c.type === "operation-deprecated-changed");
    expect(dep).toBeDefined();
    expect(dep?.severity).toBe("INFO");
    expect(dep?.before).toBe(false);
    expect(dep?.after).toBe(true);
    expect(dep?.message).toMatch(/deprecated/i);
  });

  it("detects INFO when an operation is un-deprecated (true → false)", () => {
    const baseline = SIMPLE_SPEC(true);
    const current = SIMPLE_SPEC(false);
    const changes = analyzeOpenApiDiff(baseline, current);
    const dep = changes.find((c) => c.type === "operation-deprecated-changed");
    expect(dep).toBeDefined();
    expect(dep?.severity).toBe("INFO");
    expect(dep?.before).toBe(true);
    expect(dep?.after).toBe(false);
    expect(dep?.message).toMatch(/un-deprecated/i);
  });

  it("does not emit deprecated-changed when deprecated flag is unchanged", () => {
    const s = SIMPLE_SPEC(true);
    expect(analyzeOpenApiDiff(s, s).filter((c) => c.type === "operation-deprecated-changed")).toHaveLength(0);
  });
});

// ─── Property-level format diffing (5.7.5 continuation, 2026-06-06) ─────────

function makeFormatSpec(responseFormat: string | null, requestFormat?: string | null): string {
  const respFmtLine = responseFormat ? `\n                    format: ${responseFormat}` : "";
  const reqFmtLine = requestFormat ? `\n                  format: ${requestFormat}` : "";
  return `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  createdAt:
                    type: string${respFmtLine}
    ${requestFormat !== undefined ? `post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                expiresAt:
                  type: string${reqFmtLine}
      responses:
        "201":
          description: created` : ""}
`;
}

describe("property-level format diff", () => {
  it("detects BREAKING when a response schema property format changes (date → date-time)", () => {
    const baseline = makeFormatSpec("date");
    const current = makeFormatSpec("date-time");
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "response-schema-property-format-changed")).toBe(true);
    const change = breaking.find((c) => c.type === "response-schema-property-format-changed")!;
    expect(change.before).toBe("date");
    expect(change.after).toBe("date-time");
    expect(change.location).toMatch(/createdAt/);
  });

  it("detects BREAKING when a request schema property format changes (int32 → int64)", () => {
    const baseline = makeFormatSpec(null, "int32");
    const current = makeFormatSpec(null, "int64");
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "request-schema-property-format-changed")).toBe(true);
    const change = breaking.find((c) => c.type === "request-schema-property-format-changed")!;
    expect(change.before).toBe("int32");
    expect(change.after).toBe("int64");
    expect(change.location).toMatch(/expiresAt/);
  });

  it("does not emit format-changed when property format is unchanged", () => {
    const s = makeFormatSpec("date-time");
    expect(analyzeOpenApiDiff(s, s).filter((c) => c.type === "response-schema-property-format-changed")).toHaveLength(0);
  });

  it("does not conflate response and request format changes", () => {
    const baseline = makeFormatSpec("date", "int32");
    const current = makeFormatSpec("date-time", "int64");
    const changes = analyzeOpenApiDiff(baseline, current);
    const responseChange = changes.find((c) => c.type === "response-schema-property-format-changed")!;
    const requestChange = changes.find((c) => c.type === "request-schema-property-format-changed")!;
    expect(responseChange).toBeDefined();
    expect(requestChange).toBeDefined();
    expect(responseChange.before).toBe("date");
    expect(requestChange.before).toBe("int32");
  });
});

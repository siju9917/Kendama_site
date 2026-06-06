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

  it("does not emit items-type-changed when baseline has no items schema", () => {
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
    expect(changes.filter((c) => c.type === "response-schema-items-type-changed")).toHaveLength(0);
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

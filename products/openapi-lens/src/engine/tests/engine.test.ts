/**
 * Integration tests for the full analyzeOpenApiDiff() pipeline.
 * Exercises parse → diff → classify end-to-end.
 */
import { describe, expect, it } from "vitest";
import { analyzeOpenApiDiff, breakingOnly } from "../index.js";

const BASE = `
openapi: "3.0.0"
info:
  title: Widget API
  version: "1.0.0"
paths:
  /widgets:
    get:
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
        - name: status
          in: query
          required: false
          schema:
            type: string
            enum: [active, inactive]
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Widget"
        "400":
          description: bad request
  /widgets/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Widget"
        "404":
          description: not found
    delete:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "204":
          description: deleted
  /widgets/{id}/notes:
    post:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [text]
              properties:
                text:
                  type: string
                priority:
                  type: string
      responses:
        "201":
          description: created
components:
  schemas:
    Widget:
      type: object
      required: [id, name]
      properties:
        id:
          type: string
        name:
          type: string
        description:
          type: string
`;

describe("analyzeOpenApiDiff — integration", () => {
  it("returns no changes when specs are identical", () => {
    const changes = analyzeOpenApiDiff(BASE, BASE);
    expect(changes).toHaveLength(0);
  });

  it("detects a BREAKING removal of an entire endpoint", () => {
    const current = BASE.replace(
      "    delete:\n      parameters:\n        - name: id\n          in: path\n          required: true\n          schema:\n            type: string\n      responses:\n        \"204\":\n          description: deleted\n",
      "",
    );
    const changes = analyzeOpenApiDiff(BASE, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "endpoint-removed" && c.method === "delete")).toBe(true);
  });

  it("detects adding a new endpoint as INFO (non-breaking)", () => {
    const currentWithHealth = `
openapi: "3.0.0"
info:
  title: Widget API
  version: "1.0.0"
paths:
  /widgets:
    get:
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
        - name: status
          in: query
          required: false
          schema:
            type: string
            enum: [active, inactive]
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
        "400":
          description: bad request
  /health:
    get:
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(`
openapi: "3.0.0"
info:
  title: Widget API
  version: "1.0.0"
paths:
  /widgets:
    get:
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
        - name: status
          in: query
          required: false
          schema:
            type: string
            enum: [active, inactive]
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
        "400":
          description: bad request
`, currentWithHealth);
    const newEndpoint = changes.find((c) => c.type === "endpoint-added" && c.path === "/health");
    expect(newEndpoint).toBeDefined();
    expect(newEndpoint?.severity).toBe("INFO");
  });

  it("detects BREAKING when a query param becomes required", () => {
    const current = BASE.replace(
      "          required: false\n          schema:\n            type: integer",
      "          required: true\n          schema:\n            type: integer",
    );
    const changes = analyzeOpenApiDiff(BASE, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "parameter-required-changed" && c.before === false && c.after === true)).toBe(true);
  });

  it("detects BREAKING when an enum value is removed", () => {
    const current = BASE.replace(
      "            enum: [active, inactive]",
      "            enum: [active]",
    );
    const changes = analyzeOpenApiDiff(BASE, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "parameter-enum-changed")).toBe(true);
    const enumChange = breaking.find((c) => c.type === "parameter-enum-changed")!;
    expect(enumChange.message).toMatch(/inactive/);
  });

  it("detects BREAKING when a required request body field is added", () => {
    const current = BASE.replace(
      "              required: [text]",
      "              required: [text, priority]",
    );
    const changes = analyzeOpenApiDiff(BASE, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "request-schema-field-required-added")).toBe(true);
  });

  it("detects BREAKING when a response 404 is removed from /widgets/{id}", () => {
    const current = BASE.replace("        \"404\":\n          description: not found\n", "");
    const changes = analyzeOpenApiDiff(BASE, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "response-status-removed")).toBe(true);
  });

  it("detects BREAKING when a required field is dropped from Widget schema in response", () => {
    const current = BASE.replace(
      "      required: [id, name]",
      "      required: [id]",
    );
    const changes = analyzeOpenApiDiff(BASE, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "response-schema-field-required-removed")).toBe(true);
  });

  it("breakingOnly filters out INFO changes", () => {
    const mixed = `
openapi: "3.0.0"
info:
  title: Widget API
  version: "1.0.0"
paths:
  /widgets:
    get:
      parameters:
        - name: limit
          in: query
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: ok
  /new-endpoint:
    get:
      responses:
        "200":
          description: ok
`;
    const baseline = `
openapi: "3.0.0"
info:
  title: Widget API
  version: "1.0.0"
paths:
  /widgets:
    get:
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
      responses:
        "200":
          description: ok
`;
    const all = analyzeOpenApiDiff(baseline, mixed);
    const breaking = breakingOnly(all);
    expect(all.length).toBeGreaterThan(breaking.length);
    expect(breaking.every((c) => c.severity === "BREAKING")).toBe(true);
  });

  it("handles a JSON format baseline spec", () => {
    const jsonBase = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "T", version: "1" },
      paths: {
        "/items": {
          get: {
            parameters: [{ name: "q", in: "query", required: false, schema: { type: "string" } }],
            responses: { "200": { description: "ok" } },
          },
        },
      },
    });
    const changes = analyzeOpenApiDiff(jsonBase, jsonBase);
    expect(changes).toHaveLength(0);
  });

  it("all changes have path, method, location, message fields", () => {
    const current = BASE.replace(
      "          required: false\n          schema:\n            type: integer",
      "          required: true\n          schema:\n            type: integer",
    );
    const changes = analyzeOpenApiDiff(BASE, current);
    for (const c of changes) {
      expect(c.path).toBeTruthy();
      expect(c.method).toBeTruthy();
      expect(c.location).toBeTruthy();
      expect(c.message).toBeTruthy();
    }
  });

  it("detects BREAKING when a shared $ref parameter becomes required (components/parameters)", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - $ref: "#/components/parameters/limitParam"
      responses:
        "200":
          description: ok
components:
  parameters:
    limitParam:
      name: limit
      in: query
      required: false
      schema:
        type: integer
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - $ref: "#/components/parameters/limitParam"
      responses:
        "200":
          description: ok
components:
  parameters:
    limitParam:
      name: limit
      in: query
      required: true
      schema:
        type: integer
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking).toHaveLength(1);
    expect(breaking[0]?.type).toBe("parameter-required-changed");
    expect(breaking[0]?.before).toBe(false);
    expect(breaking[0]?.after).toBe(true);
  });

  it("detects BREAKING when a shared parameter is removed from components/parameters (inline replace)", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - $ref: "#/components/parameters/apiKeyParam"
      responses:
        "200":
          description: ok
components:
  parameters:
    apiKeyParam:
      name: X-API-Key
      in: header
      required: true
      schema:
        type: string
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "parameter-removed")).toBe(true);
    const removed = breaking.find((c) => c.type === "parameter-removed")!;
    expect(removed.location).toMatch(/X-API-Key/);
  });

  it("detects INFO when a new shared $ref parameter is added (optional)", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - $ref: "#/components/parameters/cursorParam"
      responses:
        "200":
          description: ok
components:
  parameters:
    cursorParam:
      name: cursor
      in: query
      required: false
      schema:
        type: string
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const added = changes.find((c) => c.type === "parameter-added")!;
    expect(added).toBeDefined();
    expect(added.severity).toBe("INFO");
  });

  it("detects BREAKING when a required request body is removed from the spec", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        "201":
          description: created
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    post:
      responses:
        "201":
          description: created
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "request-body-required-changed")).toBe(true);
    const change = breaking.find((c) => c.type === "request-body-required-changed")!;
    expect(change.before).toBe(true);
    expect(change.after).toBeNull();
    expect(change.message).toMatch(/required request body removed/i);
  });

  it("cursor→page_token pagination migration: BREAKING removal + INFO addition", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - $ref: "#/components/parameters/cursorParam"
      responses:
        "200":
          description: ok
components:
  parameters:
    cursorParam:
      name: cursor
      in: query
      required: false
      schema:
        type: string
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - $ref: "#/components/parameters/pageTokenParam"
      responses:
        "200":
          description: ok
components:
  parameters:
    pageTokenParam:
      name: page_token
      in: query
      required: false
      schema:
        type: string
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const breaking = breakingOnly(changes);
    const info = changes.filter((c) => c.severity === "INFO");
    expect(breaking.some((c) => c.type === "parameter-removed")).toBe(true);
    expect(info.some((c) => c.type === "parameter-added")).toBe(true);
  });
});

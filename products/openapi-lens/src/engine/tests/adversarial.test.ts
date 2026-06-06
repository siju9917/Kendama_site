/**
 * Adversarial probes for the openapi-lens engine.
 * 5.7.2 second independent hard pass — attacks inputs the spec did not anticipate.
 * Plus pin tests from Phase 0 critique panel (P1/P2 findings).
 */
import { describe, expect, it } from "vitest";
import { analyzeOpenApiDiff, breakingOnly, parseOapiSpec } from "../index.js";
import { diffSpecs } from "../diff.js";

// ─── Parser adversarial ────────────────────────────────────────────────────

describe("parser — adversarial inputs", () => {
  it("handles a spec with NO paths key (not even empty map)", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
`);
    expect(spec.operations).toHaveLength(0);
  });

  it("handles a spec where paths values are not objects (skips them silently)", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /broken: "not an object"
  /valid:
    get:
      responses:
        "200":
          description: ok
`);
    expect(spec.operations).toHaveLength(1);
    expect(spec.operations[0]?.path).toBe("/valid");
  });

  it("distinguishes parameters with same name but different 'in' (path vs query)", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: id
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: ok
`);
    const op = spec.operations[0]!;
    expect(op.parameters).toHaveLength(2);
    const pathParam = op.parameters.find((p) => p.in === "path" && p.name === "id");
    const queryParam = op.parameters.find((p) => p.in === "query" && p.name === "id");
    expect(pathParam).toBeDefined();
    expect(queryParam).toBeDefined();
  });

  it("handles schema with no properties or required fields (empty object schema)", () => {
    const spec = parseOapiSpec(`
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
`);
    const op = spec.operations[0]!;
    const schema = op.responses["200"]?.schema;
    expect(schema?.type).toBe("object");
    expect(schema?.required).toBeUndefined();
    expect(schema?.properties).toBeUndefined();
  });

  it("handles schema with enum: [] (empty enum)", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: status
          in: query
          required: false
          schema:
            type: string
            enum: []
      responses:
        "200":
          description: ok
`);
    const param = spec.operations[0]?.parameters[0];
    expect(param?.schema.enum).toEqual([]);
  });

  it("handles a parameter with no schema key (bare inline type)", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: q
          in: query
          required: false
          type: string
      responses:
        "200":
          description: ok
`);
    expect(spec.operations[0]?.parameters).toHaveLength(1);
  });

  it("handles content type other than application/json (uses first available)", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /upload:
    post:
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [file]
              properties:
                file:
                  type: string
      responses:
        "200":
          description: ok
`);
    const op = spec.operations[0]!;
    expect(op.requestBody?.required).toBe(true);
    expect(op.requestBody?.schema?.type).toBe("object");
  });
});

// ─── Diff adversarial ─────────────────────────────────────────────────────

describe("diff — adversarial inputs", () => {
  it("same parameter name in path vs query — only the changed one generates a change", () => {
    const baseline = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: id
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: ok
`);
    const current = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
        - name: id
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: ok
`);
    const changes = diffSpecs(baseline, current);
    const typeChanges = changes.filter((c) => c.type === "parameter-type-changed");
    expect(typeChanges).toHaveLength(1);
    expect(typeChanges[0]?.location).toMatch(/path:id/);
  });

  it("parameter changes on GET do not bleed into POST on the same path", () => {
    const baseline = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: sort
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: ok
    post:
      parameters:
        - name: sort
          in: query
          required: false
          schema:
            type: string
      responses:
        "201":
          description: created
`);
    const current = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: sort
          in: query
          required: true
          schema:
            type: string
      responses:
        "200":
          description: ok
    post:
      parameters:
        - name: sort
          in: query
          required: false
          schema:
            type: string
      responses:
        "201":
          description: created
`);
    const changes = diffSpecs(baseline, current);
    const requiredChanges = changes.filter((c) => c.type === "parameter-required-changed");
    expect(requiredChanges).toHaveLength(1);
    expect(requiredChanges[0]?.method).toBe("get");
  });

  it("empty enum → non-empty enum is detected as a change", () => {
    const baseline = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: status
          in: query
          required: false
          schema:
            type: string
            enum: []
      responses:
        "200":
          description: ok
`);
    const current = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: status
          in: query
          required: false
          schema:
            type: string
            enum: [active]
      responses:
        "200":
          description: ok
`);
    const changes = diffSpecs(baseline, current);
    const enumChanges = changes.filter((c) => c.type === "parameter-enum-changed");
    expect(enumChanges).toHaveLength(1);
  });

  it("multiple required fields added in one change emit separate events", () => {
    const baseline = parseOapiSpec(`
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
              required: [name]
              properties:
                name:
                  type: string
                email:
                  type: string
                phone:
                  type: string
      responses:
        "201":
          description: created
`);
    const current = parseOapiSpec(`
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
              required: [name, email, phone]
              properties:
                name:
                  type: string
                email:
                  type: string
                phone:
                  type: string
      responses:
        "201":
          description: created
`);
    const changes = diffSpecs(baseline, current);
    const requiredAdded = changes.filter((c) => c.type === "request-schema-field-required-added");
    expect(requiredAdded).toHaveLength(2);
  });

  it("a null response schema does not cause an error (no content in response)", () => {
    const baseline = parseOapiSpec(`
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
`);
    expect(() => diffSpecs(baseline, baseline)).not.toThrow();
    expect(diffSpecs(baseline, baseline)).toHaveLength(0);
  });
});

// ─── Classify adversarial ─────────────────────────────────────────────────

describe("classify — adversarial inputs", () => {
  it("enum changed from [a, b] to [] is BREAKING (all values removed)", () => {
    const changes = analyzeOpenApiDiff(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: status
          in: query
          required: false
          schema:
            type: string
            enum: [active, inactive]
      responses:
        "200":
          description: ok
`, `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: status
          in: query
          required: false
          schema:
            type: string
            enum: []
      responses:
        "200":
          description: ok
`);
    const breaking = breakingOnly(changes);
    expect(breaking.some((c) => c.type === "parameter-enum-changed")).toBe(true);
  });

  it("a parameter added with required:true produces a BREAKING change", () => {
    const result = analyzeOpenApiDiff(`
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
`, `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: api_key
          in: header
          required: true
          schema:
            type: string
      responses:
        "200":
          description: ok
`);
    const breaking = breakingOnly(result);
    expect(breaking).toHaveLength(1);
    expect(breaking[0]?.type).toBe("parameter-added");
    expect(breaking[0]?.severity).toBe("BREAKING");
  });

  it("invalid input throws with a clear error message (P2-2 contract pin)", () => {
    expect(() => parseOapiSpec("")).toThrow(/Invalid OpenAPI spec/);
    expect(() => parseOapiSpec("not: yaml: at all: [[[")).toThrow();
    expect(() => parseOapiSpec("42")).toThrow(/Invalid OpenAPI spec/);
  });

  it("a circular $ref terminates gracefully — returns empty schema without stack overflow (P1-1 fix)", () => {
    // Node schema references itself via $ref: "#/components/schemas/Node"
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /nodes:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Node"
components:
  schemas:
    Node:
      type: object
      properties:
        value:
          type: string
        next:
          $ref: "#/components/schemas/Node"
`);
    // Should not throw. The 'next' property resolves to the Node schema (first pass succeeds).
    // The SECOND level of recursion (Node.properties.next.next) is terminated by the cycle guard.
    const op = spec.operations[0]!;
    const schema = op.responses["200"]?.schema;
    expect(schema?.type).toBe("object");
    const nextProp = schema?.properties?.["next"];
    expect(nextProp).toBeDefined();
    // First recursion level resolved: next has type object (the Node schema)
    expect(nextProp?.type).toBe("object");
    // Second recursion level is terminated: next.next is {} (empty schema, no type)
    const nextNextProp = nextProp?.properties?.["next"];
    expect(nextNextProp).toBeDefined();
    expect(nextNextProp?.type).toBeUndefined();
  });

  it("allOf/oneOf composition schemas are stored but NOT merged for diffing (P2-3 pin)", () => {
    const spec = parseOapiSpec(`
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
                allOf:
                  - $ref: "#/components/schemas/Base"
                  - properties:
                      extra:
                        type: string
components:
  schemas:
    Base:
      type: object
      properties:
        id:
          type: string
`);
    // allOf is parsed; base properties are NOT merged into the top-level schema
    const op = spec.operations[0]!;
    const schema = op.responses["200"]?.schema;
    expect(schema?.allOf).toBeDefined();
    expect(schema?.allOf).toHaveLength(2);
    // No top-level 'id' or 'extra' property (merging is a known limitation, not performed)
    expect(schema?.properties?.["id"]).toBeUndefined();
    expect(schema?.properties?.["extra"]).toBeUndefined();
    // Diffing two identical allOf specs produces no changes
    expect(analyzeOpenApiDiff(
      `openapi: "3.0.0"\ninfo:\n  title: T\n  version: "1"\npaths:\n  /items:\n    get:\n      responses:\n        "200":\n          content:\n            application/json:\n              schema:\n                allOf:\n                  - type: object`,
      `openapi: "3.0.0"\ninfo:\n  title: T\n  version: "1"\npaths:\n  /items:\n    get:\n      responses:\n        "200":\n          content:\n            application/json:\n              schema:\n                allOf:\n                  - type: object`,
    )).toHaveLength(0);
  });

  it("a non-local $ref (remote or relative file) silently resolves to empty schema (P2-4 pin)", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /pets:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: "./pet.yaml#/definitions/Pet"
`);
    // Remote/file refs return {} — no throw, no type, no properties
    const op = spec.operations[0]!;
    const schema = op.responses["200"]?.schema;
    // null because the resolved schema is empty (no keys)
    expect(schema).toBeNull();
  });

  it("removing all parameters from an endpoint does not emit a false positive on endpoint-removed", () => {
    const result = analyzeOpenApiDiff(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: q
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: ok
`, `
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
`);
    const endpointRemoved = result.find((c) => c.type === "endpoint-removed");
    expect(endpointRemoved).toBeUndefined();
    const paramRemoved = result.find((c) => c.type === "parameter-removed");
    expect(paramRemoved).toBeDefined();
  });

  it("parameter schema via $ref to components/schemas — enum change detected correctly", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: status
          in: query
          required: false
          schema:
            $ref: "#/components/schemas/StatusEnum"
      responses:
        "200":
          description: ok
components:
  schemas:
    StatusEnum:
      type: string
      enum: [active, inactive, pending]
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
        - name: status
          in: query
          required: false
          schema:
            $ref: "#/components/schemas/StatusEnum"
      responses:
        "200":
          description: ok
components:
  schemas:
    StatusEnum:
      type: string
      enum: [active, inactive]
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "parameter-enum-changed");
    expect(enumChange).toBeDefined();
    expect(enumChange?.severity).toBe("BREAKING");
    expect(enumChange?.message).toMatch(/pending/);
  });

  it("a $ref parameter whose schema references components/schemas — type change detected", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - $ref: "#/components/parameters/idParam"
      responses:
        "200":
          description: ok
components:
  parameters:
    idParam:
      name: id
      in: path
      required: true
      schema:
        $ref: "#/components/schemas/IdType"
  schemas:
    IdType:
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
        - $ref: "#/components/parameters/idParam"
      responses:
        "200":
          description: ok
components:
  parameters:
    idParam:
      name: id
      in: path
      required: true
      schema:
        $ref: "#/components/schemas/IdType"
  schemas:
    IdType:
      type: integer
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "parameter-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.before).toBe("string");
    expect(typeChange?.after).toBe("integer");
    expect(typeChange?.severity).toBe("BREAKING");
  });
});

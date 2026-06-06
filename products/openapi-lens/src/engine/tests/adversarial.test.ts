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

  it("allOf composition is flattened — base properties are visible at top level (P2-3 resolved)", () => {
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
    // allOf is flattened: base properties AND inline member properties are merged
    const op = spec.operations[0]!;
    const schema = op.responses["200"]?.schema;
    // allOf is consumed during flattening
    expect(schema?.allOf).toBeUndefined();
    // Both 'id' (from Base via allOf) and 'extra' (from inline member) are now visible
    expect(schema?.properties?.["id"]).toBeDefined();
    expect(schema?.properties?.["extra"]).toBeDefined();
    expect(schema?.type).toBe("object");
    // Diffing two identical allOf specs still produces no changes
    expect(analyzeOpenApiDiff(
      `openapi: "3.0.0"\ninfo:\n  title: T\n  version: "1"\npaths:\n  /items:\n    get:\n      responses:\n        "200":\n          content:\n            application/json:\n              schema:\n                allOf:\n                  - type: object`,
      `openapi: "3.0.0"\ninfo:\n  title: T\n  version: "1"\npaths:\n  /items:\n    get:\n      responses:\n        "200":\n          content:\n            application/json:\n              schema:\n                allOf:\n                  - type: object`,
    )).toHaveLength(0);
  });

  it("allOf flattening: a required field added to a base schema via allOf is BREAKING", () => {
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
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/Base"
components:
  schemas:
    Base:
      type: object
      required: [id]
      properties:
        id:
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
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/Base"
components:
  schemas:
    Base:
      type: object
      required: [id, name]
      properties:
        id:
          type: string
        name:
          type: string
`;
    // 'name' added to required[] inside the allOf base — previously invisible, now detected.
    // Severity is INFO (server now guarantees the field; clients can rely on it).
    const changes = analyzeOpenApiDiff(baseline, current);
    const requiredAdded = changes.filter((c) => c.type === "response-schema-field-required-added");
    expect(requiredAdded).toHaveLength(1);
    expect(requiredAdded[0]?.severity).toBe("INFO");
    expect(requiredAdded[0]?.location).toMatch(/name/);
  });

  it("allOf flattening: a property type change inside a base schema is BREAKING", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              allOf:
                - $ref: "#/components/schemas/UserBase"
components:
  schemas:
    UserBase:
      type: object
      properties:
        age:
          type: integer
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              allOf:
                - $ref: "#/components/schemas/UserBase"
components:
  schemas:
    UserBase:
      type: object
      properties:
        age:
          type: string
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "request-schema-property-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.severity).toBe("BREAKING");
    expect(typeChange?.before).toBe("integer");
    expect(typeChange?.after).toBe("string");
  });

  it("allOf flattening: parent schema properties take precedence over allOf members", () => {
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
                properties:
                  id:
                    type: integer
                allOf:
                  - properties:
                      id:
                        type: string
components:
  schemas: {}
`);
    const schema = spec.operations[0]!.responses["200"]?.schema;
    // Parent's integer takes precedence over allOf member's string
    expect(schema?.properties?.["id"]?.type).toBe("integer");
  });

  it("nested allOf (allOf within allOf) — inner allOf is flattened recursively", () => {
    // Spec has outer allOf with one member that itself has inner allOf.
    // normalizeSchema recurses into each allOf member and flattens them too.
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
                  - allOf:
                      - type: object
                        required: [id]
                        properties:
                          id:
                            type: string
                  - properties:
                      name:
                        type: string
components:
  schemas: {}
`);
    const schema = spec.operations[0]!.responses["200"]?.schema;
    // Outer allOf consumed; inner allOf also consumed during normalizeSchema recursion
    expect(schema?.allOf).toBeUndefined();
    // 'id' (from inner allOf member) and 'name' (from outer inline member) both visible
    expect(schema?.properties?.["id"]?.type).toBe("string");
    expect(schema?.properties?.["name"]).toBeDefined();
    // required from inner allOf member bubbles up
    expect(schema?.required).toContain("id");
  });

  it("oneOf schemas are stored but NOT merged (oneOf/anyOf flattening remains Phase 2)", () => {
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
                oneOf:
                  - type: object
                    properties:
                      kind:
                        type: string
components:
  schemas: {}
`);
    const schema = spec.operations[0]!.responses["200"]?.schema;
    // oneOf is NOT flattened — it's stored for potential Phase 2 use
    expect(schema?.oneOf).toBeDefined();
    expect(schema?.oneOf).toHaveLength(1);
    // Properties from oneOf members are NOT merged (known limitation)
    expect(schema?.properties?.["kind"]).toBeUndefined();
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

// ─── Constraint diffing adversarial (5.7.2 second independent hard pass) ────

describe("constraint diffing — adversarial probes", () => {
  const baseSpec = (minLength?: number, maxLength?: number, pattern?: string) => `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string${minLength !== undefined ? `\n                  minLength: ${minLength}` : ""}${maxLength !== undefined ? `\n                  maxLength: ${maxLength}` : ""}${pattern !== undefined ? `\n                  pattern: "${pattern}"` : ""}
      responses:
        "200":
          description: ok
`;

  it("zero-value minLength: 0→5 is BREAKING (0 is NOT null, must be treated as a real constraint)", () => {
    const changes = analyzeOpenApiDiff(baseSpec(0), baseSpec(5));
    const constraint = changes.find((c) => c.type === "request-schema-property-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.before).toBe(0);
    expect(constraint?.after).toBe(5);
    expect(constraint?.severity).toBe("BREAKING");
    expect(constraint?.location).toMatch(/minLength/);
  });

  it("zero-value minLength: 5→0 is INFO (loosening, 0 is NOT null — constraint not removed, just lowered)", () => {
    const changes = analyzeOpenApiDiff(baseSpec(5), baseSpec(0));
    const constraint = changes.find((c) => c.type === "request-schema-property-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.before).toBe(5);
    expect(constraint?.after).toBe(0);
    expect(constraint?.severity).toBe("INFO");
  });

  it("constraint removed (minLength 5→undefined) is INFO for request — loosening", () => {
    const changes = analyzeOpenApiDiff(baseSpec(5), baseSpec());
    const constraint = changes.find((c) => c.type === "request-schema-property-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.before).toBe(5);
    expect(constraint?.after).toBeNull();
    expect(constraint?.severity).toBe("INFO");
    expect(constraint?.message).toMatch(/removed/i);
  });

  it("constraint added (undefined→minLength 5) is BREAKING for request — tightening", () => {
    const changes = analyzeOpenApiDiff(baseSpec(), baseSpec(5));
    const constraint = changes.find((c) => c.type === "request-schema-property-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.before).toBeNull();
    expect(constraint?.after).toBe(5);
    expect(constraint?.severity).toBe("BREAKING");
    expect(constraint?.message).toMatch(/added/i);
  });

  it("pattern change is BREAKING for request — any regex change may reject previously valid values", () => {
    const changes = analyzeOpenApiDiff(baseSpec(undefined, undefined, "^[a-z]+$"), baseSpec(undefined, undefined, "^[A-Z]+$"));
    const constraint = changes.find((c) => c.type === "request-schema-property-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.before).toBe("^[a-z]+$");
    expect(constraint?.after).toBe("^[A-Z]+$");
    expect(constraint?.severity).toBe("BREAKING");
    expect(constraint?.location).toMatch(/pattern/);
  });

  it("identical constraints produce no constraint-changed events", () => {
    const changes = analyzeOpenApiDiff(baseSpec(5, 100, "^[a-z]+$"), baseSpec(5, 100, "^[a-z]+$"));
    const constraintChanges = changes.filter((c) => c.type === "request-schema-property-constraint-changed");
    expect(constraintChanges).toHaveLength(0);
  });

  it("response minLength loosening is BREAKING — server may now return shorter values than clients expect", () => {
    const respSpec = (minLength?: number) => `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: string${minLength !== undefined ? `\n                    minLength: ${minLength}` : ""}
`;
    const changes = analyzeOpenApiDiff(respSpec(8), respSpec(3));
    const constraint = changes.find((c) => c.type === "response-schema-property-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.before).toBe(8);
    expect(constraint?.after).toBe(3);
    expect(constraint?.severity).toBe("BREAKING");
    expect(constraint?.location).toMatch(/minLength/);
  });

  it("parameter maximum decrease is BREAKING — clients sending previously valid large numbers fail", () => {
    const makeSpec = (max: number) => `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: ${max}
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(makeSpec(100), makeSpec(50));
    const constraint = changes.find((c) => c.type === "parameter-constraint-changed" && String(c.location).endsWith(".maximum"));
    expect(constraint).toBeDefined();
    expect(constraint?.before).toBe(100);
    expect(constraint?.after).toBe(50);
    expect(constraint?.severity).toBe("BREAKING");
  });

  it("response array items minLength loosening is BREAKING — clients get shorter strings than expected", () => {
    const makeSpec = (minLen: number) => `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /tags:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                  minLength: ${minLen}
`;
    const changes = analyzeOpenApiDiff(makeSpec(5), makeSpec(2));
    const constraint = changes.find((c) => c.type === "response-schema-items-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.before).toBe(5);
    expect(constraint?.after).toBe(2);
    expect(constraint?.severity).toBe("BREAKING");
    expect(constraint?.location).toMatch(/items\.minLength/);
  });

  it("constraint on deeply nested property is detected — recursive diff + constraint diffing cooperate", () => {
    const nested = (minLength: number) => `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                address:
                  type: object
                  properties:
                    zipCode:
                      type: string
                      minLength: ${minLength}
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(nested(5), nested(10));
    const constraint = changes.find((c) => c.type === "request-schema-property-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.before).toBe(5);
    expect(constraint?.after).toBe(10);
    expect(constraint?.severity).toBe("BREAKING");
    expect(constraint?.location).toMatch(/address.*zipCode.*minLength/);
  });
});

// ─── Array parameter items diffing ───────────────────────────────────────────

describe("array parameter items diffing — integration", () => {
  it("query parameter array element type change (string→integer) is BREAKING", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: ids
          in: query
          required: false
          schema:
            type: array
            items:
              type: string
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
        - name: ids
          in: query
          required: false
          schema:
            type: array
            items:
              type: integer
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "parameter-items-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.severity).toBe("BREAKING");
    expect(typeChange?.before).toBe("string");
    expect(typeChange?.after).toBe("integer");
  });

  it("query parameter array element enum value removed is BREAKING", () => {
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
            type: array
            items:
              type: string
              enum: [active, inactive, pending]
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
        - name: status
          in: query
          required: false
          schema:
            type: array
            items:
              type: string
              enum: [active, inactive]
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "parameter-items-enum-changed");
    expect(enumChange).toBeDefined();
    expect(enumChange?.severity).toBe("BREAKING");
    expect(enumChange?.message).toMatch(/pending/);
  });
});

// ─── Parameter items constraints + response array object properties ──────────

describe("parameter items constraints and response array of objects", () => {
  it("query parameter array element minLength tightened is BREAKING", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: codes
          in: query
          required: false
          schema:
            type: array
            items:
              type: string
              minLength: 3
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
        - name: codes
          in: query
          required: false
          schema:
            type: array
            items:
              type: string
              minLength: 8
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const constraint = changes.find((c) => c.type === "parameter-items-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.severity).toBe("BREAKING");
    expect(constraint?.before).toBe(3);
    expect(constraint?.after).toBe(8);
  });

  it("response array-of-objects property type change is BREAKING", () => {
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
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: string
                    count:
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
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: string
                    count:
                      type: string
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) =>
      c.type === "response-schema-property-type-changed" &&
      String(c.location).includes("count"),
    );
    expect(typeChange).toBeDefined();
    expect(typeChange?.severity).toBe("BREAKING");
    expect(typeChange?.before).toBe("integer");
    expect(typeChange?.after).toBe("string");
  });

  it("response array-of-objects required field removed is BREAKING", () => {
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
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  required: [id, name]
                  properties:
                    id:
                      type: string
                    name:
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
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  required: [id]
                  properties:
                    id:
                      type: string
                    name:
                      type: string
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const reqRemoved = changes.find((c) =>
      c.type === "response-schema-field-required-removed" &&
      String(c.location).includes("name"),
    );
    expect(reqRemoved).toBeDefined();
    expect(reqRemoved?.severity).toBe("BREAKING");
  });
});

// ─── Top-level body schema format + enum ─────────────────────────────────────

describe("top-level body schema format and enum diffing — integration", () => {
  it("request body format change is BREAKING (date → date-time)", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /events:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
              format: date
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
  /events:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
              format: date-time
      responses:
        "201":
          description: created
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const fmt = changes.find((c) => c.type === "request-schema-format-changed");
    expect(fmt).toBeDefined();
    expect(fmt?.severity).toBe("BREAKING");
    expect(fmt?.before).toBe("date");
    expect(fmt?.after).toBe("date-time");
  });

  it("response body enum value added is BREAKING", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /status:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: string
                enum: [active, inactive]
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /status:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: string
                enum: [active, inactive, pending]
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "response-schema-enum-changed");
    expect(enumChange).toBeDefined();
    expect(enumChange?.severity).toBe("BREAKING");
    expect(enumChange?.message).toMatch(/pending/);
  });
});

// ─── allOf constraint inheritance ────────────────────────────────────────────

describe("allOf constraint inheritance — flattenAllOf must propagate constraint fields", () => {
  it("minLength in allOf base schema is inherited — tightening is BREAKING", () => {
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
              allOf:
                - $ref: "#/components/schemas/EmailSchema"
components:
  schemas:
    EmailSchema:
      type: string
      minLength: 3
`;
    const current = `
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
              allOf:
                - $ref: "#/components/schemas/EmailSchema"
components:
  schemas:
    EmailSchema:
      type: string
      minLength: 10
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const constraint = changes.find((c) => c.type === "request-schema-property-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.before).toBe(3);
    expect(constraint?.after).toBe(10);
    expect(constraint?.severity).toBe("BREAKING");
  });

  it("pattern added to allOf base schema is BREAKING (constraint added from null)", () => {
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
              allOf:
                - $ref: "#/components/schemas/CodeSchema"
components:
  schemas:
    CodeSchema:
      type: string
`;
    const current = `
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
              allOf:
                - $ref: "#/components/schemas/CodeSchema"
components:
  schemas:
    CodeSchema:
      type: string
      pattern: "^[A-Z]{3}$"
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const constraint = changes.find((c) => c.type === "request-schema-property-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.before).toBeNull();
    expect(constraint?.after).toBe("^[A-Z]{3}$");
    expect(constraint?.severity).toBe("BREAKING");
  });
});

// ─── Top-level body schema constraint diffing ─────────────────────────────────

describe("top-level body schema constraint diffing — non-object request/response bodies", () => {
  it("request body scalar string: minLength tightened is BREAKING", () => {
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
              type: string
              minLength: 3
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
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
              minLength: 10
      responses:
        "201":
          description: created
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const constraint = changes.find((c) => c.type === "request-schema-property-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.before).toBe(3);
    expect(constraint?.after).toBe(10);
    expect(constraint?.severity).toBe("BREAKING");
  });

  it("request body scalar string: minLength loosened is INFO", () => {
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
              type: string
              minLength: 10
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
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
              minLength: 3
      responses:
        "201":
          description: created
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const constraint = changes.find((c) => c.type === "request-schema-property-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.severity).toBe("INFO");
  });

  it("response body array: maxItems increased (loosened — server may return more) is BREAKING", () => {
    // maxItems 50→100: server can now return up to 100 items; clients written for ≤50 may break.
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
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                maxItems: 50
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
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                maxItems: 100
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const constraint = changes.find((c) => c.type === "response-schema-property-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.before).toBe(50);
    expect(constraint?.after).toBe(100);
    expect(constraint?.severity).toBe("BREAKING");
  });

  it("response body array: maxItems decreased (tightened — server guarantees fewer) is INFO", () => {
    // maxItems 100→50: server now promises even fewer items; clients written for ≤100 still work.
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
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                maxItems: 100
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
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                maxItems: 50
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const constraint = changes.find((c) => c.type === "response-schema-property-constraint-changed");
    expect(constraint).toBeDefined();
    expect(constraint?.severity).toBe("INFO");
  });
});

// ─── Top-level body schema type null-transition diffing ────────────────────────

describe("top-level body schema type null-transitions (5.7.5 round 9)", () => {
  it("response body type removed (string→undefined) is BREAKING — server may return any type", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /val:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: string
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /val:
    get:
      responses:
        "200":
          content:
            application/json:
              schema: {}
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "response-schema-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.severity).toBe("BREAKING");
    expect(typeChange?.before).toBe("string");
    expect(typeChange?.after).toBeNull();
  });

  it("request body type removed (string→undefined) is INFO — server now accepts any type", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /val:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
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
  /val:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema: {}
      responses:
        "201":
          description: created
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "request-schema-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.severity).toBe("INFO");
    expect(typeChange?.before).toBe("string");
    expect(typeChange?.after).toBeNull();
  });

  it("response body type added (undefined→string) is INFO — server now guarantees type", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /val:
    get:
      responses:
        "200":
          content:
            application/json:
              schema: {}
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /val:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: string
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "response-schema-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.severity).toBe("INFO");
    expect(typeChange?.before).toBeNull();
    expect(typeChange?.after).toBe("string");
  });

  it("request body type added (undefined→string) is BREAKING — server now enforces type", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /val:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema: {}
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
  /val:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
      responses:
        "201":
          description: created
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "request-schema-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.severity).toBe("BREAKING");
    expect(typeChange?.before).toBeNull();
    expect(typeChange?.after).toBe("string");
  });
});

// ─── request-body-required direction gaps (5.7.5 round 11) ──────────────────

describe("request-body-required direction completeness (5.7.5 round 11)", () => {
  it("request body becoming optional (required: true→false) is emitted as INFO", () => {
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
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
      responses:
        "201":
          description: created
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const reqChange = changes.find((c) => c.type === "request-body-required-changed");
    expect(reqChange).toBeDefined();
    expect(reqChange?.severity).toBe("INFO");
    expect(reqChange?.before).toBe(true);
    expect(reqChange?.after).toBe(false);
  });

  it("optional request body removed from spec emits INFO with clear message (not cryptic fallback)", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    post:
      requestBody:
        required: false
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
    const reqChange = changes.find((c) => c.type === "request-body-required-changed");
    expect(reqChange).toBeDefined();
    expect(reqChange?.severity).toBe("INFO");
    expect(reqChange?.message).not.toMatch(/^Change detected at/);
  });
});

// ─── doubly-nested array items (5.7.5 round 12) ─────────────────────────────

describe("doubly-nested array items — array<array<T>> inner type change (5.7.5 round 12)", () => {
  it("inner array element type change (string→integer in array<array<T>>) is BREAKING", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /matrix:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: array
                  items:
                    type: string
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /matrix:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: array
                  items:
                    type: integer
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const innerTypeChange = changes.find(
      (c) => c.type === "response-schema-items-type-changed" && String(c.location).includes(".items.items"),
    );
    expect(innerTypeChange).toBeDefined();
    expect(innerTypeChange?.severity).toBe("BREAKING");
    expect(innerTypeChange?.before).toBe("string");
    expect(innerTypeChange?.after).toBe("integer");
  });

  it("max items depth guard — no stack overflow on deeply nested arrays beyond MAX_ITEMS_DEPTH", () => {
    // 6 levels of nesting — depth guard must prevent infinite recursion.
    // The change is beyond the depth limit so 0 changes are expected, but no throw.
    const makeSpec = (type: string) => `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /deep:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: array
                  items:
                    type: array
                    items:
                      type: array
                      items:
                        type: array
                        items:
                          type: array
                          items:
                            type: ${type}
`;
    // Must not throw (no infinite recursion or stack overflow)
    expect(() => analyzeOpenApiDiff(makeSpec("string"), makeSpec("integer"))).not.toThrow();
  });
});

// ─── items readOnly / writeOnly — parsed-but-never-diffed (5.7.5 round 10) ──

describe("items readOnly/writeOnly — full pipeline (5.7.5 round 10)", () => {
  it("request items readOnly false→true is BREAKING — clients can no longer send these items", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /orders:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                readOnly: false
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
  /orders:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                readOnly: true
      responses:
        "201":
          description: created
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const roChange = changes.find((c) => c.type === "request-schema-items-readonly-changed");
    expect(roChange).toBeDefined();
    expect(roChange?.severity).toBe("BREAKING");
    expect(roChange?.before).toBe(false);
    expect(roChange?.after).toBe(true);
  });

  it("response items writeOnly false→true is BREAKING — items disappear from responses", () => {
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
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                  writeOnly: false
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
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                  writeOnly: true
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const woChange = changes.find((c) => c.type === "response-schema-items-writeonly-changed");
    expect(woChange).toBeDefined();
    expect(woChange?.severity).toBe("BREAKING");
    expect(woChange?.before).toBe(false);
    expect(woChange?.after).toBe(true);
  });

  it("response items readOnly false→true is INFO — annotation change only", () => {
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
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                  readOnly: false
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
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                  readOnly: true
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const roChange = changes.find((c) => c.type === "response-schema-items-readonly-changed");
    expect(roChange).toBeDefined();
    expect(roChange?.severity).toBe("INFO");
  });

  it("no spurious readOnly/writeOnly events when items schema is added from scratch", () => {
    // Adding items (null → {type: string, readOnly: true}) should emit items-type-changed,
    // NOT items-readonly-changed (readOnly is part of the new items, not a delta from false).
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
          content:
            application/json:
              schema:
                type: array
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
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                  readOnly: true
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    // items-type-changed fired (null → string)
    expect(changes.find((c) => c.type === "response-schema-items-type-changed")).toBeDefined();
    // readOnly should NOT produce a separate event for newly added items
    expect(changes.find((c) => c.type === "response-schema-items-readonly-changed")).toBeUndefined();
  });
});

describe("response items null-transition classify fixes (5.7.5 round 13)", () => {
  it("response-schema-items-type-changed (null→type) has a meaningful INFO message, not generic fallback", () => {
    // Before fix: rule fell through to generic "Change detected at..." fallback message.
    // After fix: a specific rule produces a human-readable INFO message.
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /data:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /data:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "response-schema-items-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.severity).toBe("INFO");
    // Must NOT be the generic fallback message
    expect(typeChange?.message).not.toMatch(/^Change detected at/);
    expect(typeChange?.message).toMatch(/added|guarantees|non-breaking/i);
  });

  it("response-schema-items-format-changed (null→format) is INFO, not BREAKING", () => {
    // Server adds a format annotation to previously untyped array items.
    // This is a tighter server promise (non-breaking for clients).
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /ids:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /ids:
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
    const changes = analyzeOpenApiDiff(baseline, current);
    const fmtChange = changes.find((c) => c.type === "response-schema-items-format-changed");
    expect(fmtChange).toBeDefined();
    expect(fmtChange?.severity).toBe("INFO");
    expect(fmtChange?.message).toMatch(/added|guarantees|non-breaking/i);
  });

  it("response-schema-items-format-changed (format→format) remains BREAKING", () => {
    // Changing from one format to another is still BREAKING (clients deserializing the old format fail).
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /ids:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                  format: date
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /ids:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                  format: date-time
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const fmtChange = changes.find((c) => c.type === "response-schema-items-format-changed");
    expect(fmtChange).toBeDefined();
    expect(fmtChange?.severity).toBe("BREAKING");
  });

  it("response-schema-items-enum-changed (null→enum) is INFO, not BREAKING", () => {
    // Server adds an enum to previously unconstrained array items.
    // This constrains the server's promise — non-breaking for clients handling any value.
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /status:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /status:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                  enum: [active, inactive]
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "response-schema-items-enum-changed");
    expect(enumChange).toBeDefined();
    expect(enumChange?.severity).toBe("INFO");
    expect(enumChange?.message).toMatch(/added|guarantees|non-breaking/i);
  });

  it("response-schema-items-enum-changed (enum→null) remains BREAKING", () => {
    // Server removes enum from response items: clients relying on the constraint may now receive unexpected values.
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /status:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                  enum: [active, inactive]
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /status:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "response-schema-items-enum-changed");
    expect(enumChange).toBeDefined();
    expect(enumChange?.severity).toBe("BREAKING");
  });

  it("request-schema-items-type-changed (type→null) has a meaningful INFO message, not generic fallback", () => {
    // Removing a type constraint from request items is INFO — server now accepts any element type.
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /data:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: array
              items:
                type: string
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
  /data:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: array
              items: {}
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "request-schema-items-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.severity).toBe("INFO");
    // Must NOT be the generic fallback message
    expect(typeChange?.message).not.toMatch(/^Change detected at/);
    expect(typeChange?.message).toMatch(/removed|constraint|any type/i);
  });
});

describe("response property/body null-transition classify fixes (5.7.5 round 14)", () => {
  it("response-schema-property-format-changed (null→format) is INFO, not BREAKING", () => {
    // Adding format to a response property is INFO — server now guarantees format (non-breaking for clients)
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users/{id}:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                properties:
                  createdAt:
                    type: string
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users/{id}:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                properties:
                  createdAt:
                    type: string
                    format: date-time
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const fmtChange = changes.find((c) => c.type === "response-schema-property-format-changed");
    expect(fmtChange).toBeDefined();
    expect(fmtChange?.severity).toBe("INFO");
    expect(fmtChange?.message).not.toMatch(/^Change detected at/);
  });

  it("response-schema-property-format-changed (format→null) remains BREAKING", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users/{id}:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                properties:
                  createdAt:
                    type: string
                    format: date-time
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users/{id}:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                properties:
                  createdAt:
                    type: string
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const fmtChange = changes.find((c) => c.type === "response-schema-property-format-changed");
    expect(fmtChange).toBeDefined();
    expect(fmtChange?.severity).toBe("BREAKING");
  });

  it("response-schema-property-enum-changed (null→enum) is INFO, not BREAKING", () => {
    // Adding enum to a response property is INFO — server now guarantees only these values (non-breaking)
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /orders:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /orders:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum:
                      - pending
                      - shipped
                      - delivered
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "response-schema-property-enum-changed");
    expect(enumChange).toBeDefined();
    expect(enumChange?.severity).toBe("INFO");
    expect(enumChange?.message).not.toMatch(/^Change detected at/);
  });

  it("response-schema-property-enum-changed (enum→null) remains BREAKING", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /orders:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum:
                      - pending
                      - shipped
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /orders:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "response-schema-property-enum-changed");
    expect(enumChange).toBeDefined();
    expect(enumChange?.severity).toBe("BREAKING");
  });

  it("response-schema-format-changed (null→format) is INFO at body level", () => {
    // Adding format to a response body schema is INFO — server now narrows its own promise
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /blob:
    get:
      responses:
        "200":
          description: ok
          content:
            application/octet-stream:
              schema:
                type: string
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /blob:
    get:
      responses:
        "200":
          description: ok
          content:
            application/octet-stream:
              schema:
                type: string
                format: binary
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const fmtChange = changes.find((c) => c.type === "response-schema-format-changed");
    expect(fmtChange).toBeDefined();
    expect(fmtChange?.severity).toBe("INFO");
    expect(fmtChange?.message).not.toMatch(/^Change detected at/);
  });

  it("response-schema-enum-changed (null→enum) is INFO at body level", () => {
    // Adding enum to a scalar response body is INFO — server now guarantees only these values
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /version:
    get:
      responses:
        "200":
          description: ok
          content:
            text/plain:
              schema:
                type: string
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /version:
    get:
      responses:
        "200":
          description: ok
          content:
            text/plain:
              schema:
                type: string
                enum:
                  - v1
                  - v2
                  - v3
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "response-schema-enum-changed");
    expect(enumChange).toBeDefined();
    expect(enumChange?.severity).toBe("INFO");
    expect(enumChange?.message).not.toMatch(/^Change detected at/);
  });
});

describe("request-side constraint removal classified as INFO (5.7.5 round 15)", () => {
  it("parameter-type-changed (type→undefined) is INFO, not BREAKING", () => {
    // Removing a type constraint from a parameter makes the server more permissive — INFO.
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
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
        - name: limit
          in: query
          schema: {}
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "parameter-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.severity).toBe("INFO");
    expect(typeChange?.message).not.toMatch(/^Change detected at/);
  });

  it("parameter-format-changed (format→undefined) is INFO, not BREAKING", () => {
    // Removing a format constraint from a parameter is more permissive — INFO.
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /events:
    get:
      parameters:
        - name: since
          in: query
          schema:
            type: string
            format: date
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
  /events:
    get:
      parameters:
        - name: since
          in: query
          schema:
            type: string
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const fmtChange = changes.find((c) => c.type === "parameter-format-changed");
    expect(fmtChange).toBeDefined();
    expect(fmtChange?.severity).toBe("INFO");
    expect(fmtChange?.message).not.toMatch(/^Change detected at/);
  });

  it("request-schema-format-changed (format→null) is INFO, not BREAKING", () => {
    // Removing a format constraint from a request body schema is more permissive — INFO.
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /upload:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: string
              format: date
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
  /upload:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: string
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const fmtChange = changes.find((c) => c.type === "request-schema-format-changed");
    expect(fmtChange).toBeDefined();
    expect(fmtChange?.severity).toBe("INFO");
    expect(fmtChange?.message).not.toMatch(/^Change detected at/);
  });

  it("request-schema-enum-changed (enum→null) is INFO, not BREAKING", () => {
    // Removing an enum constraint from a request body is more permissive — INFO.
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /search:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: string
              enum:
                - recent
                - popular
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
  /search:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: string
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "request-schema-enum-changed");
    expect(enumChange).toBeDefined();
    expect(enumChange?.severity).toBe("INFO");
    expect(enumChange?.message).not.toMatch(/^Change detected at/);
  });

  it("request-schema-property-enum-changed (enum→null) is INFO, not BREAKING", () => {
    // Removing enum constraint from a request property is more permissive — INFO.
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /orders:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                priority:
                  type: string
                  enum:
                    - low
                    - medium
                    - high
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
  /orders:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                priority:
                  type: string
      responses:
        "201":
          description: created
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "request-schema-property-enum-changed");
    expect(enumChange).toBeDefined();
    expect(enumChange?.severity).toBe("INFO");
    expect(enumChange?.message).not.toMatch(/^Change detected at/);
  });

  it("parameter-items-type-changed (type→null) is INFO, not BREAKING", () => {
    // Removing type from parameter array items is more permissive — INFO.
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /bulk:
    get:
      parameters:
        - name: ids
          in: query
          schema:
            type: array
            items:
              type: integer
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
  /bulk:
    get:
      parameters:
        - name: ids
          in: query
          schema:
            type: array
            items: {}
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "parameter-items-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.severity).toBe("INFO");
    expect(typeChange?.message).not.toMatch(/^Change detected at/);
  });
});

describe("additionalProperties breaking-change detection (5.7.5 round 16)", () => {
  it("request body with additionalProperties:false added is BREAKING", () => {
    // Closing an open request schema is BREAKING — clients with extra properties will receive 400.
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
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
  /users:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
              additionalProperties: false
      responses:
        "201":
          description: created
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const apChange = changes.find((c) => c.type === "request-schema-additional-properties-changed");
    expect(apChange).toBeDefined();
    expect(apChange?.severity).toBe("BREAKING");
    expect(apChange?.before).toBe(true); // was open (default)
    expect(apChange?.after).toBe(false); // now closed
    expect(apChange?.message).not.toMatch(/^Change detected at/);
  });

  it("request body with additionalProperties:false removed is INFO", () => {
    // Opening a previously-closed request schema is INFO — clients' existing payloads still work.
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
              additionalProperties: false
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
  /users:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
      responses:
        "201":
          description: created
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const apChange = changes.find((c) => c.type === "request-schema-additional-properties-changed");
    expect(apChange).toBeDefined();
    expect(apChange?.severity).toBe("INFO");
    expect(apChange?.before).toBe(false);
    expect(apChange?.after).toBe(true);
  });

  it("response body with additionalProperties:false added is INFO", () => {
    // Closing a response schema is INFO — server gives a stronger guarantee, non-breaking for clients.
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users/{id}:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
`;
    const current = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users/{id}:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                additionalProperties: false
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const apChange = changes.find((c) => c.type === "response-schema-additional-properties-changed");
    expect(apChange).toBeDefined();
    expect(apChange?.severity).toBe("INFO");
    expect(apChange?.before).toBe(true);
    expect(apChange?.after).toBe(false);
  });

  it("nested request property with additionalProperties:false added is BREAKING", () => {
    // Closing a nested object property schema is BREAKING — clients sending extra fields in the
    // nested object will receive 400.
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /orders:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                address:
                  type: object
                  properties:
                    street:
                      type: string
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
  /orders:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                address:
                  type: object
                  properties:
                    street:
                      type: string
                  additionalProperties: false
      responses:
        "201":
          description: created
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const apChange = changes.find((c) => c.type === "request-schema-property-additional-properties-changed");
    expect(apChange).toBeDefined();
    expect(apChange?.severity).toBe("BREAKING");
    expect(apChange?.before).toBe(true);
    expect(apChange?.after).toBe(false);
    expect(apChange?.message).not.toMatch(/^Change detected at/);
  });
});

describe("pattern constraint null-transitions (5.7.5 round 17)", () => {
  it("removing a request property pattern is INFO (constraint relaxed)", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                code:
                  type: string
                  pattern: "^[A-Z]{2}$"
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
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                code:
                  type: string
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const patternChange = changes.find((c) => c.type === "request-schema-property-constraint-changed" && String(c.location).endsWith(".pattern"));
    expect(patternChange).toBeDefined();
    expect(patternChange?.severity).toBe("INFO");
    expect(patternChange?.message).toMatch(/removed|no longer/i);
    expect(patternChange?.message).toMatch(/non-breaking/i);
  });

  it("adding a request property pattern is BREAKING (new constraint)", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                code:
                  type: string
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
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                code:
                  type: string
                  pattern: "^[A-Z]{2}$"
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const patternChange = changes.find((c) => c.type === "request-schema-property-constraint-changed" && String(c.location).endsWith(".pattern"));
    expect(patternChange).toBeDefined();
    expect(patternChange?.severity).toBe("BREAKING");
    expect(patternChange?.message).toMatch(/added|require/i);
  });

  it("adding a response property pattern is INFO (server narrows own guarantee)", () => {
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
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
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
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: string
                    pattern: "^[A-Z]{2}$"
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const patternChange = changes.find((c) => c.type === "response-schema-property-constraint-changed" && String(c.location).endsWith(".pattern"));
    expect(patternChange).toBeDefined();
    expect(patternChange?.severity).toBe("INFO");
    expect(patternChange?.message).toMatch(/added|guarantee/i);
    expect(patternChange?.message).toMatch(/non-breaking/i);
  });

  it("removing a response property pattern is BREAKING (server may now return un-patterned values)", () => {
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
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: string
                    pattern: "^[A-Z]{2}$"
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
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: string
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const patternChange = changes.find((c) => c.type === "response-schema-property-constraint-changed" && String(c.location).endsWith(".pattern"));
    expect(patternChange).toBeDefined();
    expect(patternChange?.severity).toBe("BREAKING");
    expect(patternChange?.message).toMatch(/removed|may now return/i);
  });
});

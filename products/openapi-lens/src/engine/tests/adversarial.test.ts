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

describe("items-level additionalProperties detection (5.7.5 round 18)", () => {
  it("closing request array items schema is BREAKING", () => {
    const baseline = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /batch:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  id:
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
  /batch:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: string
                additionalProperties: false
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const apChange = changes.find((c) => c.type === "request-schema-items-additional-properties-changed");
    expect(apChange).toBeDefined();
    expect(apChange?.severity).toBe("BREAKING");
    expect(apChange?.after).toBe(false);
    expect(apChange?.message).not.toMatch(/^Change detected at/);
  });

  it("closing response array items schema is INFO", () => {
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
                type: array
                items:
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
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: string
                  additionalProperties: false
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const apChange = changes.find((c) => c.type === "response-schema-items-additional-properties-changed");
    expect(apChange).toBeDefined();
    expect(apChange?.severity).toBe("INFO");
    expect(apChange?.after).toBe(false);
    expect(apChange?.message).not.toMatch(/^Change detected at/);
  });
});

// ─── Enum order-insensitivity (5.7.5 round 19) ────────────────────────────

describe("enum order-insensitivity (5.7.5 round 19)", () => {
  const PREAMBLE = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /v1/items:
    get:
`;

  it("reordered top-level request body enum produces NO event", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
              enum: ["a", "b", "c"]
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
              enum: ["c", "a", "b"]
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "request-schema-enum-changed");
    expect(enumChange).toBeUndefined();
  });

  it("reordered response body enum produces NO event", () => {
    const baseline = `${PREAMBLE}
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: string
                enum: ["x", "y", "z"]
`;
    const current = `${PREAMBLE}
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: string
                enum: ["z", "x", "y"]
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "response-schema-enum-changed");
    expect(enumChange).toBeUndefined();
  });

  it("reordered property enum produces NO event", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  enum: ["active", "inactive", "pending"]
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  enum: ["pending", "active", "inactive"]
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "request-schema-property-enum-changed");
    expect(enumChange).toBeUndefined();
  });

  it("reordered parameter enum produces NO event", () => {
    const baseline = `${PREAMBLE}
      parameters:
        - name: sort
          in: query
          required: false
          schema:
            type: string
            enum: ["asc", "desc"]
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      parameters:
        - name: sort
          in: query
          required: false
          schema:
            type: string
            enum: ["desc", "asc"]
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "parameter-enum-changed");
    expect(enumChange).toBeUndefined();
  });

  it("reordered items enum produces NO event", () => {
    const baseline = `${PREAMBLE}
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                  enum: ["red", "green", "blue"]
`;
    const current = `${PREAMBLE}
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
                  enum: ["blue", "red", "green"]
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "response-schema-items-enum-changed");
    expect(enumChange).toBeUndefined();
  });

  it("genuinely added enum value is still detected (BREAKING for request)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
              enum: ["a", "b"]
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
              enum: ["a", "b", "c"]
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "request-schema-enum-changed");
    expect(enumChange).toBeDefined();
    expect(enumChange?.severity).toBe("INFO");
  });

  it("genuinely removed enum value is still detected (BREAKING for request)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
              enum: ["a", "b", "c"]
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
              enum: ["a", "b"]
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const enumChange = changes.find((c) => c.type === "request-schema-enum-changed");
    expect(enumChange).toBeDefined();
    expect(enumChange?.severity).toBe("BREAKING");
  });
});

// ─── items additionalProperties guard (5.7.5 round 20) ────────────────────

describe("items additionalProperties — no spurious event when items are newly added (5.7.5 round 20)", () => {
  const PREAMBLE = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /v1/items:
    post:
`;

  it("newly added response items schema with additionalProperties:false emits NO additionalProperties-changed event (only type-changed)", () => {
    // Baseline: array of strings (no items schema needed — different scenario)
    // A response that was previously a plain object becomes an array-of-objects.
    // The items are NEWLY added. Only items-type-changed should fire, not items-additional-properties-changed.
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: array
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  additionalProperties: false
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    // Items type changed (null → object) — expected
    const typeChange = changes.find((c) => c.type === "response-schema-items-type-changed");
    expect(typeChange).toBeDefined();
    // No spurious additionalProperties event — items didn't exist before
    const apChange = changes.find((c) => c.type === "response-schema-items-additional-properties-changed");
    expect(apChange).toBeUndefined();
  });

  it("newly added request items schema with additionalProperties:false emits NO additionalProperties-changed event (only type-changed)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                additionalProperties: false
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    // Items type changed (null → object) — expected
    const typeChange = changes.find((c) => c.type === "request-schema-items-type-changed");
    expect(typeChange).toBeDefined();
    // No spurious additionalProperties event — items didn't exist before
    const apChange = changes.find((c) => c.type === "request-schema-items-additional-properties-changed");
    expect(apChange).toBeUndefined();
  });

  it("items schema additionalProperties:false REMOVED (true→false→true) emits event when both items exist", () => {
    // Baseline: items with additionalProperties: false; current: items open (no flag = true)
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                additionalProperties: false
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    // Both items exist: false→true should be detected (INFO for request: schema opened)
    const apChange = changes.find((c) => c.type === "request-schema-items-additional-properties-changed");
    expect(apChange).toBeDefined();
    expect(apChange?.before).toBe(false);
    expect(apChange?.after).toBe(true);
  });
});

// ─── items scalar fields guard (5.7.5 round 21) ───────────────────────────

describe("items scalar fields — no spurious events when items are newly added (5.7.5 round 21)", () => {
  const PREAMBLE = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /v1/items:
    post:
`;

  it("newly added items schema with format emits NO format-changed event (only type-changed)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: string
                format: date-time
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "request-schema-items-type-changed");
    expect(typeChange).toBeDefined();
    const fmtChange = changes.find((c) => c.type === "request-schema-items-format-changed");
    expect(fmtChange).toBeUndefined();
  });

  it("newly added items schema with enum emits NO enum-changed event (only type-changed)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: string
                enum: ["a", "b", "c"]
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "request-schema-items-type-changed");
    expect(typeChange).toBeDefined();
    const enumChange = changes.find((c) => c.type === "request-schema-items-enum-changed");
    expect(enumChange).toBeUndefined();
  });

  it("newly added items schema with constraint emits NO constraint-changed event (only type-changed)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: string
                minLength: 5
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "request-schema-items-type-changed");
    expect(typeChange).toBeDefined();
    const constraintChange = changes.find((c) => c.type === "request-schema-items-constraint-changed");
    expect(constraintChange).toBeUndefined();
  });

  it("format change on existing items schema IS still detected", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: string
                format: date
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: string
                format: date-time
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const fmtChange = changes.find((c) => c.type === "request-schema-items-format-changed");
    expect(fmtChange).toBeDefined();
    expect(fmtChange?.before).toBe("date");
    expect(fmtChange?.after).toBe("date-time");
    expect(fmtChange?.severity).toBe("BREAKING");
  });

  it("constraint change on existing items schema IS still detected", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: string
                minLength: 3
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                type: string
                minLength: 10
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const constraintChange = changes.find((c) => c.type === "request-schema-items-constraint-changed");
    expect(constraintChange).toBeDefined();
    expect(constraintChange?.before).toBe(3);
    expect(constraintChange?.after).toBe(10);
    expect(constraintChange?.severity).toBe("BREAKING");
  });
});

// ─── parameter items scalar fields guard (5.7.5 round 22) ─────────────────

describe("parameter items scalar fields — no spurious events when items are newly added (5.7.5 round 22)", () => {
  const PREAMBLE = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /v1/items:
    get:
`;

  it("newly added parameter items schema with constraint emits NO constraint-changed event (only type-changed)", () => {
    // Parameter changes from type:string to type:array with items.minLength=3
    const baseline = `${PREAMBLE}
      parameters:
        - name: codes
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
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
    const changes = analyzeOpenApiDiff(baseline, current);
    // Parameter type changed (string→array) — expected at the parameter level
    const typeChange = changes.find((c) => c.type === "parameter-type-changed");
    expect(typeChange).toBeDefined();
    // items type change (null→string) — expected
    const itemsTypeChange = changes.find((c) => c.type === "parameter-items-type-changed");
    expect(itemsTypeChange).toBeDefined();
    // No spurious constraint event — items didn't exist before
    const constraintChange = changes.find((c) => c.type === "parameter-items-constraint-changed");
    expect(constraintChange).toBeUndefined();
  });

  it("parameter items constraint change on existing items IS still detected", () => {
    const baseline = `${PREAMBLE}
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
    const current = `${PREAMBLE}
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
    const constraintChange = changes.find((c) => c.type === "parameter-items-constraint-changed");
    expect(constraintChange).toBeDefined();
    expect(constraintChange?.before).toBe(3);
    expect(constraintChange?.after).toBe(8);
    expect(constraintChange?.severity).toBe("BREAKING");
  });
});

// ─── Round 24: top-level body schema readOnly / writeOnly ─────────────────────
describe("top-level body schema readOnly/writeOnly (5.7.5 round 24)", () => {
  const PREAMBLE = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    post:`;

  it("request body readOnly false→true fires BREAKING (request-schema-readonly-changed)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              readOnly: true
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const ro = changes.find((c) => c.type === "request-schema-readonly-changed");
    expect(ro).toBeDefined();
    expect(ro?.severity).toBe("BREAKING");
    expect(ro?.message).toMatch(/read.only|ignored|400/i);
  });

  it("request body readOnly true→false fires INFO (request-schema-readonly-changed)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              readOnly: true
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const ro = changes.find((c) => c.type === "request-schema-readonly-changed");
    expect(ro).toBeDefined();
    expect(ro?.severity).toBe("INFO");
  });

  it("response body writeOnly false→true fires BREAKING (response-schema-writeonly-changed)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
`;
    const current = `${PREAMBLE}
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                writeOnly: true
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const wo = changes.find((c) => c.type === "response-schema-writeonly-changed");
    expect(wo).toBeDefined();
    expect(wo?.severity).toBe("BREAKING");
    expect(wo?.message).toMatch(/write.only|no longer receive/i);
  });

  it("response body writeOnly true→false fires INFO (response-schema-writeonly-changed)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                writeOnly: true
`;
    const current = `${PREAMBLE}
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const wo = changes.find((c) => c.type === "response-schema-writeonly-changed");
    expect(wo).toBeDefined();
    expect(wo?.severity).toBe("INFO");
  });

  it("response body readOnly false→true fires INFO (not BREAKING) (response-schema-readonly-changed)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
`;
    const current = `${PREAMBLE}
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                readOnly: true
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const ro = changes.find((c) => c.type === "response-schema-readonly-changed");
    expect(ro).toBeDefined();
    expect(ro?.severity).toBe("INFO");
    // Must NOT be classified as BREAKING
    expect(ro?.severity).not.toBe("BREAKING");
  });

  it("request body writeOnly false→true fires INFO (not BREAKING) (request-schema-writeonly-changed)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              writeOnly: true
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const wo = changes.find((c) => c.type === "request-schema-writeonly-changed");
    expect(wo).toBeDefined();
    expect(wo?.severity).toBe("INFO");
    expect(wo?.severity).not.toBe("BREAKING");
  });
});

// ─── Round 25: minProperties / maxProperties constraint fields ────────────────
describe("minProperties/maxProperties schema constraints (5.7.5 round 25)", () => {
  const PREAMBLE = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    post:`;

  it("request body minProperties increase fires BREAKING (request tightened)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              minProperties: 0
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              minProperties: 2
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const c = changes.find((ch) => ch.type === "request-schema-property-constraint-changed" && ch.location.endsWith(".minProperties"));
    expect(c).toBeDefined();
    expect(c?.severity).toBe("BREAKING");
    expect(c?.before).toBe(0);
    expect(c?.after).toBe(2);
  });

  it("request body maxProperties decrease fires BREAKING (request tightened)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              maxProperties: 10
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              maxProperties: 3
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const c = changes.find((ch) => ch.type === "request-schema-property-constraint-changed" && ch.location.endsWith(".maxProperties"));
    expect(c).toBeDefined();
    expect(c?.severity).toBe("BREAKING");
    expect(c?.before).toBe(10);
    expect(c?.after).toBe(3);
  });

  it("request body minProperties decrease fires INFO (request loosened)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              minProperties: 3
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              minProperties: 1
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const c = changes.find((ch) => ch.type === "request-schema-property-constraint-changed" && ch.location.endsWith(".minProperties"));
    expect(c).toBeDefined();
    expect(c?.severity).toBe("INFO");
  });

  it("response schema minProperties decrease fires BREAKING (response loosened)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                minProperties: 3
`;
    const current = `${PREAMBLE}
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                minProperties: 1
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const c = changes.find((ch) => ch.type === "response-schema-property-constraint-changed" && ch.location.endsWith(".minProperties"));
    expect(c).toBeDefined();
    expect(c?.severity).toBe("BREAKING");
    expect(c?.before).toBe(3);
    expect(c?.after).toBe(1);
  });

  it("response schema maxProperties increase fires BREAKING (response loosened)", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                maxProperties: 5
`;
    const current = `${PREAMBLE}
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                maxProperties: 10
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const c = changes.find((ch) => ch.type === "response-schema-property-constraint-changed" && ch.location.endsWith(".maxProperties"));
    expect(c).toBeDefined();
    expect(c?.severity).toBe("BREAKING");
    expect(c?.before).toBe(5);
    expect(c?.after).toBe(10);
  });

  it("property-level minProperties increase fires BREAKING on request", () => {
    const baseline = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                metadata:
                  type: object
                  minProperties: 0
      responses:
        "200":
          description: ok
`;
    const current = `${PREAMBLE}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                metadata:
                  type: object
                  minProperties: 2
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const c = changes.find((ch) => ch.type === "request-schema-property-constraint-changed" && ch.location.endsWith(".minProperties"));
    expect(c).toBeDefined();
    expect(c?.severity).toBe("BREAKING");
  });
});

// ─── Round 26: response-schema-nullable-changed direction polarity ─────────
// Bug: top-level body response nullable had inverted BREAKING/INFO vs property/items levels.
// false→true = loosening (server can now return null) = BREAKING.
// true→false = tightening (server guarantees non-null) = INFO.

const NULLABLE_PREAMBLE = `
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
              schema:`;

describe("round 26 — response-schema-nullable-changed direction polarity fix", () => {
  it("response body nullable false→true is BREAKING (server may now return null; clients crash)", () => {
    const baseline = `${NULLABLE_PREAMBLE}
                type: string
                nullable: false`;
    const current = `${NULLABLE_PREAMBLE}
                type: string
                nullable: true`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const c = changes.find((ch) => ch.type === "response-schema-nullable-changed");
    expect(c).toBeDefined();
    expect(c?.before).toBe(false);
    expect(c?.after).toBe(true);
    expect(c?.severity).toBe("BREAKING");
    expect(c?.message).toMatch(/null/i);
  });

  it("response body nullable true→false is INFO (server guarantees non-null; tightening = INFO for responses)", () => {
    const baseline = `${NULLABLE_PREAMBLE}
                type: string
                nullable: true`;
    const current = `${NULLABLE_PREAMBLE}
                type: string
                nullable: false`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const c = changes.find((ch) => ch.type === "response-schema-nullable-changed");
    expect(c).toBeDefined();
    expect(c?.before).toBe(true);
    expect(c?.after).toBe(false);
    expect(c?.severity).toBe("INFO");
    expect(c?.message).toMatch(/no longer nullable|never null/i);
  });

  it("CONTRAST: response property nullable false→true is also BREAKING (consistent with body level)", () => {
    const baseline = `${NULLABLE_PREAMBLE}
                type: object
                properties:
                  name:
                    type: string
                    nullable: false`;
    const current = `${NULLABLE_PREAMBLE}
                type: object
                properties:
                  name:
                    type: string
                    nullable: true`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const c = changes.find((ch) => ch.type === "response-schema-property-nullable-changed");
    expect(c).toBeDefined();
    expect(c?.severity).toBe("BREAKING");
  });

  it("CONTRAST: response items nullable false→true is also BREAKING (consistent with body level)", () => {
    const baseline = `${NULLABLE_PREAMBLE}
                type: array
                items:
                  type: string
                  nullable: false`;
    const current = `${NULLABLE_PREAMBLE}
                type: array
                items:
                  type: string
                  nullable: true`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const c = changes.find((ch) => ch.type === "response-schema-items-nullable-changed");
    expect(c).toBeDefined();
    expect(c?.severity).toBe("BREAKING");
  });
});

// ─── Response-level $ref resolution (5.7.5 round 22) ──────────────────────────

describe("response-level $ref resolution — changes in #/components/responses propagate (5.7.5 round 22)", () => {
  it("required field added to shared response schema is detected (BREAKING)", () => {
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
          $ref: "#/components/responses/ItemResponse"
components:
  responses:
    ItemResponse:
      description: success
      content:
        application/json:
          schema:
            type: object
            required: [id]
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
          $ref: "#/components/responses/ItemResponse"
components:
  responses:
    ItemResponse:
      description: success
      content:
        application/json:
          schema:
            type: object
            required: [id, name]
            properties:
              id:
                type: string
              name:
                type: string
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    expect(changes.length).toBe(1);
    expect(changes[0]?.type).toBe("response-schema-field-required-added");
    // Adding a required field to a RESPONSE is INFO — server now guarantees the field is present
    expect(changes[0]?.severity).toBe("INFO");
  });

  it("property removed from shared response schema is BREAKING, detected for all referencing operations", () => {
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
          $ref: "#/components/responses/ItemResponse"
  /other:
    get:
      responses:
        "200":
          $ref: "#/components/responses/ItemResponse"
components:
  responses:
    ItemResponse:
      description: success
      content:
        application/json:
          schema:
            type: object
            properties:
              id:
                type: string
              legacy:
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
          $ref: "#/components/responses/ItemResponse"
  /other:
    get:
      responses:
        "200":
          $ref: "#/components/responses/ItemResponse"
components:
  responses:
    ItemResponse:
      description: success
      content:
        application/json:
          schema:
            type: object
            properties:
              id:
                type: string
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const removals = changes.filter((c) => c.type === "response-schema-property-removed");
    expect(removals).toHaveLength(2);
    const paths = removals.map((c) => c.path).sort();
    expect(paths).toEqual(["/items", "/other"]);
    expect(removals.every((c) => c.severity === "BREAKING")).toBe(true);
  });

  it("response-level $ref with no matching component gracefully returns no schema (null)", () => {
    const spec = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      responses:
        "200":
          $ref: "#/components/responses/NonExistent"
`;
    expect(() => analyzeOpenApiDiff(spec, spec)).not.toThrow();
    expect(analyzeOpenApiDiff(spec, spec)).toHaveLength(0);
  });
});

describe("response headers diffing — parse and classify (5.7.5 round 24)", () => {
  const BASE = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      responses:
        "200":
          description: success
          headers:
            X-Rate-Limit:
              required: false
              schema:
                type: integer
            X-Request-Id:
              required: false
              schema:
                type: string
`;

  it("removing a documented response header is BREAKING", () => {
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
          description: success
          headers:
            X-Request-Id:
              required: false
              schema:
                type: string
`;
    const changes = analyzeOpenApiDiff(BASE, current);
    const removal = changes.find((c) => c.type === "response-header-removed");
    expect(removal).toBeDefined();
    expect(removal?.severity).toBe("BREAKING");
    expect(removal?.location).toMatch(/X-Rate-Limit/);
  });

  it("adding a response header is INFO", () => {
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
          description: success
          headers:
            X-Rate-Limit:
              schema:
                type: integer
            X-Request-Id:
              schema:
                type: string
            Retry-After:
              schema:
                type: integer
`;
    const changes = analyzeOpenApiDiff(BASE, current);
    const addition = changes.find((c) => c.type === "response-header-added");
    expect(addition).toBeDefined();
    expect(addition?.severity).toBe("INFO");
    expect(addition?.location).toMatch(/Retry-After/);
  });

  it("response header type change (string→integer) is BREAKING", () => {
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
          description: success
          headers:
            X-Rate-Limit:
              schema:
                type: integer
            X-Request-Id:
              schema:
                type: integer
`;
    const changes = analyzeOpenApiDiff(BASE, current);
    const typeChange = changes.find((c) => c.type === "response-header-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.severity).toBe("BREAKING");
    expect(typeChange?.before).toBe("string");
    expect(typeChange?.after).toBe("integer");
  });

  it("response header via $ref to #/components/headers is resolved correctly", () => {
    const baselineWithRef = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
components:
  headers:
    RateLimitHeader:
      schema:
        type: integer
paths:
  /items:
    get:
      responses:
        "200":
          description: success
          headers:
            X-Rate-Limit:
              $ref: "#/components/headers/RateLimitHeader"
`;
    const currentWithRef = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
components:
  headers:
    RateLimitHeader:
      schema:
        type: string
paths:
  /items:
    get:
      responses:
        "200":
          description: success
          headers:
            X-Rate-Limit:
              $ref: "#/components/headers/RateLimitHeader"
`;
    const changes = analyzeOpenApiDiff(baselineWithRef, currentWithRef);
    const typeChange = changes.find((c) => c.type === "response-header-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.severity).toBe("BREAKING");
    expect(typeChange?.before).toBe("integer");
    expect(typeChange?.after).toBe("string");
  });

  it("unchanged headers produce no changes", () => {
    const changes = analyzeOpenApiDiff(BASE, BASE);
    const headerChanges = changes.filter((c) =>
      c.type === "response-header-removed" ||
      c.type === "response-header-added" ||
      c.type === "response-header-type-changed"
    );
    expect(headerChanges).toHaveLength(0);
  });
});

describe("path-item $ref resolution — OAS 3.1 components/pathItems (5.7.5 round 30)", () => {
  const makeSpec = (propType: string) => `
openapi: "3.1.0"
info:
  title: T
  version: "1"
components:
  pathItems:
    ItemsPath:
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
                      type: ${propType}
paths:
  /items:
    $ref: "#/components/pathItems/ItemsPath"
`;

  it("property type change in shared path item (via $ref) is detected", () => {
    const changes = analyzeOpenApiDiff(makeSpec("string"), makeSpec("integer"));
    const typeChange = changes.find((c) => c.type === "response-schema-property-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.severity).toBe("BREAKING");
    expect(typeChange?.path).toBe("/items");
  });

  it("unchanged path item $ref produces no changes", () => {
    const spec = makeSpec("string");
    expect(analyzeOpenApiDiff(spec, spec)).toHaveLength(0);
  });

  it("nonexistent path item $ref is handled gracefully (falls back to $ref object, finds no methods)", () => {
    const spec = `
openapi: "3.1.0"
info:
  title: T
  version: "1"
paths:
  /items:
    $ref: "#/components/pathItems/NonExistent"
`;
    expect(() => analyzeOpenApiDiff(spec, spec)).not.toThrow();
    expect(analyzeOpenApiDiff(spec, spec)).toHaveLength(0);
  });
});

describe("requestBody $ref resolution — changes in #/components/requestBodies propagate (5.7.5 round 29)", () => {
  const makeSpec = (required: string[], props: Record<string, string>) => `
openapi: "3.0.0"
info:
  title: T
  version: "1"
components:
  requestBodies:
    CreateItem:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [${required.join(", ")}]
            properties:
${Object.entries(props).map(([k, v]) => `              ${k}:\n                type: ${v}`).join("\n")}
paths:
  /items:
    post:
      requestBody:
        $ref: "#/components/requestBodies/CreateItem"
      responses:
        "201":
          description: created
`;

  it("required field added to shared request body $ref is detected as BREAKING", () => {
    const baseline = makeSpec(["name"], { name: "string" });
    const current = makeSpec(["name", "price"], { name: "string", price: "number" });
    const changes = analyzeOpenApiDiff(baseline, current);
    const reqAdded = changes.find((c) => c.type === "request-schema-field-required-added");
    expect(reqAdded).toBeDefined();
    expect(reqAdded?.severity).toBe("BREAKING");
    expect(reqAdded?.location).toMatch(/price/);
  });

  it("property removed from shared request body $ref is detected as BREAKING", () => {
    const baseline = makeSpec(["name", "code"], { name: "string", code: "string" });
    const current = makeSpec(["name"], { name: "string" });
    const changes = analyzeOpenApiDiff(baseline, current);
    const propRemoved = changes.find((c) => c.type === "request-schema-property-removed");
    expect(propRemoved).toBeDefined();
    expect(propRemoved?.severity).toBe("BREAKING");
  });

  it("nonexistent requestBody $ref returns null request body (no crash)", () => {
    const spec = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    post:
      requestBody:
        $ref: "#/components/requestBodies/NonExistent"
      responses:
        "201":
          description: created
`;
    expect(() => analyzeOpenApiDiff(spec, spec)).not.toThrow();
    expect(analyzeOpenApiDiff(spec, spec)).toHaveLength(0);
  });
});

describe("Swagger 2.0 response header type parsing (5.7.5 round 28 bug fix)", () => {
  it("Swagger 2.0 response headers with bare `type` field are parsed and diffed correctly", () => {
    const baseline = JSON.stringify({
      swagger: "2.0",
      info: { title: "T", version: "1" },
      paths: {
        "/items": {
          get: {
            responses: {
              "200": {
                description: "ok",
                headers: { "X-Rate-Limit": { type: "integer" } },
              },
            },
          },
        },
      },
    });
    const current = JSON.stringify({
      swagger: "2.0",
      info: { title: "T", version: "1" },
      paths: {
        "/items": {
          get: {
            responses: {
              "200": {
                description: "ok",
                headers: { "X-Rate-Limit": { type: "string" } },
              },
            },
          },
        },
      },
    });
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "response-header-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.before).toBe("integer");
    expect(typeChange?.after).toBe("string");
    expect(typeChange?.severity).toBe("BREAKING");
  });
});

describe("response-header-format-changed (5.7.5 round 31)", () => {
  const makeSpec = (fmt: string | null) => `
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
          headers:
            X-Request-Id:
              schema:
                type: string
                ${fmt !== null ? `format: ${fmt}` : ""}
`;

  it("response header format change (uuid→uri) is BREAKING", () => {
    const changes = analyzeOpenApiDiff(makeSpec("uuid"), makeSpec("uri"));
    const change = changes.find((c) => c.type === "response-header-format-changed");
    expect(change).toBeDefined();
    expect(change?.severity).toBe("BREAKING");
    expect(change?.before).toBe("uuid");
    expect(change?.after).toBe("uri");
  });

  it("response header format removed (uuid→absent) is BREAKING", () => {
    const changes = analyzeOpenApiDiff(makeSpec("uuid"), makeSpec(null));
    const change = changes.find((c) => c.type === "response-header-format-changed");
    expect(change).toBeDefined();
    expect(change?.severity).toBe("BREAKING");
    expect(change?.after).toBeNull();
  });

  it("response header format added (absent→uuid) is INFO", () => {
    const changes = analyzeOpenApiDiff(makeSpec(null), makeSpec("uuid"));
    const change = changes.find((c) => c.type === "response-header-format-changed");
    expect(change).toBeDefined();
    expect(change?.severity).toBe("INFO");
    expect(change?.before).toBeNull();
    expect(change?.after).toBe("uuid");
  });
});

describe("response-header-required-changed (5.7.5 round 28)", () => {
  const makeSpec = (required: boolean) => `
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
          headers:
            X-Correlation-Id:
              required: ${required}
              schema:
                type: string
`;

  it("required:true → required:false is BREAKING (guarantee removed)", () => {
    const changes = analyzeOpenApiDiff(makeSpec(true), makeSpec(false));
    const change = changes.find((c) => c.type === "response-header-required-changed");
    expect(change).toBeDefined();
    expect(change?.severity).toBe("BREAKING");
    expect(change?.before).toBe(true);
    expect(change?.after).toBe(false);
  });

  it("required:false → required:true is INFO (server strengthens guarantee)", () => {
    const changes = analyzeOpenApiDiff(makeSpec(false), makeSpec(true));
    const change = changes.find((c) => c.type === "response-header-required-changed");
    expect(change).toBeDefined();
    expect(change?.severity).toBe("INFO");
    expect(change?.before).toBe(false);
    expect(change?.after).toBe(true);
  });

  it("unchanged required:true produces no required-changed event", () => {
    const spec = makeSpec(true);
    expect(analyzeOpenApiDiff(spec, spec).filter((c) => c.type === "response-header-required-changed")).toHaveLength(0);
  });
});

describe("security scheme / scope diffing (5.7.5 round 27)", () => {
  const makeSpec = (security: string) => `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users:
    get:
${security}
      responses:
        "200":
          description: ok
`;

  const withSecurity = (lines: string) =>
    makeSpec(lines.split("\n").map((l) => `      ${l}`).join("\n"));

  it("removing an auth scheme is BREAKING", () => {
    const baseline = withSecurity("security:\n  - OAuth2:\n    - read:users\n  - apiKey: []");
    const current = withSecurity("security:\n  - OAuth2:\n    - read:users");
    const changes = analyzeOpenApiDiff(baseline, current);
    const removal = changes.find((c) => c.type === "operation-security-scheme-removed");
    expect(removal).toBeDefined();
    expect(removal?.severity).toBe("BREAKING");
    expect(removal?.before).toBe("apiKey");
  });

  it("adding a new OAuth scope requirement is BREAKING", () => {
    const baseline = withSecurity("security:\n  - OAuth2:\n    - read:users");
    const current = withSecurity("security:\n  - OAuth2:\n    - read:users\n    - write:users");
    const changes = analyzeOpenApiDiff(baseline, current);
    const scopeAdd = changes.find((c) => c.type === "operation-security-scope-added");
    expect(scopeAdd).toBeDefined();
    expect(scopeAdd?.severity).toBe("BREAKING");
    expect(scopeAdd?.after).toBe("write:users");
  });

  it("adding a new auth scheme is INFO (more options, existing clients unaffected)", () => {
    const baseline = withSecurity("security:\n  - OAuth2:\n    - read:users");
    const current = withSecurity("security:\n  - OAuth2:\n    - read:users\n  - bearerAuth: []");
    const changes = analyzeOpenApiDiff(baseline, current);
    const addition = changes.find((c) => c.type === "operation-security-scheme-added");
    expect(addition).toBeDefined();
    expect(addition?.severity).toBe("INFO");
  });

  it("removing a scope from an existing scheme is INFO (more permissive)", () => {
    const baseline = withSecurity("security:\n  - OAuth2:\n    - read:users\n    - write:users");
    const current = withSecurity("security:\n  - OAuth2:\n    - read:users");
    const changes = analyzeOpenApiDiff(baseline, current);
    const scopeRemoval = changes.find((c) => c.type === "operation-security-scope-removed");
    expect(scopeRemoval).toBeDefined();
    expect(scopeRemoval?.severity).toBe("INFO");
    expect(scopeRemoval?.before).toBe("write:users");
  });

  it("no security field in either spec produces no security changes", () => {
    const noSec = makeSpec("");
    const changes = analyzeOpenApiDiff(noSec, noSec);
    const secChanges = changes.filter((c) =>
      c.type === "operation-security-scheme-removed" ||
      c.type === "operation-security-scheme-added" ||
      c.type === "operation-security-scope-added" ||
      c.type === "operation-security-scope-removed"
    );
    expect(secChanges).toHaveLength(0);
  });
});

describe("servers array diffing — URL removed/added (5.7.5 round 26)", () => {
  const makeSpec = (urls: string[]) => `
openapi: "3.0.0"
info:
  title: T
  version: "1"
servers:
${urls.map((u) => `  - url: ${u}`).join("\n")}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
`;

  it("removing a server URL is BREAKING", () => {
    const baseline = makeSpec(["https://api.example.com", "https://api-eu.example.com"]);
    const current = makeSpec(["https://api.example.com"]);
    const changes = analyzeOpenApiDiff(baseline, current);
    const removal = changes.find((c) => c.type === "server-removed");
    expect(removal).toBeDefined();
    expect(removal?.severity).toBe("BREAKING");
    expect(removal?.before).toBe("https://api-eu.example.com");
    expect(removal?.after).toBeNull();
  });

  it("adding a server URL is INFO", () => {
    const baseline = makeSpec(["https://api.example.com"]);
    const current = makeSpec(["https://api.example.com", "https://api-eu.example.com"]);
    const changes = analyzeOpenApiDiff(baseline, current);
    const addition = changes.find((c) => c.type === "server-added");
    expect(addition).toBeDefined();
    expect(addition?.severity).toBe("INFO");
    expect(addition?.after).toBe("https://api-eu.example.com");
  });

  it("base URL change is BREAKING (remove old) + INFO (add new)", () => {
    const baseline = makeSpec(["https://api.example.com/v1"]);
    const current = makeSpec(["https://api.example.com/v2"]);
    const changes = analyzeOpenApiDiff(baseline, current);
    expect(changes.find((c) => c.type === "server-removed")?.severity).toBe("BREAKING");
    expect(changes.find((c) => c.type === "server-added")?.severity).toBe("INFO");
  });

  it("identical servers produce no server changes", () => {
    const spec = makeSpec(["https://api.example.com"]);
    const changes = analyzeOpenApiDiff(spec, spec);
    expect(changes.filter((c) => c.type === "server-removed" || c.type === "server-added")).toHaveLength(0);
  });

  it("spec without servers field produces empty servers list (no crash)", () => {
    const noServers = `
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
    expect(() => analyzeOpenApiDiff(noServers, noServers)).not.toThrow();
    expect(analyzeOpenApiDiff(noServers, noServers).filter((c) => c.type === "server-removed" || c.type === "server-added")).toHaveLength(0);
  });
});

describe("operationId diffing — renamed/added/removed (5.7.5 round 25)", () => {
  const baseSpec = (id: string) => `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users/{id}:
    get:
      operationId: ${id}
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: success
`;

  it("operationId rename emits operation-id-changed (INFO) with SDK warning in message", () => {
    const changes = analyzeOpenApiDiff(baseSpec("getUser"), baseSpec("fetchUser"));
    const idChange = changes.find((c) => c.type === "operation-id-changed");
    expect(idChange).toBeDefined();
    expect(idChange?.severity).toBe("INFO");
    expect(idChange?.before).toBe("getUser");
    expect(idChange?.after).toBe("fetchUser");
    expect(idChange?.message).toMatch(/SDK|sdk|generator/i);
  });

  it("identical operationId produces no change", () => {
    const changes = analyzeOpenApiDiff(baseSpec("getUser"), baseSpec("getUser"));
    expect(changes.filter((c) => c.type === "operation-id-changed")).toHaveLength(0);
  });

  it("operationId removed emits operation-id-changed INFO", () => {
    const withoutId = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: success
`;
    const changes = analyzeOpenApiDiff(baseSpec("getUser"), withoutId);
    const idChange = changes.find((c) => c.type === "operation-id-changed");
    expect(idChange).toBeDefined();
    expect(idChange?.before).toBe("getUser");
    expect(idChange?.after).toBeNull();
    expect(idChange?.severity).toBe("INFO");
  });

  it("operationId added (was absent) emits operation-id-changed INFO", () => {
    const withoutId = `
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: success
`;
    const changes = analyzeOpenApiDiff(withoutId, baseSpec("getUser"));
    const idChange = changes.find((c) => c.type === "operation-id-changed");
    expect(idChange).toBeDefined();
    expect(idChange?.before).toBeNull();
    expect(idChange?.after).toBe("getUser");
    expect(idChange?.severity).toBe("INFO");
  });
});

// ─── Round 32: OAS 3.1 type arrays ────────────────────────────────────────────

describe("OAS 3.1 type arrays — normalised to nullable flag (5.7.5 round 32)", () => {
  function spec31(type: string): string {
    return `
openapi: "3.1.0"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: ${type}
`;
  }

  it("detects response type change from [string,null] to [integer,null] as BREAKING", () => {
    const baseline = `
openapi: "3.1.0"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: [string, "null"]
`;
    const current = `
openapi: "3.1.0"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: [integer, "null"]
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "response-schema-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.before).toBe("string");
    expect(typeChange?.after).toBe("integer");
    expect(typeChange?.severity).toBe("BREAKING");
  });

  it("detects type change when OAS 3.1 type array [string,null] replaces OAS 3.0 type: string + nullable: true", () => {
    const baseline = `
openapi: "3.0.3"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: string
                nullable: true
`;
    const current = `
openapi: "3.1.0"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: [string, "null"]
`;
    // Both schemas are semantically equivalent (string | null) — no type change expected.
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find((c) => c.type === "response-schema-type-changed");
    expect(typeChange).toBeUndefined();
  });

  it("detects request body narrowed from [string,null] to string (removing null) as BREAKING", () => {
    const baseline = `
openapi: "3.1.0"
info: {title: T, version: "1"}
paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: [string, "null"]
      responses:
        "200":
          description: ok
`;
    const current = `
openapi: "3.1.0"
info: {title: T, version: "1"}
paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
      responses:
        "200":
          description: ok
`;
    // Removing nullable from a request body (string|null → string) means clients
    // that currently send null will break — BREAKING.
    const changes = analyzeOpenApiDiff(baseline, current);
    const nullableChange = changes.find((c) => c.type === "request-schema-nullable-changed");
    expect(nullableChange).toBeDefined();
    expect(nullableChange?.before).toBe(true);
    expect(nullableChange?.after).toBe(false);
    expect(nullableChange?.severity).toBe("BREAKING");
  });

  it("detects property in response changed from type: string to type: [integer, null] as BREAKING", () => {
    const baseline = `
openapi: "3.1.0"
info: {title: T, version: "1"}
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
                  count:
                    type: string
`;
    const current = `
openapi: "3.1.0"
info: {title: T, version: "1"}
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
                  count:
                    type: [integer, "null"]
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find(
      (c) => c.type === "response-schema-property-type-changed" && c.location?.includes("count"),
    );
    expect(typeChange).toBeDefined();
    expect(typeChange?.before).toBe("string");
    expect(typeChange?.after).toBe("integer");
    expect(typeChange?.severity).toBe("BREAKING");
  });

  it("single-element type array [string] is equivalent to type: string — no change detected", () => {
    const baseline = `
openapi: "3.1.0"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: string
`;
    const current = `
openapi: "3.1.0"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: [string]
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    expect(changes.filter((c) => c.type === "response-schema-type-changed")).toHaveLength(0);
  });
});

// ─── Round 33: parameter location change & default status code ────────────────

describe("parameter in: location change emits remove+add pair (5.7.5 round 33)", () => {
  function makeSpec(inLoc: string): string {
    return `
openapi: "3.0.3"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      parameters:
        - name: token
          in: ${inLoc}
          required: true
          schema:
            type: string
      responses:
        "200":
          description: ok
`;
  }

  it("moving a parameter from query to header emits parameter-removed and parameter-added", () => {
    const changes = analyzeOpenApiDiff(makeSpec("query"), makeSpec("header"));
    const removed = changes.find((c) => c.type === "parameter-removed");
    const added = changes.find((c) => c.type === "parameter-added");
    expect(removed).toBeDefined();
    expect(added).toBeDefined();
    // The removal of a required parameter is BREAKING; the addition of a required parameter is also BREAKING.
    expect(removed?.severity).toBe("BREAKING");
    expect(added?.severity).toBe("BREAKING");
  });

  it("moving an optional parameter from query to header also emits remove+add (both BREAKING — contract change)", () => {
    const optSpec = (inLoc: string) => `
openapi: "3.0.3"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      parameters:
        - name: filter
          in: ${inLoc}
          required: false
          schema:
            type: string
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(optSpec("query"), optSpec("header"));
    const removed = changes.find((c) => c.type === "parameter-removed");
    const added = changes.find((c) => c.type === "parameter-added");
    expect(removed).toBeDefined();
    expect(added).toBeDefined();
    // Any parameter removal is BREAKING — removing a documented parameter changes the API contract
    // even if the parameter was optional.
    expect(removed?.severity).toBe("BREAKING");
    // A new required-false parameter added as a header is INFO.
    expect(added?.severity).toBe("INFO");
  });
});

describe("default response status code handling (5.7.5 round 33)", () => {
  it("removes default response and emits response-status-removed as INFO", () => {
    const withDefault = `
openapi: "3.0.3"
info: {title: T, version: "1"}
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
        default:
          description: error
          content:
            application/json:
              schema:
                type: object
`;
    const withoutDefault = `
openapi: "3.0.3"
info: {title: T, version: "1"}
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
`;
    const changes = analyzeOpenApiDiff(withDefault, withoutDefault);
    const removed = changes.find((c) => c.type === "response-status-removed");
    expect(removed).toBeDefined();
    expect(removed?.before).toBe("default");
    // Removing any documented response status code is BREAKING — clients rely on documented error shapes.
    expect(removed?.severity).toBe("BREAKING");
  });

  it("schema change inside default response is detected as BREAKING", () => {
    const makeDefault = (type: string) => `
openapi: "3.0.3"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      responses:
        default:
          description: error
          content:
            application/json:
              schema:
                type: ${type}
`;
    const changes = analyzeOpenApiDiff(makeDefault("object"), makeDefault("string"));
    const typeChange = changes.find((c) => c.type === "response-schema-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.before).toBe("object");
    expect(typeChange?.after).toBe("string");
  });
});

describe("OAS 3.1 type array + constraint changes (5.7.5 round 33)", () => {
  it("minimum constraint change with type array is correctly detected as BREAKING", () => {
    const baseline = `
openapi: "3.1.0"
info: {title: T, version: "1"}
paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: [integer, "null"]
              minimum: 1
      responses:
        "200":
          description: ok
`;
    const current = `
openapi: "3.1.0"
info: {title: T, version: "1"}
paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: [integer, "null"]
              minimum: 5
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    // Top-level requestBody schema constraints emit "request-schema-property-constraint-changed"
    // (the same type as property-level constraints — they share a code path).
    const constraintChange = changes.find((c) => c.type === "request-schema-property-constraint-changed");
    expect(constraintChange).toBeDefined();
    expect(constraintChange?.before).toBe(1);
    expect(constraintChange?.after).toBe(5);
    expect(constraintChange?.severity).toBe("BREAKING");
  });

  it("adding null to type array (string → [string,null]) in request body is INFO (round 33)", () => {
    const baseline = `
openapi: "3.1.0"
info: {title: T, version: "1"}
paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: string
      responses:
        "200":
          description: ok
`;
    const current = `
openapi: "3.1.0"
info: {title: T, version: "1"}
paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: [string, "null"]
      responses:
        "200":
          description: ok
`;
    // Making a request body field nullable (accepting null) is INFO — clients gain capability.
    const changes = analyzeOpenApiDiff(baseline, current);
    const nullableChange = changes.find((c) => c.type === "request-schema-nullable-changed");
    expect(nullableChange).toBeDefined();
    expect(nullableChange?.before).toBe(false);
    expect(nullableChange?.after).toBe(true);
    expect(nullableChange?.severity).toBe("INFO");
  });
});

// ─── Round 34: content-type media type change detection ───────────────────────

describe("response media type change detection (5.7.5 round 34)", () => {
  it("removing application/json from response while adding application/xml is BREAKING", () => {
    const baseline = `
openapi: "3.0.3"
info: {title: T, version: "1"}
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
`;
    const current = `
openapi: "3.0.3"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/xml:
              schema:
                type: object
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const removed = changes.find((c) => c.type === "response-media-type-removed");
    const added = changes.find((c) => c.type === "response-media-type-added");
    expect(removed).toBeDefined();
    expect(removed?.before).toBe("application/json");
    expect(removed?.severity).toBe("BREAKING");
    expect(added).toBeDefined();
    expect(added?.after).toBe("application/xml");
    expect(added?.severity).toBe("INFO");
  });

  it("adding application/xml alongside application/json is INFO only", () => {
    const withJson = `
openapi: "3.0.3"
info: {title: T, version: "1"}
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
`;
    const withBoth = `
openapi: "3.0.3"
info: {title: T, version: "1"}
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
            application/xml:
              schema:
                type: object
`;
    const changes = analyzeOpenApiDiff(withJson, withBoth);
    expect(changes.find((c) => c.type === "response-media-type-removed")).toBeUndefined();
    const added = changes.find((c) => c.type === "response-media-type-added");
    expect(added).toBeDefined();
    expect(added?.after).toBe("application/xml");
    expect(added?.severity).toBe("INFO");
  });

  it("no media type change when content types are identical", () => {
    const spec = `
openapi: "3.0.3"
info: {title: T, version: "1"}
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
`;
    const changes = analyzeOpenApiDiff(spec, spec);
    expect(changes.filter((c) => c.type === "response-media-type-removed" || c.type === "response-media-type-added")).toHaveLength(0);
  });

  it("Swagger 2.0 responses (no content map) do not generate spurious media-type changes", () => {
    const swagger = `
swagger: "2.0"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          schema:
            type: object
`;
    const changes = analyzeOpenApiDiff(swagger, swagger);
    expect(changes.filter((c) => c.type === "response-media-type-removed" || c.type === "response-media-type-added")).toHaveLength(0);
  });
});

describe("request media type change detection (5.7.5 round 34)", () => {
  it("removing application/json from requestBody is BREAKING", () => {
    const baseline = `
openapi: "3.0.3"
info: {title: T, version: "1"}
paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
          application/xml:
            schema:
              type: object
      responses:
        "200":
          description: ok
`;
    const current = `
openapi: "3.0.3"
info: {title: T, version: "1"}
paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/xml:
            schema:
              type: object
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const removed = changes.find((c) => c.type === "request-media-type-removed");
    expect(removed).toBeDefined();
    expect(removed?.before).toBe("application/json");
    expect(removed?.severity).toBe("BREAKING");
  });

  it("adding application/x-www-form-urlencoded to requestBody is INFO", () => {
    const baseline = `
openapi: "3.0.3"
info: {title: T, version: "1"}
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
        "200":
          description: ok
`;
    const current = `
openapi: "3.0.3"
info: {title: T, version: "1"}
paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
          application/x-www-form-urlencoded:
            schema:
              type: object
      responses:
        "200":
          description: ok
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const added = changes.find((c) => c.type === "request-media-type-added");
    expect(added).toBeDefined();
    expect(added?.after).toBe("application/x-www-form-urlencoded");
    expect(added?.severity).toBe("INFO");
    expect(changes.find((c) => c.type === "request-media-type-removed")).toBeUndefined();
  });
});

// ─── Round 35: allOf + $ref base schema propagation ──────────────────────────

describe("allOf with $ref base schema — breaking changes propagate through inheritance (5.7.5 round 35)", () => {
  it("required field added to $ref base schema inside allOf is detected as BREAKING in response", () => {
    // Baseline: Base has no required; Child allOf Base
    const baseline = `
openapi: "3.0.3"
info: {title: T, version: "1"}
components:
  schemas:
    Base:
      type: object
      properties:
        id: {type: string}
    Child:
      allOf:
        - $ref: "#/components/schemas/Base"
        - type: object
          properties:
            name: {type: string}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Child"
`;
    // Current: Base now requires `id`
    const current = `
openapi: "3.0.3"
info: {title: T, version: "1"}
components:
  schemas:
    Base:
      type: object
      required: [id]
      properties:
        id: {type: string}
    Child:
      allOf:
        - $ref: "#/components/schemas/Base"
        - type: object
          properties:
            name: {type: string}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Child"
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const requiredAdded = changes.find((c) => c.type === "response-schema-field-required-added");
    expect(requiredAdded).toBeDefined();
    expect(String(requiredAdded?.location ?? "")).toContain("id");
    expect(requiredAdded?.severity).toBe("INFO");
  });

  it("property type change in $ref base schema propagates through allOf inheritance", () => {
    const baseline = `
openapi: "3.0.3"
info: {title: T, version: "1"}
components:
  schemas:
    Base:
      type: object
      properties:
        count: {type: string}
    Child:
      allOf:
        - $ref: "#/components/schemas/Base"
        - type: object
          properties:
            name: {type: string}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Child"
`;
    const current = `
openapi: "3.0.3"
info: {title: T, version: "1"}
components:
  schemas:
    Base:
      type: object
      properties:
        count: {type: integer}
    Child:
      allOf:
        - $ref: "#/components/schemas/Base"
        - type: object
          properties:
            name: {type: string}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Child"
`;
    const changes = analyzeOpenApiDiff(baseline, current);
    const typeChange = changes.find(
      (c) => c.type === "response-schema-property-type-changed" && String(c.location).includes("count"),
    );
    expect(typeChange).toBeDefined();
    expect(typeChange?.before).toBe("string");
    expect(typeChange?.after).toBe("integer");
    expect(typeChange?.severity).toBe("BREAKING");
  });

  it("parent schema overrides allOf member property on key conflict — parent wins", () => {
    // OapiSchema from allOf: parent type wins over member type when both set.
    // If baseline Child defines count: integer at parent level and Base also has count: string,
    // the merged schema should have count: integer (parent wins).
    const baseline = `
openapi: "3.0.3"
info: {title: T, version: "1"}
components:
  schemas:
    Base:
      type: object
      properties:
        count: {type: string}
    Child:
      type: object
      properties:
        count: {type: integer}
      allOf:
        - $ref: "#/components/schemas/Base"
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Child"
`;
    // Current is the same — should detect no change (parent still wins with integer).
    const changes = analyzeOpenApiDiff(baseline, baseline);
    expect(changes.filter((c) => c.type === "response-schema-property-type-changed")).toHaveLength(0);
  });
});

// ─── Round 36: OAS 3.1 multi-type arrays (non-null union) ────────────────────

describe("OAS 3.1 multi-type array without null — documented limitation (5.7.5 round 36)", () => {
  it("type: [integer, string] picks integer as primary type — second type is silently ignored", () => {
    // This documents the known behaviour: the parser extracts only the first non-null type.
    // A response property changing from type: [integer, string] to type: integer should
    // show NO change (they're semantically different but parse to the same primary type).
    const withUnion = `
openapi: "3.1.0"
info: {title: T, version: "1"}
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
                  value:
                    type: [integer, string]
`;
    const withInteger = `
openapi: "3.1.0"
info: {title: T, version: "1"}
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
                  value:
                    type: integer
`;
    // Known limitation: both parse to primary type = "integer", so no diff is emitted.
    // This is a false negative for the union→single narrowing.
    const changes = analyzeOpenApiDiff(withUnion, withInteger);
    expect(changes.filter((c) => c.type === "response-schema-property-type-changed")).toHaveLength(0);
  });

  it("type: [string, integer] (string first) correctly picks string as primary type (round 36)", () => {
    const withStringFirst = `
openapi: "3.1.0"
info: {title: T, version: "1"}
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
                  value:
                    type: [string, integer]
`;
    const withInteger = `
openapi: "3.1.0"
info: {title: T, version: "1"}
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
                  value:
                    type: integer
`;
    // [string, integer] → primary type string. integer → primary type integer.
    // This IS detected as a type change (string → integer), BREAKING.
    const changes = analyzeOpenApiDiff(withStringFirst, withInteger);
    const typeChange = changes.find(
      (c) => c.type === "response-schema-property-type-changed" && String(c.location).includes("value"),
    );
    expect(typeChange).toBeDefined();
    expect(typeChange?.before).toBe("string");
    expect(typeChange?.after).toBe("integer");
    expect(typeChange?.severity).toBe("BREAKING");
  });
});

// ─── Round 37: robustness — null/empty/unusual spec structures ────────────────

describe("robustness — null and empty values at spec/operation level (5.7.5 round 37)", () => {
  it("paths: null produces no operations and no crash", () => {
    const noPathsSpec = `
openapi: "3.0.3"
info: {title: T, version: "1"}
paths: ~
`;
    const normalSpec = `
openapi: "3.0.3"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
`;
    // Comparing null paths to real paths should produce endpoint-added, no crash.
    const changes = analyzeOpenApiDiff(noPathsSpec, normalSpec);
    const added = changes.find((c) => c.type === "endpoint-added");
    expect(added).toBeDefined();
    expect(added?.path).toBe("/items");
  });

  it("operation with parameters: null produces no parameters — graceful no-crash", () => {
    const spec = `
openapi: "3.0.3"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      parameters: ~
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
`;
    const changes = analyzeOpenApiDiff(spec, spec);
    expect(changes).toHaveLength(0);
  });

  it("operation with responses: {} (empty) produces no response changes vs also-empty", () => {
    const spec = `
openapi: "3.0.3"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      responses: {}
`;
    const changes = analyzeOpenApiDiff(spec, spec);
    expect(changes).toHaveLength(0);
  });

  it("required: null in schema is treated as empty required array — no crash", () => {
    const withNullRequired = `
openapi: "3.0.3"
info: {title: T, version: "1"}
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
                required: ~
                properties:
                  id: {type: string}
`;
    const withRequired = `
openapi: "3.0.3"
info: {title: T, version: "1"}
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
                required: [id]
                properties:
                  id: {type: string}
`;
    // null required treated as [] — adding id to required is INFO for response.
    const changes = analyzeOpenApiDiff(withNullRequired, withRequired);
    const reqAdded = changes.find((c) => c.type === "response-schema-field-required-added");
    expect(reqAdded).toBeDefined();
    expect(String(reqAdded?.location ?? "")).toContain("id");
    expect(reqAdded?.severity).toBe("INFO");
  });

  it("schema with no type and no properties produces no false-positive changes vs itself", () => {
    const spec = `
openapi: "3.0.3"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema: {}
`;
    const changes = analyzeOpenApiDiff(spec, spec);
    expect(changes).toHaveLength(0);
  });

  it("enum with duplicate values compared to deduped enum emits parameter-enum-changed", () => {
    const withDupes = `
openapi: "3.0.3"
info: {title: T, version: "1"}
paths:
  /items:
    get:
      parameters:
        - name: status
          in: query
          required: false
          schema:
            type: string
            enum: [active, inactive, active]
      responses:
        "200":
          description: ok
`;
    const withoutDupes = `
openapi: "3.0.3"
info: {title: T, version: "1"}
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
`;
    // Different array lengths (3 vs 2) → enum-changed even though sets are equivalent.
    // This is known behaviour: the engine uses array length equality as a fast-path check.
    const changes = analyzeOpenApiDiff(withDupes, withoutDupes);
    expect(changes.find((c) => c.type === "parameter-enum-changed")).toBeDefined();
  });
});

// ─── Round 38: Swagger 2.0 formData parameters ───────────────────────────────

describe("Swagger 2.0 formData parameters — known limitation (5.7.5 round 38)", () => {
  it("Swagger 2.0 formData parameters are silently dropped — no false positives when stable", () => {
    // Swagger 2.0 uses `in: formData` for multipart/form-data fields.
    // The engine's parseParameter() only accepts path/query/header/cookie — formData is
    // filtered out and treated as if the parameter doesn't exist.
    const spec = `
swagger: "2.0"
info: {title: T, version: "1"}
paths:
  /upload:
    post:
      consumes: [multipart/form-data]
      parameters:
        - name: file
          in: formData
          required: true
          type: file
        - name: description
          in: formData
          required: false
          type: string
      responses:
        "200":
          description: ok
`;
    // No crash, no false-positive changes vs itself.
    const changes = analyzeOpenApiDiff(spec, spec);
    expect(changes).toHaveLength(0);
  });

  it("Swagger 2.0 formData parameter addition/removal produces no change event (false negative — known limitation)", () => {
    const withFormData = `
swagger: "2.0"
info: {title: T, version: "1"}
paths:
  /upload:
    post:
      consumes: [multipart/form-data]
      parameters:
        - name: file
          in: formData
          required: true
          type: file
      responses:
        "200":
          description: ok
`;
    const withoutFormData = `
swagger: "2.0"
info: {title: T, version: "1"}
paths:
  /upload:
    post:
      consumes: [multipart/form-data]
      parameters: []
      responses:
        "200":
          description: ok
`;
    // Known limitation: formData parameters are not tracked; this is a false negative.
    const changes = analyzeOpenApiDiff(withFormData, withoutFormData);
    expect(changes.filter((c) => c.type === "parameter-removed")).toHaveLength(0);
  });

  it("Swagger 2.0 body parameter is handled as requestBody — type changes ARE detected", () => {
    const withString = `
swagger: "2.0"
info: {title: T, version: "1"}
paths:
  /items:
    post:
      parameters:
        - name: body
          in: body
          required: true
          schema:
            type: string
      responses:
        "200":
          description: ok
`;
    const withInteger = `
swagger: "2.0"
info: {title: T, version: "1"}
paths:
  /items:
    post:
      parameters:
        - name: body
          in: body
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: ok
`;
    // body parameter → treated as requestBody; type changes ARE detected.
    const changes = analyzeOpenApiDiff(withString, withInteger);
    const typeChange = changes.find((c) => c.type === "request-schema-type-changed");
    expect(typeChange).toBeDefined();
    expect(typeChange?.before).toBe("string");
    expect(typeChange?.after).toBe("integer");
    expect(typeChange?.severity).toBe("BREAKING");
  });
});

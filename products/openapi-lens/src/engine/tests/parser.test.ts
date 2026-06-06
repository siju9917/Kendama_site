import { describe, expect, it } from "vitest";
import { parseOapiSpec } from "../parser.js";

const MINIMAL_SPEC = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths: {}
`;

const SPEC_WITH_ENDPOINT = `
openapi: "3.0.0"
info:
  title: Test
  version: "1.0.0"
paths:
  /users:
    get:
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
`;

const SPEC_WITH_REF = `
openapi: "3.0.0"
info:
  title: Test
  version: "1.0.0"
paths:
  /users:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
components:
  schemas:
    User:
      type: object
      required: [id, email]
      properties:
        id:
          type: string
        email:
          type: string
`;

const SWAGGER_2_SPEC = `
swagger: "2.0"
info:
  title: Test
  version: "1.0.0"
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
          schema:
            type: array
            items:
              type: object
`;

describe("parseOapiSpec — parser", () => {
  it("parses a minimal YAML spec without error", () => {
    const spec = parseOapiSpec(MINIMAL_SPEC);
    expect(spec.version).toBe("3.0");
    expect(spec.operations).toHaveLength(0);
  });

  it("parses a minimal JSON spec without error", () => {
    const json = JSON.stringify({ openapi: "3.0.0", info: { title: "T", version: "1" }, paths: {} });
    const spec = parseOapiSpec(json);
    expect(spec.version).toBe("3.0");
  });

  it("detects version 3.1", () => {
    const spec = parseOapiSpec(`openapi: "3.1.0"\ninfo:\n  title: T\n  version: "1"\npaths: {}`);
    expect(spec.version).toBe("3.1");
  });

  it("detects Swagger 2.0", () => {
    const spec = parseOapiSpec(SWAGGER_2_SPEC);
    expect(spec.version).toBe("2.0");
  });

  it("parses a GET endpoint with a query parameter", () => {
    const spec = parseOapiSpec(SPEC_WITH_ENDPOINT);
    expect(spec.operations).toHaveLength(1);
    const op = spec.operations[0]!;
    expect(op.path).toBe("/users");
    expect(op.method).toBe("get");
    expect(op.parameters).toHaveLength(1);
    const param = op.parameters[0]!;
    expect(param.name).toBe("limit");
    expect(param.in).toBe("query");
    expect(param.required).toBe(false);
    expect(param.schema.type).toBe("integer");
  });

  it("marks path parameters required by default", () => {
    const spec = parseOapiSpec(`
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
          schema:
            type: string
      responses:
        "200":
          description: ok
`);
    const param = spec.operations[0]?.parameters[0];
    expect(param?.required).toBe(true);
  });

  it("resolves $ref to components/schemas", () => {
    const spec = parseOapiSpec(SPEC_WITH_REF);
    const op = spec.operations[0]!;
    const responseSchema = op.responses["200"]?.schema;
    expect(responseSchema?.type).toBe("object");
    expect(responseSchema?.required).toEqual(["id", "email"]);
    expect(responseSchema?.properties?.["id"]?.type).toBe("string");
  });

  it("parses components/schemas into the schemas map", () => {
    const spec = parseOapiSpec(SPEC_WITH_REF);
    expect(spec.schemas["User"]).toBeDefined();
    expect(spec.schemas["User"]?.type).toBe("object");
  });

  it("parses POST with requestBody", () => {
    const spec = parseOapiSpec(`
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
              required: [email]
              properties:
                email:
                  type: string
      responses:
        "201":
          description: created
`);
    const op = spec.operations[0]!;
    expect(op.requestBody?.required).toBe(true);
    expect(op.requestBody?.schema?.type).toBe("object");
    expect(op.requestBody?.schema?.required).toEqual(["email"]);
  });

  it("parses responses with status codes", () => {
    const spec = parseOapiSpec(SPEC_WITH_ENDPOINT);
    const op = spec.operations[0]!;
    expect(op.responses["200"]).toBeDefined();
    expect(op.responses["200"]?.schema?.type).toBe("array");
  });

  it("handles multiple HTTP methods on the same path", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /users:
    get:
      responses:
        "200":
          description: ok
    post:
      responses:
        "201":
          description: created
`);
    expect(spec.operations).toHaveLength(2);
    const methods = spec.operations.map((o) => o.method).sort();
    expect(methods).toEqual(["get", "post"]);
  });

  it("inherits path-level parameters into operations", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    get:
      responses:
        "200":
          description: ok
    delete:
      responses:
        "204":
          description: deleted
`);
    expect(spec.operations).toHaveLength(2);
    for (const op of spec.operations) {
      const pathParam = op.parameters.find((p) => p.name === "id" && p.in === "path");
      expect(pathParam).toBeDefined();
    }
  });

  it("handles enum values in parameter schemas", () => {
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
            enum: [active, inactive, pending]
      responses:
        "200":
          description: ok
`);
    const param = spec.operations[0]?.parameters[0];
    expect(param?.schema.enum).toEqual(["active", "inactive", "pending"]);
  });

  it("throws on non-object root", () => {
    expect(() => parseOapiSpec("this is not an object")).toThrow("root must be an object");
  });

  it("handles missing paths gracefully (no operations)", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
`);
    expect(spec.operations).toHaveLength(0);
  });

  it("parses Swagger 2.0 parameters", () => {
    const spec = parseOapiSpec(SWAGGER_2_SPEC);
    expect(spec.operations).toHaveLength(1);
    const param = spec.operations[0]?.parameters[0];
    expect(param?.name).toBe("q");
    expect(param?.in).toBe("query");
    expect(param?.required).toBe(false);
  });

  it("resolves $ref to #/components/parameters (OAS 3.x shared parameters)", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - $ref: "#/components/parameters/limitParam"
        - $ref: "#/components/parameters/pageParam"
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
    pageParam:
      name: page
      in: query
      required: false
      schema:
        type: integer
`);
    expect(spec.operations[0]?.parameters).toHaveLength(2);
    const limit = spec.operations[0]?.parameters.find((p) => p.name === "limit");
    const page = spec.operations[0]?.parameters.find((p) => p.name === "page");
    expect(limit?.in).toBe("query");
    expect(limit?.schema.type).toBe("integer");
    expect(page?.in).toBe("query");
    expect(page?.schema.type).toBe("integer");
  });

  it("resolves $ref parameter mixed with inline parameters", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items/{id}:
    get:
      parameters:
        - $ref: "#/components/parameters/idParam"
        - name: include
          in: query
          required: false
          schema:
            type: string
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
        type: string
`);
    expect(spec.operations[0]?.parameters).toHaveLength(2);
    const id = spec.operations[0]?.parameters.find((p) => p.name === "id");
    expect(id?.in).toBe("path");
    expect(id?.required).toBe(true);
  });

  it("silently drops an unresolvable $ref in parameters (unknown component)", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - $ref: "#/components/parameters/doesNotExist"
      responses:
        "200":
          description: ok
`);
    expect(spec.operations[0]?.parameters).toHaveLength(0);
  });

  it("resolves path-level $ref parameters into all operations on that path", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items/{id}:
    parameters:
      - $ref: "#/components/parameters/idParam"
    get:
      responses:
        "200":
          description: ok
    put:
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
        type: string
`);
    expect(spec.operations).toHaveLength(2);
    for (const op of spec.operations) {
      expect(op.parameters).toHaveLength(1);
      expect(op.parameters[0]?.name).toBe("id");
    }
  });

  it("parses parameter deprecated flag", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items:
    get:
      parameters:
        - name: legacy
          in: query
          deprecated: true
          schema:
            type: string
        - name: active
          in: query
          schema:
            type: string
      responses:
        "200":
          description: ok
`);
    const params = spec.operations[0]?.parameters ?? [];
    const legacyParam = params.find((p) => p.name === "legacy");
    const activeParam = params.find((p) => p.name === "active");
    expect(legacyParam?.deprecated).toBe(true);
    expect(activeParam?.deprecated).toBeUndefined();
  });

  it("allOf flattening: $ref base schema properties are merged into top-level", () => {
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
                  - type: object
                    properties:
                      extra:
                        type: string
components:
  schemas:
    Base:
      type: object
      required: [id]
      properties:
        id:
          type: string
`);
    const schema = spec.operations[0]?.responses["200"]?.schema;
    expect(schema?.allOf).toBeUndefined();
    expect(schema?.type).toBe("object");
    expect(schema?.required).toContain("id");
    expect(schema?.properties?.["id"]?.type).toBe("string");
    expect(schema?.properties?.["extra"]?.type).toBe("string");
  });

  it("allOf flattening: required fields from multiple allOf members are unioned", () => {
    const spec = parseOapiSpec(`
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
                - required: [name]
                  properties:
                    name:
                      type: string
                - required: [email]
                  properties:
                    email:
                      type: string
      responses:
        "201":
          description: created
`);
    const schema = spec.operations[0]?.requestBody?.schema;
    expect(schema?.allOf).toBeUndefined();
    expect(schema?.required).toContain("name");
    expect(schema?.required).toContain("email");
    expect(schema?.properties?.["name"]?.type).toBe("string");
    expect(schema?.properties?.["email"]?.type).toBe("string");
  });

  it("allOf flattening: parent schema properties take precedence over member properties", () => {
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
    const schema = spec.operations[0]?.responses["200"]?.schema;
    expect(schema?.properties?.["id"]?.type).toBe("integer");
  });

  it("parses items.properties for array-of-objects schemas", () => {
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
                type: array
                items:
                  type: object
                  required: [id]
                  properties:
                    id:
                      type: string
                    count:
                      type: integer
components:
  schemas: {}
`);
    const schema = spec.operations[0]?.responses["200"]?.schema;
    expect(schema?.type).toBe("array");
    expect(schema?.items?.type).toBe("object");
    expect(schema?.items?.properties?.["id"]?.type).toBe("string");
    expect(schema?.items?.properties?.["count"]?.type).toBe("integer");
    expect(schema?.items?.required).toContain("id");
  });

  it("op-level parameter overrides path-level parameter with same name and location", () => {
    const spec = parseOapiSpec(`
openapi: "3.0.0"
info:
  title: T
  version: "1"
paths:
  /items/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    get:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: ok
`);
    const op = spec.operations[0]!;
    // Same name+in: exactly one parameter, op-level wins (integer, not string)
    expect(op.parameters).toHaveLength(1);
    const idParam = op.parameters.find((p) => p.name === "id" && p.in === "path");
    expect(idParam?.schema.type).toBe("integer");
  });

  it("application/json is preferred over other content types when both are present", () => {
    const spec = parseOapiSpec(`
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
            application/xml:
              schema:
                type: object
                properties:
                  xmlField:
                    type: string
            application/json:
              schema:
                type: object
                required: [id]
                properties:
                  id:
                    type: string
`);
    const op = spec.operations[0]!;
    const schema = op.responses["200"]?.schema;
    expect(schema?.required).toContain("id");
    expect(schema?.properties?.["xmlField"]).toBeUndefined();
  });

  it("Swagger 2.0 body parameter defined at path level is inherited by all operations", () => {
    const spec = parseOapiSpec(`
swagger: "2.0"
info:
  title: T
  version: "1"
paths:
  /items:
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required: [name]
          properties:
            name:
              type: string
    post:
      responses:
        "201":
          description: created
`);
    const op = spec.operations[0]!;
    expect(op.requestBody).not.toBeNull();
    expect(op.requestBody?.required).toBe(true);
    expect(op.requestBody?.schema?.type).toBe("object");
    expect(op.requestBody?.schema?.required).toContain("name");
  });

  it("Swagger 2.0 op-level body parameter overrides path-level body parameter", () => {
    const spec = parseOapiSpec(`
swagger: "2.0"
info:
  title: T
  version: "1"
paths:
  /items:
    parameters:
      - name: body
        in: body
        required: false
        schema:
          type: object
          properties:
            legacy:
              type: string
    post:
      parameters:
        - name: body
          in: body
          required: true
          schema:
            type: object
            required: [name]
            properties:
              name:
                type: string
      responses:
        "201":
          description: created
`);
    const op = spec.operations[0]!;
    // Op-level wins: required=true, has 'name' property, not 'legacy'
    expect(op.requestBody?.required).toBe(true);
    expect(op.requestBody?.schema?.required).toContain("name");
    expect(op.requestBody?.schema?.properties?.["legacy"]).toBeUndefined();
  });
});

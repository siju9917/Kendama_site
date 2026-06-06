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
});

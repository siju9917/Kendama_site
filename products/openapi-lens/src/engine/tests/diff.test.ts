import { describe, expect, it } from "vitest";
import { diffSpecs } from "../diff.js";
import { parseOapiSpec } from "../parser.js";

function spec(paths: string): ReturnType<typeof parseOapiSpec> {
  return parseOapiSpec(`
openapi: "3.0.0"
info:
  title: Test
  version: "1.0.0"
${paths}
`);
}

describe("diffSpecs — structural diff", () => {
  it("returns empty array when specs are identical", () => {
    const s = spec(`paths:
  /users:
    get:
      responses:
        "200":
          description: ok`);
    expect(diffSpecs(s, s)).toEqual([]);
  });

  it("detects an endpoint removed", () => {
    const baseline = spec(`paths:
  /users:
    get:
      responses:
        "200":
          description: ok`);
    const current = spec(`paths: {}`);
    const changes = diffSpecs(baseline, current);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("endpoint-removed");
    expect(changes[0]?.path).toBe("/users");
    expect(changes[0]?.method).toBe("get");
  });

  it("detects an endpoint added", () => {
    const baseline = spec(`paths: {}`);
    const current = spec(`paths:
  /users:
    get:
      responses:
        "200":
          description: ok`);
    const changes = diffSpecs(baseline, current);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("endpoint-added");
    expect(changes[0]?.path).toBe("/users");
  });

  it("detects a parameter removed", () => {
    const baseline = spec(`paths:
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
          description: ok`);
    const current = spec(`paths:
  /items:
    get:
      responses:
        "200":
          description: ok`);
    const changes = diffSpecs(baseline, current);
    expect(changes.find((c) => c.type === "parameter-removed")).toBeDefined();
  });

  it("detects a parameter added (optional)", () => {
    const baseline = spec(`paths:
  /items:
    get:
      responses:
        "200":
          description: ok`);
    const current = spec(`paths:
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
          description: ok`);
    const changes = diffSpecs(baseline, current);
    expect(changes.find((c) => c.type === "parameter-added")).toBeDefined();
    const added = changes.find((c) => c.type === "parameter-added")!;
    expect((added.after as { required: boolean }).required).toBe(false);
  });

  it("detects a parameter added (required)", () => {
    const baseline = spec(`paths:
  /items:
    get:
      responses:
        "200":
          description: ok`);
    const current = spec(`paths:
  /items:
    get:
      parameters:
        - name: filter
          in: query
          required: true
          schema:
            type: string
      responses:
        "200":
          description: ok`);
    const changes = diffSpecs(baseline, current);
    const added = changes.find((c) => c.type === "parameter-added")!;
    expect(added).toBeDefined();
    expect((added.after as { required: boolean }).required).toBe(true);
  });

  it("detects parameter required changed: optional → required", () => {
    const baseline = spec(`paths:
  /items:
    get:
      parameters:
        - name: filter
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: ok`);
    const current = spec(`paths:
  /items:
    get:
      parameters:
        - name: filter
          in: query
          required: true
          schema:
            type: string
      responses:
        "200":
          description: ok`);
    const changes = diffSpecs(baseline, current);
    const rc = changes.find((c) => c.type === "parameter-required-changed")!;
    expect(rc).toBeDefined();
    expect(rc.before).toBe(false);
    expect(rc.after).toBe(true);
  });

  it("detects parameter required changed: required → optional", () => {
    const baseline = spec(`paths:
  /items:
    get:
      parameters:
        - name: filter
          in: query
          required: true
          schema:
            type: string
      responses:
        "200":
          description: ok`);
    const current = spec(`paths:
  /items:
    get:
      parameters:
        - name: filter
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: ok`);
    const changes = diffSpecs(baseline, current);
    const rc = changes.find((c) => c.type === "parameter-required-changed")!;
    expect(rc).toBeDefined();
    expect(rc.before).toBe(true);
    expect(rc.after).toBe(false);
  });

  it("detects parameter type changed", () => {
    const baseline = spec(`paths:
  /items:
    get:
      parameters:
        - name: id
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: ok`);
    const current = spec(`paths:
  /items:
    get:
      parameters:
        - name: id
          in: query
          required: false
          schema:
            type: integer
      responses:
        "200":
          description: ok`);
    const changes = diffSpecs(baseline, current);
    const tc = changes.find((c) => c.type === "parameter-type-changed")!;
    expect(tc).toBeDefined();
    expect(tc.before).toBe("string");
    expect(tc.after).toBe("integer");
  });

  it("detects enum values changed (removed)", () => {
    const baseline = spec(`paths:
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
          description: ok`);
    const current = spec(`paths:
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
          description: ok`);
    const changes = diffSpecs(baseline, current);
    const ec = changes.find((c) => c.type === "parameter-enum-changed")!;
    expect(ec).toBeDefined();
    expect((ec.before as string[]).includes("pending")).toBe(true);
    expect((ec.after as string[]).includes("pending")).toBe(false);
  });

  it("detects response status code removed", () => {
    const baseline = spec(`paths:
  /items:
    get:
      responses:
        "200":
          description: ok
        "404":
          description: not found`);
    const current = spec(`paths:
  /items:
    get:
      responses:
        "200":
          description: ok`);
    const changes = diffSpecs(baseline, current);
    const rc = changes.find((c) => c.type === "response-status-removed")!;
    expect(rc).toBeDefined();
    expect(rc.before).toBe("404");
  });

  it("detects response status code added", () => {
    const baseline = spec(`paths:
  /items:
    get:
      responses:
        "200":
          description: ok`);
    const current = spec(`paths:
  /items:
    get:
      responses:
        "200":
          description: ok
        "404":
          description: not found`);
    const changes = diffSpecs(baseline, current);
    const ac = changes.find((c) => c.type === "response-status-added")!;
    expect(ac).toBeDefined();
    expect(ac.after).toBe("404");
  });

  it("detects response schema field became required (removed from required)", () => {
    const baseline = spec(`paths:
  /items:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                required: [id, name]
                properties:
                  id:
                    type: string
                  name:
                    type: string`);
    const current = spec(`paths:
  /items:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                required: [id]
                properties:
                  id:
                    type: string
                  name:
                    type: string`);
    const changes = diffSpecs(baseline, current);
    const rc = changes.find((c) => c.type === "response-schema-field-required-removed")!;
    expect(rc).toBeDefined();
  });

  it("detects request body required added", () => {
    const baseline = spec(`paths:
  /items:
    post:
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name:
                  type: string
      responses:
        "201":
          description: created`);
    const current = spec(`paths:
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
      responses:
        "201":
          description: created`);
    const changes = diffSpecs(baseline, current);
    const rc = changes.find((c) => c.type === "request-body-required-changed")!;
    expect(rc).toBeDefined();
    expect(rc.before).toBe(false);
    expect(rc.after).toBe(true);
  });

  it("detects request schema field became required", () => {
    const baseline = spec(`paths:
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
      responses:
        "201":
          description: created`);
    const current = spec(`paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, email]
              properties:
                name:
                  type: string
                email:
                  type: string
      responses:
        "201":
          description: created`);
    const changes = diffSpecs(baseline, current);
    const rc = changes.find((c) => c.type === "request-schema-field-required-added")!;
    expect(rc).toBeDefined();
  });

  it("detects request body schema nullable changed (true → false)", () => {
    const baseline = spec(`paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              nullable: true
      responses:
        "201":
          description: created`);
    const current = spec(`paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              nullable: false
      responses:
        "201":
          description: created`);
    const changes = diffSpecs(baseline, current);
    const nc = changes.find((c) => c.type === "request-schema-nullable-changed")!;
    expect(nc).toBeDefined();
    expect(nc.before).toBe(true);
    expect(nc.after).toBe(false);
  });

  it("detects request body schema nullable changed (false → true)", () => {
    const baseline = spec(`paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              nullable: false
      responses:
        "201":
          description: created`);
    const current = spec(`paths:
  /items:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              nullable: true
      responses:
        "201":
          description: created`);
    const changes = diffSpecs(baseline, current);
    const nc = changes.find((c) => c.type === "request-schema-nullable-changed")!;
    expect(nc).toBeDefined();
    expect(nc.before).toBe(false);
    expect(nc.after).toBe(true);
  });

  it("does not emit changes for identical endpoints", () => {
    const s = spec(`paths:
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
          content:
            application/json:
              schema:
                type: object
                required: [id]
                properties:
                  id:
                    type: string`);
    expect(diffSpecs(s, s)).toHaveLength(0);
  });
});

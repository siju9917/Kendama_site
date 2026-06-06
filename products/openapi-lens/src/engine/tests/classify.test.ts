import { describe, expect, it } from "vitest";
import { classifyChanges } from "../classify.js";
import type { OapiRawChange } from "../types.js";

function raw(type: OapiRawChange["type"], before: unknown, after: unknown, location = "test-location"): OapiRawChange {
  return { type, path: "/test", method: "get", location, before, after };
}

describe("classifyChanges — classification rules", () => {
  it("classifies endpoint-removed as BREAKING", () => {
    const result = classifyChanges([raw("endpoint-removed", "get /test", null)]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/removed/i);
  });

  it("classifies endpoint-added as INFO", () => {
    const result = classifyChanges([raw("endpoint-added", null, "get /test")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies parameter-removed as BREAKING", () => {
    const result = classifyChanges([raw("parameter-removed", { name: "q", in: "query", required: false }, null, "parameter(query:q)")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies parameter-required-changed (false→true) as BREAKING", () => {
    const result = classifyChanges([raw("parameter-required-changed", false, true, "parameter(query:limit).required")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/required/i);
  });

  it("classifies parameter-required-changed (true→false) as INFO", () => {
    const result = classifyChanges([raw("parameter-required-changed", true, false, "parameter(query:limit).required")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies parameter-type-changed as BREAKING", () => {
    const result = classifyChanges([raw("parameter-type-changed", "string", "integer", "parameter(query:id).schema.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/string.*integer/i);
  });

  it("classifies parameter-format-changed as BREAKING", () => {
    const result = classifyChanges([raw("parameter-format-changed", "date", "date-time", "parameter(query:d).schema.format")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies enum values removed as BREAKING", () => {
    const result = classifyChanges([raw("parameter-enum-changed", ["active", "inactive", "pending"], ["active", "inactive"])]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/pending/);
  });

  it("classifies enum values added as INFO", () => {
    const result = classifyChanges([raw("parameter-enum-changed", ["active", "inactive"], ["active", "inactive", "archived"])]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies parameter-added (required) as BREAKING", () => {
    const result = classifyChanges([raw("parameter-added", null, { name: "filter", in: "query", required: true })]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies parameter-added (optional) as INFO", () => {
    const result = classifyChanges([raw("parameter-added", null, { name: "sort", in: "query", required: false })]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies request-body-required-changed (false→true) as BREAKING", () => {
    const result = classifyChanges([raw("request-body-required-changed", false, true)]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies request-schema-field-required-added as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-field-required-added", false, true, "requestBody.schema.required[email]")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/required field added/i);
  });

  it("classifies request-schema-field-required-removed as INFO", () => {
    const result = classifyChanges([raw("request-schema-field-required-removed", true, false, "requestBody.schema.required[name]")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies request-schema-type-changed as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-type-changed", "string", "integer", "requestBody.content.schema.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies response-status-removed as BREAKING", () => {
    const result = classifyChanges([raw("response-status-removed", "200", null, "responses[200]")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/200/);
  });

  it("classifies response-status-added as INFO", () => {
    const result = classifyChanges([raw("response-status-added", null, "429", "responses[429]")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies response-schema-field-required-removed as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-field-required-removed", true, false, "responses[200].schema.required[id]")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/removed/i);
  });

  it("classifies response-schema-field-required-added as INFO", () => {
    const result = classifyChanges([raw("response-schema-field-required-added", false, true, "responses[200].schema.required[name]")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies response-schema-type-changed as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-type-changed", "string", "object", "responses[200].content.schema.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies nullable changed (true→false) as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-nullable-changed", true, false)]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies nullable changed (false→true) as INFO", () => {
    const result = classifyChanges([raw("response-schema-nullable-changed", false, true)]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies request-body-required-changed (true→null, body removed) as BREAKING", () => {
    const result = classifyChanges([raw("request-body-required-changed", true, null, "requestBody")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/removed/i);
  });

  it("classifies response-schema-property-type-changed as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-property-type-changed", "string", "integer", "responses[200].properties.id.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies response-schema-property-type-changed (type→null) as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-property-type-changed", "string", null, "responses[200].properties.id.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/removed/i);
  });

  it("classifies response-schema-property-type-changed (null→type) as INFO", () => {
    const result = classifyChanges([raw("response-schema-property-type-changed", null, "string", "responses[200].properties.id.type")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies request-schema-property-type-changed (null→type) as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-property-type-changed", null, "string", "requestBody.properties.name.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/added/i);
  });

  it("classifies request-schema-property-type-changed (type→null) as INFO", () => {
    const result = classifyChanges([raw("request-schema-property-type-changed", "string", null, "requestBody.properties.name.type")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies response-schema-items-format-changed as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-items-format-changed", "uuid", "uri", "responses[200].items.format")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/uuid.*uri/i);
  });

  it("classifies request-schema-items-format-changed as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-items-format-changed", "date", "date-time", "requestBody.items.format")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies response-schema-property-removed as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-property-removed", "string", null, "responses[200].properties.id")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies response-schema-property-added as INFO", () => {
    const result = classifyChanges([raw("response-schema-property-added", null, "string", "responses[200].properties.meta")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies request-schema-property-type-changed as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-property-type-changed", "string", "integer", "requestBody.properties.count.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies request-schema-property-removed as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-property-removed", "string", null, "requestBody.properties.name")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies request-schema-property-added as INFO", () => {
    const result = classifyChanges([raw("request-schema-property-added", null, "string", "requestBody.properties.phone")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies response-schema-items-type-changed (string→integer) as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-items-type-changed", "string", "integer", "responses[200].items.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies response-schema-items-type-changed (type→null) as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-items-type-changed", "string", null, "responses[200].items.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies response-schema-items-type-changed (null→type) as INFO", () => {
    const result = classifyChanges([raw("response-schema-items-type-changed", null, "string", "responses[200].items.type")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies request-schema-items-type-changed (string→integer) as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-items-type-changed", "string", "integer", "requestBody.items.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies request-schema-items-type-changed (null→type) as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-items-type-changed", null, "string", "requestBody.items.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies request-schema-items-type-changed (type→null) as INFO", () => {
    const result = classifyChanges([raw("request-schema-items-type-changed", "string", null, "requestBody.items.type")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies response-schema-property-enum-changed (values added) as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-property-enum-changed", ["a", "b"], ["a", "b", "c"], "responses[200].properties.status.enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/exhaustive/i);
  });

  it("classifies response-schema-property-enum-changed (values removed) as INFO", () => {
    const result = classifyChanges([raw("response-schema-property-enum-changed", ["a", "b", "c"], ["a", "b"], "responses[200].properties.status.enum")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies request-schema-property-enum-changed (values removed) as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-property-enum-changed", ["pending", "active"], ["active"], "requestBody.properties.status.enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/pending/);
  });

  it("classifies request-schema-property-enum-changed (values added) as INFO", () => {
    const result = classifyChanges([raw("request-schema-property-enum-changed", ["active"], ["active", "pending"], "requestBody.properties.status.enum")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies response-schema-property-format-changed as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-property-format-changed", "date", "date-time", "responses[200].properties.createdAt.format")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies request-schema-property-format-changed as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-property-format-changed", "int32", "int64", "requestBody.properties.count.format")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies operation-deprecated-changed (false→true) as INFO", () => {
    const result = classifyChanges([raw("operation-deprecated-changed", false, true, "GET /items.deprecated")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/deprecated/i);
  });

  it("classifies operation-deprecated-changed (true→false) as INFO", () => {
    const result = classifyChanges([raw("operation-deprecated-changed", true, false, "GET /items.deprecated")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/un-deprecated/i);
  });

  it("classifies request-schema-nullable-changed (true→false) as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-nullable-changed", true, false, "requestBody.content.schema.nullable")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies request-schema-nullable-changed (false→true) as INFO", () => {
    const result = classifyChanges([raw("request-schema-nullable-changed", false, true, "requestBody.content.schema.nullable")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("handles multiple changes in a single call", () => {
    const changes = classifyChanges([
      raw("endpoint-removed", "get /a", null),
      raw("endpoint-added", null, "post /b"),
      raw("parameter-type-changed", "string", "integer"),
    ]);
    expect(changes).toHaveLength(3);
    const severities = changes.map((c) => c.severity);
    expect(severities).toContain("BREAKING");
    expect(severities).toContain("INFO");
  });

  it("returns empty array for empty input", () => {
    expect(classifyChanges([])).toEqual([]);
  });

  it("preserves path, method, location on classified change", () => {
    const raw: OapiRawChange = {
      type: "endpoint-removed",
      path: "/users",
      method: "delete",
      location: "DELETE /users",
      before: "delete /users",
      after: null,
    };
    const result = classifyChanges([raw]);
    expect(result[0]?.path).toBe("/users");
    expect(result[0]?.method).toBe("delete");
    expect(result[0]?.location).toBe("DELETE /users");
  });
});

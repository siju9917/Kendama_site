import { describe, expect, it } from "vitest";
import { classifyChanges } from "../classify.js";
import type { OapiChangeType, OapiRawChange } from "../types.js";

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

  it("classifies request-schema-type-changed (null→type) as BREAKING — type added tightens request", () => {
    const result = classifyChanges([raw("request-schema-type-changed", null, "string", "requestBody.content.schema.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/added/i);
  });

  it("classifies request-schema-type-changed (type→null) as INFO — type removed loosens request", () => {
    const result = classifyChanges([raw("request-schema-type-changed", "string", null, "requestBody.content.schema.type")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/removed/i);
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

  it("classifies response-schema-type-changed (type→null) as BREAKING — type removed, server may return any type", () => {
    const result = classifyChanges([raw("response-schema-type-changed", "string", null, "responses[200].content.schema.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/removed/i);
  });

  it("classifies response-schema-type-changed (null→type) as INFO — type added, server now guarantees type", () => {
    const result = classifyChanges([raw("response-schema-type-changed", null, "string", "responses[200].content.schema.type")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/added/i);
  });

  it("classifies response-schema-nullable-changed (false→true) as BREAKING — server may now return null", () => {
    // Direction-aware: loosening a RESPONSE constraint = BREAKING.
    // Clients that assumed this field is never null will crash when they receive a null.
    const result = classifyChanges([raw("response-schema-nullable-changed", false, true)]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/null/i);
  });

  it("classifies response-schema-nullable-changed (true→false) as INFO — server guarantees non-null", () => {
    // Direction-aware: tightening a RESPONSE constraint = INFO.
    // Server now guarantees the field is never null; clients benefit.
    const result = classifyChanges([raw("response-schema-nullable-changed", true, false)]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/no longer nullable|never null/i);
  });

  it("classifies request-body-required-changed (true→null, body removed) as BREAKING", () => {
    const result = classifyChanges([raw("request-body-required-changed", true, null, "requestBody")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/removed/i);
  });

  it("classifies request-body-required-changed (false→null, optional body removed) as INFO with clear message", () => {
    // Optional body removed from spec — clients not sending it are unaffected, but contract changed
    const result = classifyChanges([raw("request-body-required-changed", false, null, "requestBody")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/optional|removed/i);
  });

  it("classifies request-body-required-changed (true→false, body became optional) as INFO", () => {
    // Required body relaxed to optional — non-breaking for existing clients
    const result = classifyChanges([raw("request-body-required-changed", true, false, "requestBody.required")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/optional/i);
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

  it("classifies response-schema-property-nullable-changed (false→true) as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-property-nullable-changed", false, true, "responses[200].properties.name.nullable")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/nullable/i);
  });

  it("classifies response-schema-property-nullable-changed (true→false) as INFO", () => {
    const result = classifyChanges([raw("response-schema-property-nullable-changed", true, false, "responses[200].properties.name.nullable")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies request-schema-property-nullable-changed (true→false) as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-property-nullable-changed", true, false, "requestBody.properties.name.nullable")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies request-schema-property-nullable-changed (false→true) as INFO", () => {
    const result = classifyChanges([raw("request-schema-property-nullable-changed", false, true, "requestBody.properties.name.nullable")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies response-schema-items-enum-changed (values added) as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-items-enum-changed", ["a", "b"], ["a", "b", "c"], "responses[200].items.enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/exhaustive/i);
  });

  it("classifies response-schema-items-enum-changed (values removed) as INFO", () => {
    const result = classifyChanges([raw("response-schema-items-enum-changed", ["a", "b", "c"], ["a", "b"], "responses[200].items.enum")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies request-schema-items-enum-changed (values removed) as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-items-enum-changed", ["pending", "active"], ["active"], "requestBody.items.enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/pending/);
  });

  it("classifies request-schema-items-enum-changed (values added) as INFO", () => {
    const result = classifyChanges([raw("request-schema-items-enum-changed", ["active"], ["active", "pending"], "requestBody.items.enum")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies response-schema-items-nullable-changed (false→true) as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-items-nullable-changed", false, true, "responses[200].items.nullable")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/null/i);
  });

  it("classifies response-schema-items-nullable-changed (true→false) as INFO", () => {
    const result = classifyChanges([raw("response-schema-items-nullable-changed", true, false, "responses[200].items.nullable")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies request-schema-items-nullable-changed (true→false) as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-items-nullable-changed", true, false, "requestBody.items.nullable")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies request-schema-items-nullable-changed (false→true) as INFO", () => {
    const result = classifyChanges([raw("request-schema-items-nullable-changed", false, true, "requestBody.items.nullable")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies parameter-deprecated-changed (false→true) as INFO", () => {
    const result = classifyChanges([raw("parameter-deprecated-changed", false, true, "parameter(query:limit).deprecated")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/deprecated/i);
  });

  it("classifies parameter-deprecated-changed (true→false) as INFO", () => {
    const result = classifyChanges([raw("parameter-deprecated-changed", true, false, "parameter(query:limit).deprecated")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/un-deprecated/i);
  });

  it("classifies response-schema-property-writeonly-changed (false→true) as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-property-writeonly-changed", false, true, "responses[200].properties.password.writeOnly")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/write-only/i);
  });

  it("classifies response-schema-property-writeonly-changed (true→false) as INFO", () => {
    const result = classifyChanges([raw("response-schema-property-writeonly-changed", true, false, "responses[200].properties.password.writeOnly")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies request-schema-property-readonly-changed (false→true) as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-property-readonly-changed", false, true, "requestBody.properties.id.readOnly")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/read-only/i);
  });

  it("classifies request-schema-property-readonly-changed (true→false) as INFO", () => {
    const result = classifyChanges([raw("request-schema-property-readonly-changed", true, false, "requestBody.properties.id.readOnly")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies response-schema-property-readonly-changed (false→true) as INFO", () => {
    const result = classifyChanges([raw("response-schema-property-readonly-changed", false, true, "responses[200].properties.id.readOnly")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/read-only/i);
  });

  it("classifies request-schema-property-writeonly-changed (false→true) as INFO", () => {
    const result = classifyChanges([raw("request-schema-property-writeonly-changed", false, true, "requestBody.properties.password.writeOnly")]);
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

  // ─── Constraint classify rules ────────────────────────────────────────────
  it("classifies request minLength increase as BREAKING (tightening)", () => {
    const result = classifyChanges([raw("request-schema-property-constraint-changed", 3, 8, "requestBody.properties.name.minLength")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/tightened/i);
  });

  it("classifies request minLength decrease as INFO (loosening)", () => {
    const result = classifyChanges([raw("request-schema-property-constraint-changed", 8, 3, "requestBody.properties.name.minLength")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/loosened/i);
  });

  it("classifies request maxLength decrease as BREAKING (tightening)", () => {
    const result = classifyChanges([raw("request-schema-property-constraint-changed", 100, 50, "requestBody.properties.name.maxLength")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies request maxLength increase as INFO (loosening)", () => {
    const result = classifyChanges([raw("request-schema-property-constraint-changed", 50, 100, "requestBody.properties.name.maxLength")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies request pattern change as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-property-constraint-changed", "^[a-z]+$", "^[A-Z]+$", "requestBody.properties.code.pattern")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/pattern/i);
  });

  it("classifies request constraint added (minLength null→5) as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-property-constraint-changed", null, 5, "requestBody.properties.name.minLength")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/added/i);
  });

  it("classifies request constraint removed (minLength 5→null) as INFO", () => {
    const result = classifyChanges([raw("request-schema-property-constraint-changed", 5, null, "requestBody.properties.name.minLength")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/removed/i);
  });

  it("classifies response minLength decrease as BREAKING (loosening)", () => {
    const result = classifyChanges([raw("response-schema-property-constraint-changed", 5, 2, "responses[200].properties.code.minLength")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/loosened/i);
  });

  it("classifies response minLength increase as INFO (tightening)", () => {
    const result = classifyChanges([raw("response-schema-property-constraint-changed", 2, 5, "responses[200].properties.code.minLength")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/tightened/i);
  });

  it("classifies response maxLength increase as BREAKING (loosening)", () => {
    const result = classifyChanges([raw("response-schema-property-constraint-changed", 100, 500, "responses[200].properties.bio.maxLength")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies response constraint removed (minLength 5→null) as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-property-constraint-changed", 5, null, "responses[200].properties.name.minLength")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/removed/i);
  });

  it("classifies response constraint added (null→5 minLength) as INFO", () => {
    const result = classifyChanges([raw("response-schema-property-constraint-changed", null, 5, "responses[200].properties.name.minLength")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/added/i);
  });

  it("classifies response pattern change as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-property-constraint-changed", "^[a-z]+$", "^[A-Z]+$", "responses[200].properties.code.pattern")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/pattern/i);
  });

  it("classifies parameter-nullable-changed (true→false) as BREAKING", () => {
    const result = classifyChanges([raw("parameter-nullable-changed", true, false, "parameter(query:q).schema.nullable")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/non-nullable/i);
  });

  it("classifies parameter-nullable-changed (false→true) as INFO", () => {
    const result = classifyChanges([raw("parameter-nullable-changed", false, true, "parameter(query:q).schema.nullable")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/nullable/i);
  });

  it("classifies parameter minLength increase as BREAKING (tightening)", () => {
    const result = classifyChanges([raw("parameter-constraint-changed", 3, 8, "parameter(query:q).schema.minLength")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/tightened/i);
  });

  it("classifies parameter minLength decrease as INFO (loosening)", () => {
    const result = classifyChanges([raw("parameter-constraint-changed", 8, 3, "parameter(query:q).schema.minLength")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies parameter pattern change as BREAKING", () => {
    const result = classifyChanges([raw("parameter-constraint-changed", "^[a-z]+$", "^[A-Z0-9]+$", "parameter(query:code).schema.pattern")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/pattern/i);
  });

  it("classifies parameter constraint added as BREAKING (null→minLength 5)", () => {
    const result = classifyChanges([raw("parameter-constraint-changed", null, 5, "parameter(query:name).schema.minLength")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/added/i);
  });

  it("classifies parameter constraint removed as INFO (minLength 5→null)", () => {
    const result = classifyChanges([raw("parameter-constraint-changed", 5, null, "parameter(query:name).schema.minLength")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/removed/i);
  });

  it("classifies request items minLength increase as BREAKING (tightening)", () => {
    const result = classifyChanges([raw("request-schema-items-constraint-changed", 0, 5, "requestBody.items.minLength")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("classifies request items minLength decrease as INFO (loosening)", () => {
    const result = classifyChanges([raw("request-schema-items-constraint-changed", 10, 5, "requestBody.items.minLength")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies response items minLength decrease as BREAKING (loosening)", () => {
    const result = classifyChanges([raw("response-schema-items-constraint-changed", 10, 5, "responses[200].items.minLength")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/loosened/i);
  });

  it("classifies response items constraint removed as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-items-constraint-changed", 5, null, "responses[200].items.minLength")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/removed/i);
  });

  // ─── Parameter items (array parameter element schema) ─────────────────────
  it("classifies parameter-items-type-changed as BREAKING", () => {
    const result = classifyChanges([raw("parameter-items-type-changed", "string", "integer", "parameter(query:ids).schema.items.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/element type changed/i);
  });

  it("classifies parameter-items-format-changed as BREAKING", () => {
    const result = classifyChanges([raw("parameter-items-format-changed", "date", "date-time", "parameter(query:dates).schema.items.format")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/format changed/i);
  });

  it("classifies parameter-items-enum-changed (value removed) as BREAKING", () => {
    const result = classifyChanges([raw("parameter-items-enum-changed", ["a", "b"], ["a"], "parameter(query:status).schema.items.enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/removed/i);
  });

  it("classifies parameter-items-enum-changed (value added) as INFO", () => {
    const result = classifyChanges([raw("parameter-items-enum-changed", ["a"], ["a", "b"], "parameter(query:status).schema.items.enum")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies parameter-items-nullable-changed (true→false) as BREAKING", () => {
    const result = classifyChanges([raw("parameter-items-nullable-changed", true, false, "parameter(query:ids).schema.items.nullable")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/non-nullable/i);
  });

  it("classifies parameter-items-nullable-changed (false→true) as INFO", () => {
    const result = classifyChanges([raw("parameter-items-nullable-changed", false, true, "parameter(query:ids).schema.items.nullable")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies parameter-items-constraint-changed minLength increase as BREAKING", () => {
    const result = classifyChanges([raw("parameter-items-constraint-changed", 3, 10, "parameter(query:ids).schema.items.minLength")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/tightened/i);
  });

  it("classifies parameter-items-constraint-changed pattern change as BREAKING", () => {
    const result = classifyChanges([raw("parameter-items-constraint-changed", "^[a-z]+$", "^[A-Z]+$", "parameter(query:codes).schema.items.pattern")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/pattern/i);
  });

  it("classifies parameter-items-constraint-changed minLength decrease as INFO", () => {
    const result = classifyChanges([raw("parameter-items-constraint-changed", 10, 3, "parameter(query:ids).schema.items.minLength")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  // ─── Top-level body schema format ─────────────────────────────────────────
  it("classifies request-schema-format-changed as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-format-changed", "date", "date-time", "requestBody.content.schema.format")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/format changed/i);
  });

  it("classifies response-schema-format-changed as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-format-changed", "date", "date-time", "responses[200].content.schema.format")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/format changed/i);
  });

  // ─── Top-level body schema enum ───────────────────────────────────────────
  it("classifies request-schema-enum-changed (value removed) as BREAKING", () => {
    const result = classifyChanges([raw("request-schema-enum-changed", ["a", "b"], ["a"], "requestBody.content.schema.enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/removed/i);
    expect(result[0]?.message).toMatch(/b/);
  });

  it("classifies request-schema-enum-changed (value added) as INFO", () => {
    const result = classifyChanges([raw("request-schema-enum-changed", ["a"], ["a", "b"], "requestBody.content.schema.enum")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies response-schema-enum-changed (value added) as BREAKING", () => {
    const result = classifyChanges([raw("response-schema-enum-changed", ["a"], ["a", "b"], "responses[200].content.schema.enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/added/i);
    expect(result[0]?.message).toMatch(/b/);
  });

  it("classifies response-schema-enum-changed (value removed) as INFO", () => {
    const result = classifyChanges([raw("response-schema-enum-changed", ["a", "b"], ["a"], "responses[200].content.schema.enum")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  // ─── items readOnly / writeOnly (5.7.5 round 10) ─────────────────────────
  it("classifies request-schema-items-readonly-changed (false→true) as BREAKING — clients cannot send readOnly items", () => {
    const result = classifyChanges([raw("request-schema-items-readonly-changed", false, true, "requestBody.content.schema.items.readOnly")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/read-only|readonly/i);
  });

  it("classifies request-schema-items-readonly-changed (true→false) as INFO — items no longer readOnly", () => {
    const result = classifyChanges([raw("request-schema-items-readonly-changed", true, false, "requestBody.content.schema.items.readOnly")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies response-schema-items-writeonly-changed (false→true) as BREAKING — items disappear from responses", () => {
    const result = classifyChanges([raw("response-schema-items-writeonly-changed", false, true, "responses[200].content.schema.items.writeOnly")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/write-only|writeonly/i);
  });

  it("classifies response-schema-items-writeonly-changed (true→false) as INFO — items now appear in responses", () => {
    const result = classifyChanges([raw("response-schema-items-writeonly-changed", true, false, "responses[200].content.schema.items.writeOnly")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies response-schema-items-readonly-changed as INFO (annotation-only change)", () => {
    const result = classifyChanges([raw("response-schema-items-readonly-changed", false, true, "responses[200].content.schema.items.readOnly")]);
    expect(result[0]?.severity).toBe("INFO");
  });

  it("classifies request-schema-items-writeonly-changed as INFO", () => {
    const result = classifyChanges([raw("request-schema-items-writeonly-changed", false, true, "requestBody.content.schema.items.writeOnly")]);
    expect(result[0]?.severity).toBe("INFO");
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

// ─── Completeness guard ─────────────────────────────────────────────────────
// TypeScript exhaustiveness: Record<OapiChangeType, ...> causes a compile error if any
// OapiChangeType value is missing from this map. The test then verifies each type is handled
// by a real rule rather than falling through to the "Change detected at" fallback message.
describe("classifyChanges — completeness: every OapiChangeType must have a rule", () => {
  // Minimal before/after values chosen to hit at least one rule for each type.
  // If you add a new OapiChangeType, TypeScript will require you to add an entry here,
  // and the test will fail if no classify rule handles it.
  const TYPE_STUBS: Record<OapiChangeType, [unknown, unknown]> = {
    "endpoint-added":                          [null, "POST /items"],
    "endpoint-removed":                        ["GET /items", null],
    "parameter-added":                         [null, { name: "q", in: "query", required: false }],
    "parameter-removed":                       [{ name: "q", in: "query", required: false }, null],
    "parameter-required-changed":              [false, true],
    "parameter-type-changed":                  ["string", "integer"],
    "parameter-format-changed":                ["date", "date-time"],
    "parameter-enum-changed":                  [["a", "b"], ["a"]],
    "request-body-required-changed":           [false, true],
    "request-schema-field-required-added":     [false, true],
    "request-schema-field-required-removed":   [true, false],
    "request-schema-type-changed":             ["string", "integer"],
    "response-status-added":                   [null, "429"],
    "response-status-removed":                 ["200", null],
    "response-schema-field-required-added":    [false, true],
    "response-schema-field-required-removed":  [true, false],
    "response-schema-type-changed":            ["string", "object"],
    "response-schema-nullable-changed":        [false, true],
    "response-schema-property-type-changed":   ["string", "integer"],
    "response-schema-property-removed":        ["string", null],
    "response-schema-property-added":          [null, "string"],
    "request-schema-property-type-changed":    ["string", "integer"],
    "request-schema-property-removed":         ["string", null],
    "request-schema-property-added":           [null, "string"],
    "response-schema-items-type-changed":      ["string", "integer"],
    "request-schema-items-type-changed":       ["string", "integer"],
    "response-schema-property-enum-changed":   [["a"], ["a", "b"]],
    "request-schema-property-enum-changed":    [["a", "b"], ["a"]],
    "operation-deprecated-changed":            [false, true],
    "response-schema-property-format-changed": ["date", "date-time"],
    "request-schema-property-format-changed":  ["int32", "int64"],
    "request-schema-nullable-changed":         [true, false],
    "response-schema-items-format-changed":         ["uuid", "uri"],
    "request-schema-items-format-changed":          ["date", "date-time"],
    "response-schema-property-nullable-changed":    [false, true],
    "request-schema-property-nullable-changed":     [true, false],
    "response-schema-items-enum-changed":           [["a"], ["a", "b"]],
    "request-schema-items-enum-changed":            [["a", "b"], ["a"]],
    "response-schema-items-nullable-changed":       [false, true],
    "request-schema-items-nullable-changed":        [true, false],
    "parameter-deprecated-changed":                 [false, true],
    "response-schema-property-readonly-changed":    [false, true],
    "request-schema-property-readonly-changed":     [false, true],
    "response-schema-property-writeonly-changed":   [false, true],
    "request-schema-property-writeonly-changed":    [false, true],
    "response-schema-property-constraint-changed":  [10, 5],
    "request-schema-property-constraint-changed":   [5, 10],
    "parameter-constraint-changed":                 [5, 10],
    "parameter-nullable-changed":                   [true, false],
    "response-schema-items-constraint-changed":     [10, 5],
    "request-schema-items-constraint-changed":      [5, 10],
    "request-schema-format-changed":                ["date", "date-time"],
    "response-schema-format-changed":               ["date", "date-time"],
    "request-schema-enum-changed":                  [["a", "b"], ["a"]],
    "response-schema-enum-changed":                 [["a"], ["a", "b"]],
    "parameter-items-type-changed":                 ["string", "integer"],
    "parameter-items-format-changed":               ["date", "date-time"],
    "parameter-items-enum-changed":                 [["a", "b"], ["a"]],
    "parameter-items-nullable-changed":             [true, false],
    "parameter-items-constraint-changed":           [3, 10],
    "response-schema-items-readonly-changed":       [false, true],
    "request-schema-items-readonly-changed":        [false, true],
    "response-schema-items-writeonly-changed":      [false, true],
    "request-schema-items-writeonly-changed":       [false, true],
    "request-schema-additional-properties-changed":          [true, false],
    "response-schema-additional-properties-changed":         [true, false],
    "request-schema-property-additional-properties-changed": [true, false],
    "response-schema-property-additional-properties-changed":[true, false],
    "request-schema-items-additional-properties-changed":    [true, false],
    "response-schema-items-additional-properties-changed":   [true, false],
    "request-schema-readonly-changed":                       [false, true],
    "response-schema-readonly-changed":                      [false, true],
    "request-schema-writeonly-changed":                      [false, true],
    "response-schema-writeonly-changed":                     [false, true],
    "response-header-removed":                               ["string", null],
    "response-header-added":                                 [null, "string"],
    "response-header-type-changed":                          ["string", "integer"],
    "operation-id-changed":                                  ["getUser", "fetchUser"],
    "server-removed":                                        ["https://api.example.com", null],
    "server-added":                                          [null, "https://api.example.com"],
    "operation-security-scheme-removed":                     ["OAuth2", null],
    "operation-security-scheme-added":                       [null, "apiKey"],
    "operation-security-scope-added":                        [null, "write:users"],
    "operation-security-scope-removed":                      ["write:users", null],
    "response-header-required-changed":                      [true, false],
    "response-header-format-changed":                        ["uuid", "uri"],
    "response-media-type-removed":                           ["application/json", null],
    "response-media-type-added":                             [null, "application/xml"],
    "request-media-type-removed":                            ["application/json", null],
    "request-media-type-added":                              [null, "application/xml"],
  };

  it.each(Object.keys(TYPE_STUBS) as OapiChangeType[])(
    "type '%s' has a classify rule (no silent INFO fallback)",
    (type) => {
      const [before, after] = TYPE_STUBS[type];
      const change: OapiRawChange = { type, path: "/test", method: "get", location: "test-location", before, after };
      const result = classifyChanges([change]);
      expect(result).toHaveLength(1);
      // The fallback message pattern signals an unhandled type — it must never appear
      expect(result[0]?.message).not.toMatch(/^Change detected at/);
    },
  );
});

describe("classify — null-transition fixes (5.7.5 round 13)", () => {
  it("response-schema-items-type-changed (null→type) has non-generic INFO message", () => {
    const result = classifyChanges([raw("response-schema-items-type-changed", null, "string", "responses[200].content.schema.items.type")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/added|guarantees|non-breaking/i);
  });

  it("response-schema-items-format-changed (null→format) is INFO", () => {
    const result = classifyChanges([raw("response-schema-items-format-changed", null, "uuid", "responses[200].content.schema.items.format")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/added|guarantees|non-breaking/i);
  });

  it("response-schema-items-format-changed (format→null) remains BREAKING", () => {
    const result = classifyChanges([raw("response-schema-items-format-changed", "date", null, "responses[200].content.schema.items.format")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("response-schema-items-enum-changed (null→enum) is INFO", () => {
    const result = classifyChanges([raw("response-schema-items-enum-changed", null, ["a", "b"], "responses[200].content.schema.items.enum")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/added|guarantees|non-breaking/i);
  });

  it("response-schema-items-enum-changed (enum→null) remains BREAKING", () => {
    const result = classifyChanges([raw("response-schema-items-enum-changed", ["a", "b"], null, "responses[200].content.schema.items.enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
  });

  it("request-schema-items-type-changed (type→null) has non-generic INFO message", () => {
    const result = classifyChanges([raw("request-schema-items-type-changed", "string", null, "requestBody.content.schema.items.type")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/removed|constraint|any type/i);
  });
});

describe("classify — null-transition fixes (5.7.5 round 14)", () => {
  it("response-schema-property-format-changed (null→format) is INFO", () => {
    const result = classifyChanges([raw("response-schema-property-format-changed", null, "uuid", "responses[200].content.schema.properties[id].format")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/added|guarantees|non-breaking/i);
  });

  it("response-schema-property-format-changed (format→null) remains BREAKING", () => {
    const result = classifyChanges([raw("response-schema-property-format-changed", "date-time", null, "responses[200].content.schema.properties[createdAt].format")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });

  it("response-schema-property-enum-changed (null→enum) is INFO", () => {
    const result = classifyChanges([raw("response-schema-property-enum-changed", null, ["active", "inactive"], "responses[200].content.schema.properties[status].enum")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/added|guarantees|non-breaking/i);
  });

  it("response-schema-property-enum-changed (enum→null) remains BREAKING", () => {
    const result = classifyChanges([raw("response-schema-property-enum-changed", ["open", "closed"], null, "responses[200].content.schema.properties[state].enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });

  // Round 23: message quality — enum REMOVED from response (before=array, after=null) must
  // say "removed" / "exhaustive", not "may be added" (which was the wrong direction).
  it("response-schema-property-enum-changed (enum→null) message says removed/exhaustive (round 23)", () => {
    const result = classifyChanges([raw("response-schema-property-enum-changed", ["open", "closed"], null, "responses[200].content.schema.properties[state].enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/removed|exhaustive/i);
    expect(result[0]?.message).not.toMatch(/may be added/i);
  });

  it("response-schema-items-enum-changed (enum→null) message says removed/exhaustive (round 23)", () => {
    const result = classifyChanges([raw("response-schema-items-enum-changed", ["a", "b"], null, "responses[200].content.schema.items.enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/removed|exhaustive/i);
    expect(result[0]?.message).not.toMatch(/^Response array items enum changed:/);
  });

  it("response-schema-format-changed (null→format) is INFO at body level", () => {
    const result = classifyChanges([raw("response-schema-format-changed", null, "binary", "responses[200].content.schema.format")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/added|guarantees|non-breaking/i);
  });

  it("response-schema-enum-changed (null→enum) is INFO at body level", () => {
    const result = classifyChanges([raw("response-schema-enum-changed", null, ["v1", "v2"], "responses[200].content.schema.enum")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/added|guarantees|non-breaking/i);
  });
});

describe("classify — request-side constraint removal fixes (5.7.5 round 15)", () => {
  // parameter-type-changed
  it("parameter-type-changed (type→null) is INFO", () => {
    const result = classifyChanges([raw("parameter-type-changed", "integer", undefined, "parameter(query:page).schema.type")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/removed|no longer/i);
  });

  it("parameter-type-changed (null→type) remains BREAKING", () => {
    const result = classifyChanges([raw("parameter-type-changed", undefined, "string", "parameter(query:q).schema.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });

  // parameter-format-changed
  it("parameter-format-changed (format→null) is INFO", () => {
    const result = classifyChanges([raw("parameter-format-changed", "date", undefined, "parameter(query:date).schema.format")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/removed|no longer/i);
  });

  it("parameter-format-changed (null→format) remains BREAKING", () => {
    const result = classifyChanges([raw("parameter-format-changed", undefined, "uuid", "parameter(path:id).schema.format")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });

  // parameter-enum-changed
  it("parameter-enum-changed (enum→null) is INFO", () => {
    const result = classifyChanges([raw("parameter-enum-changed", ["asc", "desc"], undefined, "parameter(query:sort).schema.enum")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/removed|no longer/i);
  });

  it("parameter-enum-changed (null→enum) remains BREAKING", () => {
    const result = classifyChanges([raw("parameter-enum-changed", undefined, ["asc", "desc"], "parameter(query:sort).schema.enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });

  // request-schema-format-changed
  it("request-schema-format-changed (format→null) is INFO", () => {
    const result = classifyChanges([raw("request-schema-format-changed", "date", null, "requestBody.content.schema.format")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/removed|no longer/i);
  });

  it("request-schema-format-changed (null→format) remains BREAKING", () => {
    const result = classifyChanges([raw("request-schema-format-changed", null, "date-time", "requestBody.content.schema.format")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });

  // request-schema-property-format-changed
  it("request-schema-property-format-changed (format→null) is INFO", () => {
    const result = classifyChanges([raw("request-schema-property-format-changed", "date-time", null, "requestBody.content.schema.properties.createdAt.format")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/removed|no longer/i);
  });

  // request-schema-property-enum-changed
  it("request-schema-property-enum-changed (enum→null) is INFO", () => {
    const result = classifyChanges([raw("request-schema-property-enum-changed", ["active", "inactive"], undefined, "requestBody.content.schema.properties.status.enum")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/removed|no longer/i);
  });

  it("request-schema-property-enum-changed (null→enum) remains BREAKING", () => {
    const result = classifyChanges([raw("request-schema-property-enum-changed", undefined, ["active", "inactive"], "requestBody.content.schema.properties.status.enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });

  // request-schema-enum-changed
  it("request-schema-enum-changed (enum→null) is INFO", () => {
    const result = classifyChanges([raw("request-schema-enum-changed", ["v1", "v2"], null, "requestBody.content.schema.enum")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/removed|no longer/i);
  });

  // request-schema-items-format-changed
  it("request-schema-items-format-changed (format→null) is INFO", () => {
    const result = classifyChanges([raw("request-schema-items-format-changed", "uuid", null, "requestBody.content.schema.items.format")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/removed|no longer/i);
  });

  // request-schema-items-enum-changed
  it("request-schema-items-enum-changed (enum→null) is INFO", () => {
    const result = classifyChanges([raw("request-schema-items-enum-changed", ["jpeg", "png"], null, "requestBody.content.schema.items.enum")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/removed|no longer/i);
  });

  it("request-schema-items-enum-changed (null→enum) remains BREAKING", () => {
    const result = classifyChanges([raw("request-schema-items-enum-changed", null, ["jpeg", "png"], "requestBody.content.schema.items.enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });

  // parameter-items-type-changed
  it("parameter-items-type-changed (type→null) is INFO", () => {
    const result = classifyChanges([raw("parameter-items-type-changed", "string", null, "parameter(query:ids).schema.items.type")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/removed|no longer/i);
  });

  it("parameter-items-type-changed (null→type) remains BREAKING", () => {
    const result = classifyChanges([raw("parameter-items-type-changed", null, "integer", "parameter(query:ids).schema.items.type")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });

  // parameter-items-format-changed
  it("parameter-items-format-changed (format→null) is INFO", () => {
    const result = classifyChanges([raw("parameter-items-format-changed", "uuid", null, "parameter(query:codes).schema.items.format")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/removed|no longer/i);
  });

  it("parameter-items-format-changed (null→format) remains BREAKING", () => {
    const result = classifyChanges([raw("parameter-items-format-changed", null, "uuid", "parameter(query:codes).schema.items.format")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });

  // parameter-items-enum-changed
  it("parameter-items-enum-changed (enum→null) is INFO", () => {
    const result = classifyChanges([raw("parameter-items-enum-changed", ["jpg", "png"], null, "parameter(query:formats).schema.items.enum")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/removed|no longer/i);
  });

  it("parameter-items-enum-changed (null→enum) remains BREAKING", () => {
    const result = classifyChanges([raw("parameter-items-enum-changed", null, ["jpg", "png"], "parameter(query:formats).schema.items.enum")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });
});

describe("classify — additionalProperties direction-aware (5.7.5 round 16)", () => {
  it("request-schema-additional-properties-changed (true→false) is BREAKING", () => {
    const result = classifyChanges([raw("request-schema-additional-properties-changed", true, false, "requestBody.content.schema.additionalProperties")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/extra|additional|reject/i);
  });

  it("request-schema-additional-properties-changed (false→true) is INFO", () => {
    const result = classifyChanges([raw("request-schema-additional-properties-changed", false, true, "requestBody.content.schema.additionalProperties")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/open|accept|non-breaking/i);
  });

  it("response-schema-additional-properties-changed (true→false) is INFO", () => {
    const result = classifyChanges([raw("response-schema-additional-properties-changed", true, false, "responses[200].content.schema.additionalProperties")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/closed|guarantee|stricter/i);
  });

  it("response-schema-additional-properties-changed (false→true) is INFO", () => {
    const result = classifyChanges([raw("response-schema-additional-properties-changed", false, true, "responses[200].content.schema.additionalProperties")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/extra|unknown|graceful/i);
  });

  it("request-schema-property-additional-properties-changed (true→false) is BREAKING", () => {
    const result = classifyChanges([raw("request-schema-property-additional-properties-changed", true, false, "requestBody.content.schema.properties.address.additionalProperties")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });

  it("response-schema-property-additional-properties-changed (true→false) is INFO", () => {
    const result = classifyChanges([raw("response-schema-property-additional-properties-changed", true, false, "responses[200].content.schema.properties.address.additionalProperties")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });
});

describe("classify — pattern constraint null-transitions (5.7.5 round 17)", () => {
  // REQUEST-SIDE: pattern removed (after=null) → INFO (constraint relaxed, more permissive)
  it("request-schema-property-constraint-changed pattern removed (after=null) is INFO", () => {
    const result = classifyChanges([raw("request-schema-property-constraint-changed", "^[A-Z]{2}$", null, "requestBody.content.schema.properties.code.pattern")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/removed|no longer/i);
    expect(result[0]?.message).toMatch(/non-breaking/i);
  });

  it("request-schema-property-constraint-changed pattern added (before=null) is BREAKING", () => {
    const result = classifyChanges([raw("request-schema-property-constraint-changed", null, "^[A-Z]{2}$", "requestBody.content.schema.properties.code.pattern")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/added|require/i);
  });

  it("parameter-constraint-changed pattern removed (after=null) is INFO", () => {
    const result = classifyChanges([raw("parameter-constraint-changed", "^\\d{5}$", null, "parameter(query:zip).schema.pattern")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/removed|no longer/i);
    expect(result[0]?.message).toMatch(/non-breaking/i);
  });

  it("parameter-constraint-changed pattern added (before=null) is BREAKING", () => {
    const result = classifyChanges([raw("parameter-constraint-changed", null, "^\\d{5}$", "parameter(query:zip).schema.pattern")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/added|require/i);
  });

  it("request-schema-items-constraint-changed pattern removed (after=null) is INFO", () => {
    const result = classifyChanges([raw("request-schema-items-constraint-changed", "^[a-z]+$", null, "requestBody.content.schema.items.pattern")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/removed|no longer/i);
    expect(result[0]?.message).toMatch(/non-breaking/i);
  });

  it("request-schema-items-constraint-changed pattern added (before=null) is BREAKING", () => {
    const result = classifyChanges([raw("request-schema-items-constraint-changed", null, "^[a-z]+$", "requestBody.content.schema.items.pattern")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/added|must|match/i);
  });

  it("parameter-items-constraint-changed pattern removed (after=null) is INFO", () => {
    const result = classifyChanges([raw("parameter-items-constraint-changed", "^\\w+$", null, "parameter(query:tags).items.pattern")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/removed|no longer/i);
    expect(result[0]?.message).toMatch(/non-breaking/i);
  });

  it("parameter-items-constraint-changed pattern added (before=null) is BREAKING", () => {
    const result = classifyChanges([raw("parameter-items-constraint-changed", null, "^\\w+$", "parameter(query:tags).items.pattern")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/added|must|match/i);
  });

  // RESPONSE-SIDE: pattern newly added (before=null) → INFO (server narrows own guarantee, non-breaking for clients)
  it("response-schema-property-constraint-changed pattern added (before=null) is INFO", () => {
    const result = classifyChanges([raw("response-schema-property-constraint-changed", null, "^[A-Z]{2}$", "responses[200].content.schema.properties.code.pattern")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/added|guarantee/i);
    expect(result[0]?.message).toMatch(/non-breaking/i);
  });

  it("response-schema-property-constraint-changed pattern removed (after=null) is BREAKING", () => {
    const result = classifyChanges([raw("response-schema-property-constraint-changed", "^[A-Z]{2}$", null, "responses[200].content.schema.properties.code.pattern")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/removed|may now return/i);
  });

  it("response-schema-items-constraint-changed pattern added (before=null) is INFO", () => {
    const result = classifyChanges([raw("response-schema-items-constraint-changed", null, "^[a-z]+$", "responses[200].content.schema.items.pattern")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).toMatch(/added|guarantee/i);
    expect(result[0]?.message).toMatch(/non-breaking/i);
  });

  it("response-schema-items-constraint-changed pattern removed (after=null) is BREAKING", () => {
    const result = classifyChanges([raw("response-schema-items-constraint-changed", "^[a-z]+$", null, "responses[200].content.schema.items.pattern")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).toMatch(/removed|may now return/i);
  });
});

describe("classify — items-level additionalProperties (5.7.5 round 18)", () => {
  it("request-schema-items-additional-properties-changed (true→false) is BREAKING", () => {
    const result = classifyChanges([raw("request-schema-items-additional-properties-changed", true, false, "requestBody.content.schema.items.additionalProperties")]);
    expect(result[0]?.severity).toBe("BREAKING");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/extra|additional|reject/i);
  });

  it("request-schema-items-additional-properties-changed (false→true) is INFO", () => {
    const result = classifyChanges([raw("request-schema-items-additional-properties-changed", false, true, "requestBody.content.schema.items.additionalProperties")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/open|accept|non-breaking/i);
  });

  it("response-schema-items-additional-properties-changed (true→false) is INFO", () => {
    const result = classifyChanges([raw("response-schema-items-additional-properties-changed", true, false, "responses[200].content.schema.items.additionalProperties")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/closed|guarantee|stricter/i);
  });

  it("response-schema-items-additional-properties-changed (false→true) is INFO", () => {
    const result = classifyChanges([raw("response-schema-items-additional-properties-changed", false, true, "responses[200].content.schema.items.additionalProperties")]);
    expect(result[0]?.severity).toBe("INFO");
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
    expect(result[0]?.message).toMatch(/extra|unknown|graceful/i);
  });
});

// ─── Cross-level nullable consistency guard (round 26 lesson) ────────────────
// Verifies that the same nullable direction (false→true = BREAKING, true→false = INFO)
// is consistent across ALL nesting levels: top-level body, per-property, and items.
// A polarity inversion at one level (like the round 26 bug) will fail this table.

describe("nullable direction — cross-level consistency", () => {
  const NULLABLE_CASES: Array<{ type: OapiChangeType; before: boolean; after: boolean; expected: "BREAKING" | "INFO"; label: string }> = [
    // Response: loosening (false→true) = BREAKING at all levels.
    { type: "response-schema-nullable-changed",          before: false, after: true,  expected: "BREAKING", label: "response body false→true" },
    { type: "response-schema-property-nullable-changed", before: false, after: true,  expected: "BREAKING", label: "response property false→true" },
    { type: "response-schema-items-nullable-changed",    before: false, after: true,  expected: "BREAKING", label: "response items false→true" },
    // Response: tightening (true→false) = INFO at all levels.
    { type: "response-schema-nullable-changed",          before: true, after: false, expected: "INFO", label: "response body true→false" },
    { type: "response-schema-property-nullable-changed", before: true, after: false, expected: "INFO", label: "response property true→false" },
    { type: "response-schema-items-nullable-changed",    before: true, after: false, expected: "INFO", label: "response items true→false" },
    // Request: tightening (true→false) = BREAKING at all levels.
    { type: "request-schema-nullable-changed",           before: true, after: false, expected: "BREAKING", label: "request body true→false" },
    { type: "request-schema-property-nullable-changed",  before: true, after: false, expected: "BREAKING", label: "request property true→false" },
    { type: "request-schema-items-nullable-changed",     before: true, after: false, expected: "BREAKING", label: "request items true→false" },
    // Request: loosening (false→true) = INFO at all levels.
    { type: "request-schema-nullable-changed",           before: false, after: true, expected: "INFO", label: "request body false→true" },
    { type: "request-schema-property-nullable-changed",  before: false, after: true, expected: "INFO", label: "request property false→true" },
    { type: "request-schema-items-nullable-changed",     before: false, after: true, expected: "INFO", label: "request items false→true" },
  ];

  it.each(NULLABLE_CASES)("$label ($type $before→$after) → $expected", ({ type, before, after, expected }) => {
    const result = classifyChanges([raw(type, before, after, "test.nullable")]);
    expect(result[0]?.severity).toBe(expected);
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });
});

// ─── Cross-level readOnly/writeOnly consistency guard ─────────────────────────
// Verifies consistent direction-aware semantics across body, property, and items levels.
// Request readOnly false→true = BREAKING at all levels (clients blocked from sending).
// Response writeOnly false→true = BREAKING at all levels (payload disappears).
// All other directions = INFO.

describe("readOnly/writeOnly direction — cross-level consistency", () => {
  const RO_WO_CASES: Array<{ type: OapiChangeType; before: boolean; after: boolean; expected: "BREAKING" | "INFO"; label: string }> = [
    // Request readOnly false→true: BREAKING at body, property, items.
    { type: "request-schema-readonly-changed",           before: false, after: true, expected: "BREAKING", label: "request body readOnly false→true" },
    { type: "request-schema-property-readonly-changed",  before: false, after: true, expected: "BREAKING", label: "request property readOnly false→true" },
    { type: "request-schema-items-readonly-changed",     before: false, after: true, expected: "BREAKING", label: "request items readOnly false→true" },
    // Request readOnly true→false: INFO at all levels.
    { type: "request-schema-readonly-changed",           before: true, after: false, expected: "INFO", label: "request body readOnly true→false" },
    { type: "request-schema-property-readonly-changed",  before: true, after: false, expected: "INFO", label: "request property readOnly true→false" },
    { type: "request-schema-items-readonly-changed",     before: true, after: false, expected: "INFO", label: "request items readOnly true→false" },
    // Response readOnly both directions: INFO (annotation only, no payload change).
    { type: "response-schema-readonly-changed",          before: false, after: true, expected: "INFO", label: "response body readOnly false→true" },
    { type: "response-schema-property-readonly-changed", before: false, after: true, expected: "INFO", label: "response property readOnly false→true" },
    { type: "response-schema-items-readonly-changed",    before: false, after: true, expected: "INFO", label: "response items readOnly false→true" },
    // Response writeOnly false→true: BREAKING at body, property, items (payload disappears).
    { type: "response-schema-writeonly-changed",          before: false, after: true, expected: "BREAKING", label: "response body writeOnly false→true" },
    { type: "response-schema-property-writeonly-changed", before: false, after: true, expected: "BREAKING", label: "response property writeOnly false→true" },
    { type: "response-schema-items-writeonly-changed",    before: false, after: true, expected: "BREAKING", label: "response items writeOnly false→true" },
    // Response writeOnly true→false: INFO at all levels (payload now appears — non-breaking).
    { type: "response-schema-writeonly-changed",          before: true, after: false, expected: "INFO", label: "response body writeOnly true→false" },
    { type: "response-schema-property-writeonly-changed", before: true, after: false, expected: "INFO", label: "response property writeOnly true→false" },
    { type: "response-schema-items-writeonly-changed",    before: true, after: false, expected: "INFO", label: "response items writeOnly true→false" },
    // Request writeOnly both directions: INFO (annotation only).
    { type: "request-schema-writeonly-changed",           before: false, after: true, expected: "INFO", label: "request body writeOnly false→true" },
    { type: "request-schema-property-writeonly-changed",  before: false, after: true, expected: "INFO", label: "request property writeOnly false→true" },
    { type: "request-schema-items-writeonly-changed",     before: false, after: true, expected: "INFO", label: "request items writeOnly false→true" },
  ];

  it.each(RO_WO_CASES)("$label → $expected", ({ type, before, after, expected }) => {
    const result = classifyChanges([raw(type, before, after, "test.field")]);
    expect(result[0]?.severity).toBe(expected);
    expect(result[0]?.message).not.toMatch(/^Change detected at/);
  });
});

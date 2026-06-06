import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the vscode module before importing anything that depends on it.
vi.mock("vscode", () => {
  class MockRange {
    constructor(
      public startLine: number,
      public startChar: number,
      public endLine: number,
      public endChar: number,
    ) {}
  }
  class MockDiagnostic {
    public source = "";
    public code: string | undefined;
    constructor(
      public range: MockRange,
      public message: string,
      public severity: number,
    ) {}
  }
  return {
    Range: MockRange,
    Diagnostic: MockDiagnostic,
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
  };
});

import { buildDiagnostics, findLineForLocation } from "../providers/diagnosticProvider.js";
import type { BreakingChange } from "../../engine/types.js";
import * as vscode from "vscode";

function makeMockDocument(lines: string[]): vscode.TextDocument {
  return {
    lineCount: lines.length,
    lineAt(n: number) {
      const text = lines[n] ?? "";
      return { text, range: null };
    },
    getText: () => lines.join("\n"),
  } as unknown as vscode.TextDocument;
}

function makeChange(
  overrides: Partial<BreakingChange> = {},
): BreakingChange {
  return {
    severity: "BREAKING",
    type: "endpoint-removed",
    path: "/users",
    method: "get",
    location: "paths./users.get",
    message: "Endpoint removed",
    before: null,
    after: null,
    ...overrides,
  };
}

describe("findLineForLocation", () => {
  it("returns 0 when no matching key found", () => {
    const doc = makeMockDocument(["openapi: 3.0.0", "info:", "  title: T"]);
    expect(findLineForLocation(doc, "paths./nonexistent.get")).toBe(0);
  });

  it("finds the line containing the last path segment key (progressive search)", () => {
    const doc = makeMockDocument([
      "openapi: 3.0.0",
      "paths:",
      "  /users:",
      "    get:",
      "      summary: get users",
    ]);
    // Location "paths./users.get" — progressive: paths→line1, /users→line2, get→line3
    expect(findLineForLocation(doc, "paths./users.get")).toBe(3);
  });

  it("falls back to last successfully located segment when leaf not found", () => {
    const doc = makeMockDocument([
      "openapi: 3.0.0",
      "info:",
      "  title: My API",
    ]);
    // "info.title.nonexistent" — info→1, title→2, nonexistent→not found → returns 2
    expect(findLineForLocation(doc, "info.title.nonexistent")).toBe(2);
  });

  it("finds well-formatted JSON key at line start (anchored pattern)", () => {
    const doc = makeMockDocument([
      "{",
      '  "openapi": "3.0.0",',
      '  "info": {',
      '    "title": "T"',
      "  }",
      "}",
    ]);
    // "info" at line 2 (after spaces), "title" at line 3.
    expect(findLineForLocation(doc, "info.title")).toBe(3);
  });

  it("inline JSON (keys not at line start) returns 0 — anchored pattern prevents false positives inside strings", () => {
    const doc = makeMockDocument([
      '{"openapi":"3.0.0","info":',
      '  {"title":"T"}}',
    ]);
    // Keys are embedded inside the line, not at line start — anchored pattern won't match them.
    // This is the correct tradeoff: no false match inside a string value like '"description":"info: see below"'.
    expect(findLineForLocation(doc, "info.title")).toBe(0);
  });

  // N3 improvements: numeric index skipping + progressive search
  it("(N3) skips numeric array indices and finds the surrounding key", () => {
    const doc = makeMockDocument([
      "openapi: 3.0.0",
      "paths:",
      "  /users:",
      "    get:",
      "      parameters:",
      "        - name: userId",
      "          in: query",
      "          schema:",
      "            type: string",
      "            minLength: 3",
    ]);
    // "parameters[0].schema.minLength" — old code searched for "0:" (fails, falls back)
    // N3 code: skip "0", search schema from parameters line → minLength found at line 9
    const line = findLineForLocation(doc, "parameters[0].schema.minLength");
    expect(line).toBe(9);
  });

  it("(N3) progressive search finds correct key in second operation (not first)", () => {
    const doc = makeMockDocument([
      "openapi: 3.0.0",
      "paths:",
      "  /users:",
      "    get:",
      "      parameters:",
      "        - name: limit",
      "          schema:",
      "            minimum: 1",   // line 7: /users minimum
      "  /posts:",
      "    get:",
      "      parameters:",
      "        - name: page",
      "          schema:",
      "            minimum: 0",   // line 13: /posts minimum
    ]);
    // Location targeting /posts minimum should land at line 13, not line 7
    const line = findLineForLocation(doc, "paths./posts.get.parameters.schema.minimum");
    // Progressive: paths→1, /posts→8, get→9, parameters→10, schema→12, minimum→13
    expect(line).toBe(13);
  });

  it("(N3) handles server URL bracket syntax: servers[https://api.example.com]", () => {
    const doc = makeMockDocument([
      "openapi: 3.0.0",
      "servers:",
      "  - url: https://api.example.com",
    ]);
    // location "servers[https://api.example.com]" → segments: ["servers", "https://api.example.com"]
    // servers found at line 1; url with the full URL won't match as key, so returns line 1
    const line = findLineForLocation(doc, "servers[https://api.example.com]");
    expect(line).toBe(1); // at least the "servers:" line
  });

  it("(N3) returns 0 when document is empty", () => {
    const doc = makeMockDocument([]);
    expect(findLineForLocation(doc, "paths./users.get")).toBe(0);
  });

  it("(N3) handles location with only numeric segments (no YAML keys to find)", () => {
    const doc = makeMockDocument(["openapi: 3.0.0", "paths:"]);
    // All segments are numeric after filtering — nothing to search, returns 0
    expect(findLineForLocation(doc, "[0][1][2]")).toBe(0);
  });
});

describe("buildDiagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps BREAKING change to DiagnosticSeverity.Error (0)", () => {
    const doc = makeMockDocument(["openapi: 3.0.0", "paths:"]);
    const result = buildDiagnostics([makeChange({ severity: "BREAKING" })], doc);
    expect(result).toHaveLength(1);
    expect(result[0]!.severity).toBe(vscode.DiagnosticSeverity.Error);
  });

  it("maps INFO change to DiagnosticSeverity.Information (2)", () => {
    const doc = makeMockDocument(["openapi: 3.0.0"]);
    const result = buildDiagnostics([makeChange({ severity: "INFO" })], doc);
    expect(result[0]!.severity).toBe(vscode.DiagnosticSeverity.Information);
  });

  it("sets source to openapi-lens", () => {
    const doc = makeMockDocument(["openapi: 3.0.0"]);
    const result = buildDiagnostics([makeChange()], doc);
    expect(result[0]!.source).toBe("openapi-lens");
  });

  it("sets code to the change type", () => {
    const doc = makeMockDocument(["openapi: 3.0.0"]);
    const result = buildDiagnostics(
      [makeChange({ type: "parameter-added" })],
      doc,
    );
    expect(result[0]!.code).toBe("parameter-added");
  });

  it("preserves the change message", () => {
    const doc = makeMockDocument(["openapi: 3.0.0"]);
    const result = buildDiagnostics(
      [makeChange({ message: "The endpoint was removed" })],
      doc,
    );
    expect(result[0]!.message).toBe("The endpoint was removed");
  });

  it("returns empty array for no changes", () => {
    const doc = makeMockDocument(["openapi: 3.0.0"]);
    expect(buildDiagnostics([], doc)).toEqual([]);
  });

  it("produces one diagnostic per change", () => {
    const doc = makeMockDocument(["openapi: 3.0.0", "info:", "paths:"]);
    const changes = [
      makeChange({ severity: "BREAKING", message: "A" }),
      makeChange({ severity: "INFO", message: "B" }),
    ];
    const result = buildDiagnostics(changes, doc);
    expect(result).toHaveLength(2);
  });
});

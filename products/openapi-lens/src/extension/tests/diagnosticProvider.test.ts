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

  it("finds the line containing the last path segment key", () => {
    const doc = makeMockDocument([
      "openapi: 3.0.0",
      "paths:",
      "  /users:",
      "    get:",
      "      summary: get users",
    ]);
    // Location "paths./users.get" — last segment "get" matches line 3
    expect(findLineForLocation(doc, "paths./users.get")).toBe(3);
  });

  it("falls back to parent segment when leaf is not found", () => {
    const doc = makeMockDocument([
      "openapi: 3.0.0",
      "info:",
      "  title: My API",
    ]);
    // "info.title.nonexistent" — "nonexistent" not found, falls back to "title" on line 2
    expect(findLineForLocation(doc, "info.title.nonexistent")).toBe(2);
  });

  it("matches JSON-style quoted key", () => {
    const doc = makeMockDocument([
      '{"openapi":"3.0.0","info":',
      '  {"title":"T"}}',
    ]);
    expect(findLineForLocation(doc, "info.title")).toBeGreaterThanOrEqual(0);
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

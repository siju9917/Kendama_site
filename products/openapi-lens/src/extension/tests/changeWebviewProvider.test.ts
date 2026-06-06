import { describe, it, expect } from "vitest";
import { createChangeWebviewContent } from "../providers/changeWebviewProvider.js";
import type { BreakingChange } from "../../engine/types.js";

function makeBreaking(overrides: Partial<BreakingChange> = {}): BreakingChange {
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

function makeInfo(overrides: Partial<BreakingChange> = {}): BreakingChange {
  return {
    ...makeBreaking(),
    severity: "INFO",
    type: "endpoint-added",
    message: "Endpoint added",
    ...overrides,
  };
}

describe("createChangeWebviewContent", () => {
  it("returns valid HTML starting with <!DOCTYPE", () => {
    const html = createChangeWebviewContent([]);
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/);
  });

  it("includes Content-Security-Policy meta tag", () => {
    const html = createChangeWebviewContent([]);
    expect(html).toContain("Content-Security-Policy");
  });

  it("does not include any <script tags", () => {
    const html = createChangeWebviewContent([makeBreaking()]);
    expect(html.toLowerCase()).not.toContain("<script");
  });

  it("shows 'No API changes detected' when called with empty array", () => {
    const html = createChangeWebviewContent([]);
    expect(html).toMatch(/No API changes detected/);
  });

  it("shows 'No changes detected' pill for empty array", () => {
    const html = createChangeWebviewContent([]);
    expect(html).toContain("No changes detected");
  });

  it("shows BREAKING pill with count when breaking changes present", () => {
    const html = createChangeWebviewContent([makeBreaking(), makeBreaking()]);
    expect(html).toContain("2 BREAKING");
  });

  it("shows INFO pill with count when info changes present", () => {
    const html = createChangeWebviewContent([makeInfo()]);
    expect(html).toContain("1 INFO");
  });

  it("shows both BREAKING and INFO counts for mixed changes", () => {
    const html = createChangeWebviewContent([makeBreaking(), makeInfo(), makeInfo()]);
    expect(html).toContain("1 BREAKING");
    expect(html).toContain("2 INFO");
  });

  it("renders the change message in the table row", () => {
    const html = createChangeWebviewContent([makeBreaking({ message: "The /users endpoint was removed" })]);
    expect(html).toContain("The /users endpoint was removed");
  });

  it("renders operation path and method in the table row", () => {
    const html = createChangeWebviewContent([
      makeBreaking({ path: "/orders", method: "post" }),
    ]);
    expect(html).toContain("POST /orders");
  });

  it("renders location in the table row", () => {
    const html = createChangeWebviewContent([
      makeBreaking({ location: "paths./users.get.parameters[0]" }),
    ]);
    expect(html).toContain("paths./users.get.parameters[0]");
  });

  it("escapes HTML special characters in the message", () => {
    const html = createChangeWebviewContent([
      makeBreaking({ message: "Type changed from <string> to integer & more" }),
    ]);
    expect(html).toContain("&lt;string&gt;");
    expect(html).toContain("&amp;");
    expect(html).not.toContain("<string>");
  });

  it("escapes HTML in path containing special characters", () => {
    const html = createChangeWebviewContent([
      makeBreaking({ path: "/users/<id>/profile" }),
    ]);
    expect(html).toContain("&lt;id&gt;");
  });

  it("puts BREAKING rows before INFO rows in the table", () => {
    const html = createChangeWebviewContent([
      makeInfo({ message: "info-first" }),
      makeBreaking({ message: "breaking-second" }),
    ]);
    const infoIdx = html.indexOf("info-first");
    const breakingIdx = html.indexOf("breaking-second");
    expect(breakingIdx).toBeLessThan(infoIdx);
  });

  it("shows correct change count in the meta line", () => {
    const html = createChangeWebviewContent([makeBreaking(), makeInfo()]);
    expect(html).toContain("2 changes detected");
  });

  it("shows singular 'change' for exactly one change", () => {
    const html = createChangeWebviewContent([makeBreaking()]);
    expect(html).toContain("1 change detected");
    expect(html).not.toContain("1 changes");
  });

  it("renders correct table structure for non-empty input", () => {
    const html = createChangeWebviewContent([makeBreaking(), makeInfo()]);
    // Header row + 2 data rows = 3 tr elements
    const trCount = (html.match(/<tr[\s>]/g) ?? []).length;
    expect(trCount).toBe(3);
  });

  it("shows baseline label in meta line when provided", () => {
    const html = createChangeWebviewContent([makeBreaking()], "git HEAD");
    expect(html).toContain("baseline: git HEAD");
  });

  it("shows workspace baseline label in meta line", () => {
    const html = createChangeWebviewContent([], "workspace: baseline.yaml");
    expect(html).toContain("baseline: workspace: baseline.yaml");
  });

  it("omits baseline label from meta line when not provided", () => {
    const html = createChangeWebviewContent([]);
    expect(html).not.toContain("baseline:");
  });

  it("escapes HTML in baseline label", () => {
    const html = createChangeWebviewContent([], "workspace: <evil>.yaml");
    expect(html).toContain("&lt;evil&gt;");
    expect(html).not.toContain("<evil>");
  });

  it("renders spec-level changes (server-removed) with Spec-level label instead of method+path", () => {
    const serverChange: BreakingChange = {
      severity: "BREAKING",
      type: "server-removed",
      path: "/",
      method: "get",
      location: "servers[https://api.example.com]",
      message: "Server URL removed: servers[https://api.example.com]. Clients hard-coded to this base URL will no longer be able to reach the API.",
      before: "https://api.example.com",
      after: null,
    };
    const html = createChangeWebviewContent([serverChange]);
    expect(html).toContain("Spec-level");
    expect(html).not.toContain("GET /");
  });

  it("renders non-spec-level changes with method+path", () => {
    const opChange = makeBreaking({ type: "endpoint-removed", path: "/users", method: "get" });
    const html = createChangeWebviewContent([opChange]);
    expect(html).toContain("GET /users");
    expect(html).not.toContain("Spec-level");
  });
});

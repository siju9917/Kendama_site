import { describe, it, expect } from "vitest";
import { createPlanWebviewContent } from "../webview.js";
import type { TfClassification, TfChange, TfPlanSummary } from "../types.js";

function makeChange(overrides: Partial<TfChange> = {}): TfChange {
  return {
    address: "aws_instance.web",
    type: "aws_instance",
    name: "web",
    actions: ["update"],
    before: { id: "i-1" },
    after: { id: "i-1", instance_type: "t3.small" },
    ...overrides,
  };
}

function makeClassification(
  severity: "CRITICAL" | "NORMAL" | "NO-OP",
  change: Partial<TfChange> = {},
  reasons: string[] = ["A reason"],
): TfClassification {
  return { change: makeChange(change), severity, reasons };
}

function makeSummary(overrides: Partial<TfPlanSummary> = {}): TfPlanSummary {
  return {
    changes: [],
    critical: 0,
    normal: 0,
    noOp: 0,
    terraformVersion: "1.8.0",
    ...overrides,
  };
}

describe("createPlanWebviewContent", () => {
  it("returns a valid HTML string starting with <!DOCTYPE", () => {
    const html = createPlanWebviewContent(makeSummary());
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/);
  });

  it("contains the terraform version", () => {
    const html = createPlanWebviewContent(makeSummary({ terraformVersion: "1.5.7" }));
    expect(html).toContain("1.5.7");
  });

  it("shows 'No resource changes detected' for empty plan", () => {
    const html = createPlanWebviewContent(makeSummary());
    expect(html).toMatch(/No resource changes detected/);
  });

  it("shows CRITICAL pill when there are critical changes", () => {
    const html = createPlanWebviewContent(
      makeSummary({
        changes: [makeClassification("CRITICAL")],
        critical: 1,
      }),
    );
    expect(html).toContain("1 CRITICAL");
  });

  it("shows NORMAL pill when there are normal changes", () => {
    const html = createPlanWebviewContent(
      makeSummary({
        changes: [makeClassification("NORMAL")],
        normal: 1,
      }),
    );
    expect(html).toContain("1 NORMAL");
  });

  it("escapes HTML special chars in resource address", () => {
    const html = createPlanWebviewContent(
      makeSummary({
        changes: [makeClassification("CRITICAL", { address: "module.<xss>.aws_instance.web" })],
        critical: 1,
      }),
    );
    expect(html).toContain("&lt;xss&gt;");
    expect(html).not.toContain("<xss>");
  });

  it("escapes HTML special chars in reasons", () => {
    const html = createPlanWebviewContent(
      makeSummary({
        changes: [
          makeClassification("CRITICAL", {}, ["This <b>resource</b> will be deleted & lost."]),
        ],
        critical: 1,
      }),
    );
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain("&amp;");
    expect(html).not.toContain("<b>resource</b>");
  });

  it("includes a Content-Security-Policy meta tag", () => {
    const html = createPlanWebviewContent(makeSummary());
    expect(html).toContain("Content-Security-Policy");
  });

  it("does not include script tags (WebView sandbox safety)", () => {
    const html = createPlanWebviewContent(
      makeSummary({
        changes: [makeClassification("CRITICAL")],
        critical: 1,
      }),
    );
    expect(html.toLowerCase()).not.toContain("<script");
  });

  it("includes Phase 1 limitations note", () => {
    const html = createPlanWebviewContent(makeSummary());
    expect(html.toLowerCase()).toContain("phase 1 limitations");
  });

  it("renders correct row count for mixed plan", () => {
    const html = createPlanWebviewContent(
      makeSummary({
        changes: [
          makeClassification("CRITICAL"),
          makeClassification("NORMAL"),
          makeClassification("NO-OP"),
        ],
        critical: 1,
        normal: 1,
        noOp: 1,
      }),
    );
    // Each row has a <tr> tag
    // Data rows have class attributes (<tr class="...">), header has none (<tr>).
    // Count all tr tags (with or without attributes).
    const trCount = (html.match(/<tr[\s>]/g) ?? []).length;
    // 1 header tr (<tr>) + 3 data rows (<tr class="...">) = 4
    expect(trCount).toBe(4);
  });
});

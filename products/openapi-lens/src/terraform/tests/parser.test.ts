import { describe, it, expect } from "vitest";
import { parseTerraformPlan, isTerraformPlanJson } from "../parser.js";

function makePlan(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    format_version: "1.0",
    terraform_version: "1.8.0",
    resource_changes: [],
    ...overrides,
  });
}

function makeResourceChange(
  address: string,
  type: string,
  actions: string[],
  before: Record<string, unknown> | null = null,
  after: Record<string, unknown> | null = { id: "new" },
) {
  return {
    address,
    type,
    name: address.split(".")[1] ?? "main",
    module_address: "",
    mode: "managed",
    change: { actions, before, after, after_unknown: {} },
  };
}

describe("parseTerraformPlan", () => {
  it("parses a valid empty plan (no resource changes)", () => {
    const result = parseTerraformPlan(makePlan());
    expect(result.changes).toHaveLength(0);
    expect(result.critical).toBe(0);
    expect(result.normal).toBe(0);
    expect(result.noOp).toBe(0);
    expect(result.terraformVersion).toBe("1.8.0");
  });

  it("parses terraform_version correctly", () => {
    const result = parseTerraformPlan(makePlan({ terraform_version: "1.5.2" }));
    expect(result.terraformVersion).toBe("1.5.2");
  });

  it("falls back to 'unknown' when terraform_version is missing", () => {
    const plan: Record<string, unknown> = {
      format_version: "1.0",
      resource_changes: [],
    };
    const result = parseTerraformPlan(JSON.stringify(plan));
    expect(result.terraformVersion).toBe("unknown");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseTerraformPlan("not json at all")).toThrow("JSON parse failed");
  });

  it("throws on JSON array (not an object)", () => {
    expect(() => parseTerraformPlan("[]")).toThrow();
  });

  it("throws when resource_changes is missing", () => {
    expect(() =>
      parseTerraformPlan(JSON.stringify({ format_version: "1.0" })),
    ).toThrow("resource_changes");
  });

  it("throws when resource_changes is not an array", () => {
    expect(() =>
      parseTerraformPlan(JSON.stringify({ resource_changes: "not-array" })),
    ).toThrow("resource_changes");
  });

  it("parses a plan with a create change", () => {
    const plan = makePlan({
      resource_changes: [
        makeResourceChange("aws_instance.web", "aws_instance", ["create"]),
      ],
    });
    const result = parseTerraformPlan(plan);
    expect(result.changes).toHaveLength(1);
    expect(result.normal).toBe(1);
    expect(result.critical).toBe(0);
  });

  it("parses a plan with a delete change (CRITICAL)", () => {
    const plan = makePlan({
      resource_changes: [
        makeResourceChange("aws_db_instance.main", "aws_db_instance", ["delete"], { id: "old" }, null),
      ],
    });
    const result = parseTerraformPlan(plan);
    expect(result.critical).toBe(1);
  });

  it("counts critical, normal, noOp separately", () => {
    const plan = makePlan({
      resource_changes: [
        makeResourceChange("aws_instance.web", "aws_instance", ["update"]),
        makeResourceChange("aws_db_instance.main", "aws_db_instance", ["update"], { id: "db" }),
        makeResourceChange("aws_s3_bucket.logs", "aws_s3_bucket", ["no-op"], null, null),
      ],
    });
    const result = parseTerraformPlan(plan);
    expect(result.normal).toBe(1);    // aws_instance update
    expect(result.critical).toBe(1);  // aws_db_instance update
    expect(result.noOp).toBe(1);      // aws_s3_bucket no-op
  });

  it("silently skips malformed resource_changes entries (missing change field)", () => {
    const plan = JSON.stringify({
      format_version: "1.0",
      resource_changes: [
        { address: "bad_entry" },
        makeResourceChange("aws_instance.web", "aws_instance", ["create"]),
      ],
    });
    const result = parseTerraformPlan(plan);
    expect(result.changes).toHaveLength(1);
  });
});

describe("isTerraformPlanJson", () => {
  it("detects terraform plan by resource_changes + format_version", () => {
    const text = '{"format_version":"1.0","resource_changes":[],"terraform_version":"1.8.0"}';
    expect(isTerraformPlanJson(text)).toBe(true);
  });

  it("detects plan by resource_changes + terraform_version (no format_version)", () => {
    const text = '{"terraform_version":"1.8.0","resource_changes":[]}';
    expect(isTerraformPlanJson(text)).toBe(true);
  });

  it("returns false for plain JSON without terraform fields", () => {
    expect(isTerraformPlanJson('{"name":"foo","version":"1"}')).toBe(false);
  });

  it("returns false for resource_changes alone (no version field)", () => {
    expect(isTerraformPlanJson('{"resource_changes":[]}')).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isTerraformPlanJson("")).toBe(false);
  });

  it("detects plan even when content appears beyond first 300 chars but within 2000", () => {
    const padding = "x".repeat(400);
    const text = `{"foo":"${padding}","resource_changes":[],"terraform_version":"1.0"}`;
    // The key 'resource_changes' appears after 400+ chars padding — still within 2000 slice
    expect(isTerraformPlanJson(text)).toBe(true);
  });
});

describe("parseTerraformPlan — output_changes", () => {
  it("returns empty outputChanges when output_changes is absent", () => {
    const result = parseTerraformPlan(makePlan());
    expect(result.outputChanges).toEqual([]);
  });

  it("parses a created output", () => {
    const result = parseTerraformPlan(
      makePlan({
        output_changes: {
          bucket_name: { actions: ["create"], before: null, after: "my-bucket" },
        },
      }),
    );
    expect(result.outputChanges).toHaveLength(1);
    expect(result.outputChanges[0]!.name).toBe("bucket_name");
    expect(result.outputChanges[0]!.actions).toEqual(["create"]);
    expect(result.outputChanges[0]!.sensitive).toBe(false);
  });

  it("parses a sensitive output (boolean true) and marks it sensitive", () => {
    const result = parseTerraformPlan(
      makePlan({
        output_changes: {
          db_password: {
            actions: ["update"],
            before: "old",
            after_sensitive: true,
            after: null,
          },
        },
      }),
    );
    expect(result.outputChanges[0]!.sensitive).toBe(true);
  });

  it("marks sensitive when after_sensitive is a partial-sensitive object", () => {
    // Complex output where only some fields are sensitive (Terraform marks them as an object).
    const result = parseTerraformPlan(
      makePlan({
        output_changes: {
          db_config: {
            actions: ["update"],
            before: { host: "db.example.com", password: "old" },
            after: { host: "db.example.com", password: null },
            after_sensitive: { password: true },
          },
        },
      }),
    );
    expect(result.outputChanges[0]!.sensitive).toBe(true);
  });

  it("does not mark sensitive when after_sensitive is false", () => {
    const result = parseTerraformPlan(
      makePlan({
        output_changes: {
          public_ip: {
            actions: ["update"],
            before: "1.2.3.4",
            after: "5.6.7.8",
            after_sensitive: false,
          },
        },
      }),
    );
    expect(result.outputChanges[0]!.sensitive).toBe(false);
  });

  it("skips no-op outputs", () => {
    const result = parseTerraformPlan(
      makePlan({
        output_changes: {
          stable_output: { actions: ["no-op"], before: "v1", after: "v1" },
          changed_output: { actions: ["update"], before: "v1", after: "v2" },
        },
      }),
    );
    expect(result.outputChanges).toHaveLength(1);
    expect(result.outputChanges[0]!.name).toBe("changed_output");
  });

  it("returns empty outputChanges when output_changes is not an object", () => {
    const result = parseTerraformPlan(makePlan({ output_changes: null }));
    expect(result.outputChanges).toEqual([]);
  });
});

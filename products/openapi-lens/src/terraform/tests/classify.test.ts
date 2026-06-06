import { describe, it, expect } from "vitest";
import { classifyChange, isNoOp, hasReplacePattern, isCreateOnly } from "../classify.js";
import type { TfChange } from "../types.js";

function makeChange(overrides: Partial<TfChange> = {}): TfChange {
  return {
    address: "aws_instance.web",
    type: "aws_instance",
    name: "web",
    actions: ["update"],
    before: { instance_type: "t3.micro" },
    after: { instance_type: "t3.small" },
    ...overrides,
  };
}

describe("isNoOp", () => {
  it("returns true for ['no-op']", () => {
    expect(isNoOp(["no-op"])).toBe(true);
  });

  it("returns true for multiple no-op actions", () => {
    expect(isNoOp(["no-op", "no-op"])).toBe(true);
  });

  it("returns false for ['update']", () => {
    expect(isNoOp(["update"])).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(isNoOp([])).toBe(false);
  });

  it("returns false for mixed no-op and update", () => {
    expect(isNoOp(["no-op", "update"])).toBe(false);
  });
});

describe("hasReplacePattern", () => {
  it("detects Terraform 0.15+ 'replace' action", () => {
    expect(hasReplacePattern(["replace"])).toBe(true);
  });

  it("detects ['delete', 'create'] replace pattern", () => {
    expect(hasReplacePattern(["delete", "create"])).toBe(true);
  });

  it("detects ['create', 'delete'] (create_before_destroy)", () => {
    expect(hasReplacePattern(["create", "delete"])).toBe(true);
  });

  it("returns false for ['delete'] alone", () => {
    expect(hasReplacePattern(["delete"])).toBe(false);
  });

  it("returns false for ['update']", () => {
    expect(hasReplacePattern(["update"])).toBe(false);
  });
});

describe("isCreateOnly", () => {
  it("returns true for ['create']", () => {
    expect(isCreateOnly(["create"])).toBe(true);
  });

  it("returns false for ['create', 'delete']", () => {
    expect(isCreateOnly(["create", "delete"])).toBe(false);
  });

  it("returns false for ['update']", () => {
    expect(isCreateOnly(["update"])).toBe(false);
  });
});

describe("classifyChange", () => {
  it("classifies no-op as NO-OP with no reasons", () => {
    const c = classifyChange(makeChange({ actions: ["no-op"] }));
    expect(c.severity).toBe("NO-OP");
    expect(c.reasons).toHaveLength(0);
  });

  it("classifies pure delete as CRITICAL", () => {
    const c = classifyChange(makeChange({ actions: ["delete"], after: null }));
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("DELETED"))).toBe(true);
  });

  it("classifies replace (['delete','create']) as CRITICAL", () => {
    const c = classifyChange(makeChange({ actions: ["delete", "create"] }));
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("REPLACED"))).toBe(true);
  });

  it("classifies replace (['replace']) as CRITICAL", () => {
    const c = classifyChange(makeChange({ actions: ["replace"] }));
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("REPLACED"))).toBe(true);
  });

  it("classifies create_before_destroy (['create','delete']) as CRITICAL", () => {
    const c = classifyChange(makeChange({ actions: ["create", "delete"] }));
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("REPLACED"))).toBe(true);
  });

  it("classifies new resource creation as NORMAL", () => {
    const c = classifyChange(makeChange({ actions: ["create"], before: null }));
    expect(c.severity).toBe("NORMAL");
    expect(c.reasons.some((r) => r.includes("created"))).toBe(true);
  });

  it("classifies stateless compute in-place update as NORMAL", () => {
    const c = classifyChange(makeChange({ actions: ["update"] }));
    expect(c.severity).toBe("NORMAL");
    expect(c.reasons.some((r) => r.includes("in-place"))).toBe(true);
  });

  it("classifies data store update as CRITICAL", () => {
    const c = classifyChange(
      makeChange({ type: "aws_db_instance", address: "aws_db_instance.main", actions: ["update"] }),
    );
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("data store"))).toBe(true);
  });

  it("classifies data store creation as NORMAL (no existing state)", () => {
    const c = classifyChange(
      makeChange({ type: "aws_db_instance", address: "aws_db_instance.main", actions: ["create"], before: null }),
    );
    expect(c.severity).toBe("NORMAL");
  });

  it("classifies data store replacement as CRITICAL", () => {
    const c = classifyChange(
      makeChange({ type: "aws_s3_bucket", address: "aws_s3_bucket.data", actions: ["replace"] }),
    );
    expect(c.severity).toBe("CRITICAL");
  });

  it("classifies IAM role update as CRITICAL", () => {
    const c = classifyChange(
      makeChange({ type: "aws_iam_role", address: "aws_iam_role.lambda", actions: ["update"] }),
    );
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("IAM") || r.includes("access"))).toBe(true);
  });

  it("classifies security group update as CRITICAL", () => {
    const c = classifyChange(
      makeChange({
        type: "aws_security_group",
        address: "aws_security_group.web",
        actions: ["update"],
      }),
    );
    expect(c.severity).toBe("CRITICAL");
  });

  it("classifies IAM role creation as NORMAL", () => {
    const c = classifyChange(
      makeChange({
        type: "aws_iam_role",
        address: "aws_iam_role.new_role",
        actions: ["create"],
        before: null,
      }),
    );
    expect(c.severity).toBe("NORMAL");
  });

  it("preserves the original change object in the classification", () => {
    const change = makeChange();
    const c = classifyChange(change);
    expect(c.change).toBe(change);
  });

  it("returns at least one reason for every non-NO-OP classification", () => {
    const changes: TfChange[] = [
      makeChange({ actions: ["update"] }),
      makeChange({ actions: ["create"], before: null }),
      makeChange({ actions: ["delete"], after: null }),
      makeChange({ actions: ["replace"] }),
    ];
    for (const ch of changes) {
      const c = classifyChange(ch);
      expect(c.reasons.length).toBeGreaterThan(0);
    }
  });
});

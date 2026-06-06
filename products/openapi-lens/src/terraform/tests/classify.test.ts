import { describe, it, expect } from "vitest";
import { classifyChange, isNoOp, hasReplacePattern, isCreateOnly, analyzeIamDirection } from "../classify.js";
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

// ─── POLISH T1: direction-aware IAM classification ───────────────────────────

function makePolicy(statements: Array<{ Effect: string; Action: string | string[]; Resource: string }>): string {
  return JSON.stringify({ Version: "2012-10-17", Statement: statements });
}

describe("analyzeIamDirection", () => {
  it("returns 'unknown' when before is null", () => {
    expect(analyzeIamDirection(null, { policy: makePolicy([]) })).toBe("unknown");
  });

  it("returns 'unknown' when after is null", () => {
    expect(analyzeIamDirection({ policy: makePolicy([]) }, null)).toBe("unknown");
  });

  it("returns 'unknown' when no IAM policy or CIDR data present", () => {
    expect(analyzeIamDirection({ instance_type: "t3.micro" }, { instance_type: "t3.small" })).toBe("unknown");
  });

  it("returns 'widening' when a new Allow statement is added", () => {
    const before = { policy: makePolicy([{ Effect: "Allow", Action: "s3:GetObject", Resource: "*" }]) };
    const after  = { policy: makePolicy([
      { Effect: "Allow", Action: "s3:GetObject", Resource: "*" },
      { Effect: "Allow", Action: "s3:PutObject", Resource: "*" },
    ]) };
    expect(analyzeIamDirection(before, after)).toBe("widening");
  });

  it("returns 'narrowing' when an Allow statement is removed", () => {
    const before = { policy: makePolicy([
      { Effect: "Allow", Action: "s3:GetObject", Resource: "*" },
      { Effect: "Allow", Action: "s3:PutObject", Resource: "*" },
    ]) };
    const after  = { policy: makePolicy([{ Effect: "Allow", Action: "s3:GetObject", Resource: "*" }]) };
    expect(analyzeIamDirection(before, after)).toBe("narrowing");
  });

  it("returns 'widening' when a wildcard Action (*) is added to an existing Allow statement", () => {
    const before = { policy: makePolicy([{ Effect: "Allow", Action: "s3:GetObject", Resource: "*" }]) };
    const after  = { policy: makePolicy([{ Effect: "Allow", Action: "*", Resource: "*" }]) };
    expect(analyzeIamDirection(before, after)).toBe("widening");
  });

  it("returns 'narrowing' when a wildcard Action (*) is removed", () => {
    const before = { policy: makePolicy([{ Effect: "Allow", Action: "*", Resource: "*" }]) };
    const after  = { policy: makePolicy([{ Effect: "Allow", Action: "s3:GetObject", Resource: "*" }]) };
    expect(analyzeIamDirection(before, after)).toBe("narrowing");
  });

  it("returns 'unknown' when Allow counts and wildcards are equal (same-count change)", () => {
    const before = { policy: makePolicy([{ Effect: "Allow", Action: "s3:GetObject", Resource: "*" }]) };
    const after  = { policy: makePolicy([{ Effect: "Allow", Action: "s3:PutObject", Resource: "*" }]) };
    expect(analyzeIamDirection(before, after)).toBe("unknown");
  });

  it("returns 'widening' when a security group CIDR is added", () => {
    const before = { cidr_blocks: ["10.0.0.0/8"] };
    const after  = { cidr_blocks: ["10.0.0.0/8", "0.0.0.0/0"] };
    expect(analyzeIamDirection(before, after)).toBe("widening");
  });

  it("returns 'narrowing' when a security group CIDR is removed", () => {
    const before = { cidr_blocks: ["0.0.0.0/0", "10.0.0.0/8"] };
    const after  = { cidr_blocks: ["10.0.0.0/8"] };
    expect(analyzeIamDirection(before, after)).toBe("narrowing");
  });

  it("returns 'widening' when ingress rule CIDR count increases", () => {
    const before = { ingress: [{ cidr_blocks: ["10.0.0.0/8"] }] };
    const after  = { ingress: [{ cidr_blocks: ["10.0.0.0/8", "192.168.0.0/16"] }] };
    expect(analyzeIamDirection(before, after)).toBe("widening");
  });

  // F3-1: Deny statement direction analysis
  it("returns 'widening' when a Deny statement is removed (access becomes broader)", () => {
    const before = { policy: makePolicy([
      { Effect: "Allow", Action: "s3:*", Resource: "*" },
      { Effect: "Deny", Action: "s3:DeleteObject", Resource: "*" },
    ]) };
    const after = { policy: makePolicy([{ Effect: "Allow", Action: "s3:*", Resource: "*" }]) };
    expect(analyzeIamDirection(before, after)).toBe("widening");
  });

  it("returns 'narrowing' when a Deny statement is added (access becomes more restricted)", () => {
    const before = { policy: makePolicy([{ Effect: "Allow", Action: "s3:*", Resource: "*" }]) };
    const after = { policy: makePolicy([
      { Effect: "Allow", Action: "s3:*", Resource: "*" },
      { Effect: "Deny", Action: "s3:DeleteObject", Resource: "*" },
    ]) };
    expect(analyzeIamDirection(before, after)).toBe("narrowing");
  });

  it("returns 'unknown' when Allow count drops AND Deny count also drops (ambiguous net direction)", () => {
    // Removing one Allow and one Deny simultaneously — net access direction is unclear.
    const before = { policy: makePolicy([
      { Effect: "Allow", Action: "s3:GetObject", Resource: "*" },
      { Effect: "Allow", Action: "s3:PutObject", Resource: "*" },
      { Effect: "Deny", Action: "s3:DeleteObject", Resource: "*" },
    ]) };
    const after = { policy: makePolicy([
      { Effect: "Allow", Action: "s3:GetObject", Resource: "*" },
    ]) };
    expect(analyzeIamDirection(before, after)).toBe("unknown");
  });

  // F3-5: assume_role_policy field (aws_iam_role trust policy)
  it("returns 'widening' when aws_iam_role assume_role_policy gains an Allow statement", () => {
    const before = { assume_role_policy: makePolicy([{ Effect: "Allow", Action: "sts:AssumeRole", Resource: "arn:aws:iam::123:root" }]) };
    const after  = { assume_role_policy: makePolicy([
      { Effect: "Allow", Action: "sts:AssumeRole", Resource: "arn:aws:iam::123:root" },
      { Effect: "Allow", Action: "sts:AssumeRole", Resource: "arn:aws:iam::456:root" },
    ]) };
    expect(analyzeIamDirection(before, after)).toBe("widening");
  });

  it("returns 'narrowing' when aws_iam_role assume_role_policy loses an Allow statement", () => {
    const before = { assume_role_policy: makePolicy([
      { Effect: "Allow", Action: "sts:AssumeRole", Resource: "arn:aws:iam::123:root" },
      { Effect: "Allow", Action: "sts:AssumeRole", Resource: "arn:aws:iam::456:root" },
    ]) };
    const after  = { assume_role_policy: makePolicy([{ Effect: "Allow", Action: "sts:AssumeRole", Resource: "arn:aws:iam::123:root" }]) };
    expect(analyzeIamDirection(before, after)).toBe("narrowing");
  });
});

describe("classifyChange — Rule 5 (T1 direction-aware IAM)", () => {
  function makeIamChange(policyBefore: string | undefined, policyAfter: string | undefined): TfChange {
    return {
      address: "aws_iam_policy.app",
      type: "aws_iam_policy",
      name: "app",
      actions: ["update"],
      before: policyBefore !== undefined ? { policy: policyBefore } : null,
      after: policyAfter !== undefined ? { policy: policyAfter } : null,
    };
  }

  it("narrowing IAM change (statement removed) → NORMAL severity", () => {
    const before = makePolicy([
      { Effect: "Allow", Action: "s3:GetObject", Resource: "*" },
      { Effect: "Allow", Action: "s3:PutObject", Resource: "*" },
    ]);
    const after = makePolicy([{ Effect: "Allow", Action: "s3:GetObject", Resource: "*" }]);
    const c = classifyChange(makeIamChange(before, after));
    expect(c.severity).toBe("NORMAL");
    expect(c.reasons.some((r) => r.includes("RESTRICT"))).toBe(true);
  });

  it("widening IAM change (statement added) → CRITICAL severity", () => {
    const before = makePolicy([{ Effect: "Allow", Action: "s3:GetObject", Resource: "*" }]);
    const after = makePolicy([
      { Effect: "Allow", Action: "s3:GetObject", Resource: "*" },
      { Effect: "Allow", Action: "s3:PutObject", Resource: "*" },
    ]);
    const c = classifyChange(makeIamChange(before, after));
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("WIDENED"))).toBe(true);
  });

  it("unknown IAM direction (no policy field, no CIDR data) → CRITICAL (conservative)", () => {
    const c = classifyChange({
      address: "aws_iam_role.lambda",
      type: "aws_iam_role",
      name: "lambda",
      actions: ["update"],
      before: { assume_role_policy: "{}" },
      after: { assume_role_policy: "{}" },
    });
    expect(c.severity).toBe("CRITICAL");
  });

  it("narrowing IAM change that is ALSO being replaced → CRITICAL (Rule 3 wins)", () => {
    const before = makePolicy([
      { Effect: "Allow", Action: "s3:GetObject", Resource: "*" },
      { Effect: "Allow", Action: "s3:PutObject", Resource: "*" },
    ]);
    const after = makePolicy([{ Effect: "Allow", Action: "s3:GetObject", Resource: "*" }]);
    const c = classifyChange({
      address: "aws_iam_policy.app",
      type: "aws_iam_policy",
      name: "app",
      actions: ["delete", "create"], // replacement — Rule 3 fires first
      before: { policy: before },
      after: { policy: after },
    });
    // Rule 3 sets severity=CRITICAL before Rule 5 runs; T1 narrowing doesn't override that.
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("REPLACED"))).toBe(true);
  });
});

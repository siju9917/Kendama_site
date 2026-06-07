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
    // F3-11: Rule 5 reason must NOT claim access is being widened (the direction is narrowing).
    const rule5Reason = c.reasons.find((r) => r.includes("IAM change is CRITICAL"));
    expect(rule5Reason).toBeDefined();
    expect(rule5Reason).not.toContain("WIDENED");
    expect(rule5Reason).toContain("restrictive");
  });
});

// ─── P2 coverage: CIDR analysis + ipv6 + double-counting guard ───────────────

describe("analyzeIamDirection — P2 coverage", () => {
  it("returns 'widening' when ipv6_cidr_blocks is added", () => {
    const before = { ipv6_cidr_blocks: [] as string[] };
    const after  = { ipv6_cidr_blocks: ["::/0"] };
    expect(analyzeIamDirection(before, after)).toBe("widening");
  });

  it("returns 'narrowing' when ipv6_cidr_blocks is removed", () => {
    const before = { ipv6_cidr_blocks: ["::/0", "2001:db8::/32"] };
    const after  = { ipv6_cidr_blocks: ["::/0"] };
    expect(analyzeIamDirection(before, after)).toBe("narrowing");
  });

  it("does not double-count when both cidr_blocks and ingress.cidr_blocks are present", () => {
    // When top-level cidr_blocks is present, ingress block CIDRs are NOT counted.
    // This prevents inflation that would skew the delta comparison.
    const before = { cidr_blocks: ["10.0.0.0/8"], ingress: [{ cidr_blocks: ["10.0.0.0/8"] }] };
    const after  = { cidr_blocks: ["10.0.0.0/8", "192.168.0.0/16"], ingress: [{ cidr_blocks: ["10.0.0.0/8"] }] };
    // Top-level counts: before=1, after=2 → widening (ingress NOT double-counted).
    expect(analyzeIamDirection(before, after)).toBe("widening");
  });

  it("counts ingress nested CIDRs when no top-level cidr_blocks field exists", () => {
    const before = { ingress: [{ cidr_blocks: ["10.0.0.0/8"] }, { ipv6_cidr_blocks: ["::/0"] }] };
    const after  = { ingress: [{ cidr_blocks: ["10.0.0.0/8"] }] };
    // Nested: before has 2 CIDRs (1 IPv4 + 1 IPv6), after has 1 → narrowing.
    expect(analyzeIamDirection(before, after)).toBe("narrowing");
  });
});

// ─── Round 103: data store deletion + IAM widening+replacement ───────────────
// Two untested multi-rule interactions:
//   1. Data store DELETED (not replaced): Rule 2 (delete → CRITICAL) AND Rule 4
//      (data store modification → CRITICAL) both fire, generating 2 CRITICAL reasons.
//   2. IAM resource REPLACED with WIDENING policy: Rule 3 (replacement → CRITICAL)
//      AND Rule 5 (IAM widening → CRITICAL + WIDENED note) both fire.

describe("classifyChange — Rule 2+4 and Rule 3+5 interactions (round 103)", () => {
  it("(R103-1) data store deletion fires BOTH Rule 2 (deleted) and Rule 4 (data store) reasons", () => {
    const c = classifyChange(
      makeChange({
        type: "aws_db_instance",
        address: "aws_db_instance.main",
        actions: ["delete"],
        after: null,
      }),
    );
    expect(c.severity).toBe("CRITICAL");

    // Rule 2 reason: permanently DELETED.
    const deleteReason = c.reasons.find((r) => r.includes("DELETED"));
    expect(deleteReason).toBeDefined();

    // Rule 4 reason: data store modification/deletion risks data loss.
    const dataStoreReason = c.reasons.find((r) => r.includes("data store"));
    expect(dataStoreReason).toBeDefined();

    // Both reasons should be present simultaneously.
    expect(c.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("(R103-2) IAM resource replacement with widening policy: CRITICAL with WIDENED note in Rule 5 reason", () => {
    // Rule 3 (replacement → CRITICAL) fires first; Rule 5 detects widening and
    // appends the '(access appears to be WIDENED)' note to the IAM reason.
    const beforePolicy = JSON.stringify({
      Statement: [{ Effect: "Allow", Action: "s3:GetObject", Resource: "*" }],
    });
    const afterPolicy = JSON.stringify({
      Statement: [
        { Effect: "Allow", Action: "s3:GetObject", Resource: "*" },
        { Effect: "Allow", Action: "s3:PutObject", Resource: "*" },
      ],
    });
    const c = classifyChange({
      address: "aws_iam_policy.app",
      type: "aws_iam_policy",
      name: "app",
      actions: ["delete", "create"], // replacement
      before: { policy: beforePolicy },
      after: { policy: afterPolicy },
    });
    expect(c.severity).toBe("CRITICAL");

    // Rule 3 reason: REPLACED.
    const replaceReason = c.reasons.find((r) => r.includes("REPLACED"));
    expect(replaceReason).toBeDefined();

    // Rule 5 reason: IAM change CRITICAL with WIDENED note.
    const iamReason = c.reasons.find((r) => r.includes("IAM change is CRITICAL"));
    expect(iamReason).toBeDefined();
    expect(iamReason).toContain("WIDENED");
  });

  it("(R103-3) data store delete+create replacement fires Rule 3 AND Rule 4 (both CRITICAL reasons)", () => {
    // A data store that is replaced (not just deleted) triggers Rule 3 for replacement
    // and Rule 4 for being a data store. Unlike a plain delete, both rules should fire.
    const c = classifyChange(
      makeChange({
        type: "aws_s3_bucket",
        address: "aws_s3_bucket.data",
        actions: ["delete", "create"],
      }),
    );
    expect(c.severity).toBe("CRITICAL");

    // Rule 3: REPLACED.
    expect(c.reasons.some((r) => r.includes("REPLACED"))).toBe(true);

    // Rule 4: data store.
    expect(c.reasons.some((r) => r.includes("data store"))).toBe(true);

    // Should have at least 2 distinct reasons.
    expect(c.reasons.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Round 105: IAM deletion + inline_policy + egress CIDR paths ─────────────
// Three paths genuinely untested before this round:
//   1. IAM resource DELETED (not replaced): Rule 2 (DELETED) + Rule 5 (IAM CRITICAL, direction unclear)
//      both fire simultaneously. No prior test covered Rule 2 + Rule 5 for a pure delete.
//   2. `inline_policy` field: extractIamStatements iterates ["policy","assume_role_policy","inline_policy"];
//      the third field was never exercised.
//   3. Egress CIDR block counting: extractCidrCount falls back to nested ingress/egress blocks;
//      the egress branch was never hit — only ingress was tested in round P2.

describe("classifyChange — Rule 2+5 IAM deletion + inline_policy + egress CIDR (round 105)", () => {
  it("(R105-1) IAM resource deletion fires BOTH Rule 2 (DELETED) and Rule 5 (IAM CRITICAL) reasons", () => {
    // Deleting an IAM resource triggers Rule 2 (any delete → CRITICAL) and Rule 5
    // (IAM type + not create + not no-op → IAM CRITICAL).
    // Since after=null, analyzeIamDirection returns "unknown", so Rule 5 adds
    // "direction unclear" note — NOT "WIDENED".
    const c = classifyChange(
      makeChange({
        address: "aws_iam_role.app",
        type: "aws_iam_role",
        actions: ["delete"],
        after: null,
      }),
    );
    expect(c.severity).toBe("CRITICAL");

    // Rule 2 reason: permanently DELETED.
    const deleteReason = c.reasons.find((r) => r.includes("DELETED"));
    expect(deleteReason).toBeDefined();

    // Rule 5 reason: IAM change CRITICAL — direction unclear (after=null → unknown direction).
    const iamReason = c.reasons.find((r) => r.includes("IAM change is CRITICAL"));
    expect(iamReason).toBeDefined();
    expect(iamReason).not.toContain("WIDENED");
    expect(iamReason).toContain("unclear");

    // Both reasons emitted simultaneously.
    expect(c.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("(R105-2) analyzeIamDirection detects widening via inline_policy field", () => {
    // extractIamStatements checks "policy", "assume_role_policy", then "inline_policy".
    // The "inline_policy" branch was never hit in previous test rounds.
    const beforePolicy = JSON.stringify({
      Statement: [{ Effect: "Allow", Action: "s3:GetObject", Resource: "*" }],
    });
    const afterPolicy = JSON.stringify({
      Statement: [
        { Effect: "Allow", Action: "s3:GetObject", Resource: "*" },
        { Effect: "Allow", Action: "s3:PutObject", Resource: "*" },
      ],
    });
    // Use only the "inline_policy" field (no "policy" or "assume_role_policy").
    const result = analyzeIamDirection(
      { inline_policy: beforePolicy },
      { inline_policy: afterPolicy },
    );
    expect(result).toBe("widening");
  });

  it("(R105-2b) analyzeIamDirection detects narrowing via inline_policy field", () => {
    const beforePolicy = JSON.stringify({
      Statement: [
        { Effect: "Allow", Action: "s3:GetObject", Resource: "*" },
        { Effect: "Allow", Action: "s3:PutObject", Resource: "*" },
      ],
    });
    const afterPolicy = JSON.stringify({
      Statement: [{ Effect: "Allow", Action: "s3:GetObject", Resource: "*" }],
    });
    const result = analyzeIamDirection(
      { inline_policy: beforePolicy },
      { inline_policy: afterPolicy },
    );
    expect(result).toBe("narrowing");
  });

  it("(R105-3) analyzeIamDirection detects widening via egress CIDR block (not ingress)", () => {
    // extractCidrCount falls back to nested ingress/egress when no top-level cidr_blocks.
    // The egress branch was never hit — only ingress was tested in the P2 round.
    const before = { egress: [{ cidr_blocks: ["10.0.0.0/8"] }] };
    const after = {
      egress: [{ cidr_blocks: ["10.0.0.0/8"] }, { cidr_blocks: ["0.0.0.0/0"] }],
    };
    const result = analyzeIamDirection(before, after);
    expect(result).toBe("widening");
  });

  it("(R105-3b) analyzeIamDirection detects narrowing via egress CIDR block", () => {
    const before = {
      egress: [{ cidr_blocks: ["10.0.0.0/8"] }, { cidr_blocks: ["0.0.0.0/0"] }],
    };
    const after = { egress: [{ cidr_blocks: ["10.0.0.0/8"] }] };
    const result = analyzeIamDirection(before, after);
    expect(result).toBe("narrowing");
  });
});

// ─── Round 129: IAM narrowing + pure deletion — untested classify branch ─────────────────────────
// When an IAM resource is purely deleted (actions=["delete"], not replacement), Rule 2 fires
// first (CRITICAL). Rule 5 then runs with severity already CRITICAL and iamDirection="narrowing".
// R129-1: tests the "narrowing + already-CRITICAL (replace)" note path.
// analyzeIamDirection requires both before AND after to return "narrowing";
// a pure deletion (after=null) returns "unknown" → "direction unclear" note.
// Only a replace (actions:["delete","create"] with both before+after present) can
// hit the "policy appears more restrictive, but replacement … makes this CRITICAL" branch.
describe("classifyChange — IAM narrowing + replace (round 129)", () => {
  function makeNarrowingPolicy(): string {
    return JSON.stringify({
      Statement: [
        { Effect: "Allow", Action: "s3:GetObject", Resource: "*" },
        { Effect: "Allow", Action: "s3:PutObject", Resource: "*" },
      ],
    });
  }
  function makeNarrowerPolicy(): string {
    return JSON.stringify({
      Statement: [{ Effect: "Allow", Action: "s3:GetObject", Resource: "*" }],
    });
  }

  it("(R129-1) IAM resource replace with narrowing policy: CRITICAL with 'more restrictive' note", () => {
    // Rule 3 fires (replace → CRITICAL). Rule 5 detects narrowing (afterAllows < beforeAllows).
    // Since severity is already CRITICAL the narrowing branch fires with the "more restrictive" note.
    const c = classifyChange({
      address: "aws_iam_policy.replaced",
      type: "aws_iam_policy",
      name: "replaced",
      actions: ["delete", "create"],
      before: { policy: makeNarrowingPolicy() },
      after: { policy: makeNarrowerPolicy() },
    });
    expect(c.severity).toBe("CRITICAL");
    // Rule 3 reason: REPLACED.
    expect(c.reasons.some((r) => r.includes("REPLACED"))).toBe(true);
    // Rule 5 reason: must mention IAM CRITICAL and "restrictive" (not "WIDENED").
    const iamReason = c.reasons.find((r) => r.includes("IAM change is CRITICAL"));
    expect(iamReason).toBeDefined();
    expect(iamReason).toContain("restrictive");
    expect(iamReason).not.toContain("WIDENED");
  });

  it("(R129-2) IAM narrowing pure update (no deletion/replacement): NORMAL with narrowing note", () => {
    // Rule 5 fires, iamDirection="narrowing", severity is still NORMAL → first branch fires.
    // Adds a NORMAL-advisory reason without upgrading to CRITICAL.
    const c = classifyChange({
      address: "aws_iam_policy.restricted",
      type: "aws_iam_policy",
      name: "restricted",
      actions: ["update"],
      before: { policy: makeNarrowingPolicy() },
      after: { policy: makeNarrowerPolicy() },
    });
    expect(c.severity).toBe("NORMAL");
    // Only the narrowing advisory reason should appear (no DELETED or REPLACED).
    expect(c.reasons.some((r) => r.includes("RESTRICT access"))).toBe(true);
    expect(c.reasons.some((r) => r.includes("DELETED"))).toBe(false);
    expect(c.reasons.some((r) => r.includes("REPLACED"))).toBe(false);
  });
});

// ─── Round 149: analyzeIamDirection untested edge cases ──────────────────────
// Five code paths in classify.ts never previously exercised:
//   1. countWildcards array branch: Action: ["*"] (Array.isArray branch at line 124)
//   2. extractIamStatements JSON parse failure → catch fires → all fields invalid → null
//   3. doc["Statement"] non-array in first field → falls through to next field
//   4. CIDR equal count before/after → afterCidrs === beforeCidrs → "unknown"
//   5. ipv6_cidr_blocks inside egress blocks (nested CIDR loop: egress + ipv6_cidr_blocks)

describe("analyzeIamDirection — Round 149 edge cases", () => {
  it("(R149-1) Action array containing '*' is detected as wildcard via Array.isArray branch", () => {
    // classify.ts line 124: `Array.isArray(action) && action.includes("*")`
    // Before: no wildcards (scalar action). After: Action is ["*"] (array form).
    // Allow counts are equal (1 each) → wildcard comparison fires.
    // afterWild (1) > beforeWild (0) → "widening".
    const before = {
      policy: JSON.stringify({
        Statement: [{ Effect: "Allow", Action: "s3:GetObject", Resource: "*" }],
      }),
    };
    const after = {
      policy: JSON.stringify({
        Statement: [{ Effect: "Allow", Action: ["*"], Resource: "*" }],
      }),
    };
    expect(analyzeIamDirection(before, after)).toBe("widening");
  });

  it("(R149-2) extractIamStatements JSON parse failure → catch fires for all fields → analyzeIamDirection returns unknown", () => {
    // classify.ts lines 161-163: catch { // Try next field. }
    // When the policy string is not valid JSON, the catch fires and the loop
    // continues to the next field. With all three fields invalid (and no CIDR data),
    // extractIamStatements returns null on both sides → CIDR check also null → "unknown".
    const before = { policy: "{not valid json" };
    const after  = { policy: "{also: broken" };
    expect(analyzeIamDirection(before, after)).toBe("unknown");
  });

  it("(R149-3) doc['Statement'] non-array in first field → loop continues → second field with valid array is used", () => {
    // classify.ts lines 159-160: `if (Array.isArray(statements)) return statements;`
    // When "Statement" is present but is a string (not an array), the check fails and
    // the loop advances to the next field. The second field ("assume_role_policy") has
    // a valid Statement array and is used for the analysis.
    // Before: 1 Allow via assume_role_policy; After: 2 Allows → "widening".
    const before = {
      policy: JSON.stringify({ Statement: "see documentation" }),
      assume_role_policy: JSON.stringify({
        Statement: [{ Effect: "Allow", Action: "sts:AssumeRole", Resource: "arn:aws:iam::111:root" }],
      }),
    };
    const after = {
      policy: JSON.stringify({ Statement: "see documentation" }),
      assume_role_policy: JSON.stringify({
        Statement: [
          { Effect: "Allow", Action: "sts:AssumeRole", Resource: "arn:aws:iam::111:root" },
          { Effect: "Allow", Action: "sts:AssumeRole", Resource: "arn:aws:iam::222:root" },
        ],
      }),
    };
    expect(analyzeIamDirection(before, after)).toBe("widening");
  });

  it("(R149-4) CIDR count equal before and after → afterCidrs === beforeCidrs → returns 'unknown'", () => {
    // classify.ts line 139: implicit fall-through when afterCidrs === beforeCidrs.
    // Same number of CIDRs but different values — the count analysis can't determine
    // direction (a swap, not an add or remove). Returns "unknown" → conservative CRITICAL.
    const before = { cidr_blocks: ["10.0.0.0/8", "192.168.0.0/16"] };
    const after  = { cidr_blocks: ["172.16.0.0/12", "10.0.0.0/8"] };
    // extractCidrCount(before)=2, extractCidrCount(after)=2 → equal → "unknown"
    expect(analyzeIamDirection(before, after)).toBe("unknown");
  });

  it("(R149-5) ipv6_cidr_blocks inside egress blocks counted via nested CIDR loop", () => {
    // classify.ts lines 197-201: `for (const cidrField of ["cidr_blocks", "ipv6_cidr_blocks"])`
    // inside the egress branch. The egress + ipv6_cidr_blocks combination was never
    // previously exercised — only egress + cidr_blocks (R105-3) and ingress + ipv6_cidr_blocks
    // (P2 coverage line 412) were tested.
    // Before: egress with 2 IPv6 CIDRs; After: egress with 1 IPv6 CIDR → narrowing.
    const before = { egress: [{ ipv6_cidr_blocks: ["::/0", "2001:db8::/32"] }] };
    const after  = { egress: [{ ipv6_cidr_blocks: ["::/0"] }] };
    expect(analyzeIamDirection(before, after)).toBe("narrowing");
  });
});

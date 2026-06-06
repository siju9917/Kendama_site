import type { TfChange, TfClassification, TfSeverity } from "./types.js";
import { isDataStoreType, isIamOrSecurityType } from "./resources.js";

export function classifyChange(c: TfChange): TfClassification {
  const actions = c.actions;
  const reasons: string[] = [];

  // Rule 1: no-op — resource unchanged, no action needed.
  if (isNoOp(actions)) {
    return { change: c, severity: "NO-OP", reasons: [] };
  }

  let severity: TfSeverity = "NORMAL";

  // Rule 2: any delete action → CRITICAL (data loss risk).
  if (actions.includes("delete") && !hasReplacePattern(actions)) {
    severity = "CRITICAL";
    reasons.push(`${c.address} will be permanently DELETED.`);
  }

  // Rule 3: replace (delete + re-create) → CRITICAL (downtime/data loss risk).
  if (hasReplacePattern(actions)) {
    severity = "CRITICAL";
    const replaceDetail = replaceOrderDetail(actions);
    reasons.push(`${c.address} will be REPLACED (${replaceDetail}) — any state not in Terraform may be lost.`);
  }

  // Rule 4: data store modification or deletion → CRITICAL regardless of action.
  if (isDataStoreType(c.type) && !isCreateOnly(actions)) {
    severity = "CRITICAL";
    reasons.push(
      `${c.address} is a data store (${c.type}) — any modification or deletion risks data loss or service disruption.`,
    );
  }

  // Rule 5 (T1 Phase 2): IAM / security-group change — direction-aware classification.
  // Narrowing changes (removing permissions / restricting access) are NORMAL; widening
  // changes (adding permissions, wildcards, or CIDRs) are CRITICAL. Unknown direction
  // (parsing failed or insufficient data) stays CRITICAL to be conservative.
  if (isIamOrSecurityType(c.type) && !isCreateOnly(actions) && !isNoOp(actions)) {
    const iamDirection = analyzeIamDirection(c.before, c.after);
    if (iamDirection === "narrowing" && severity === "NORMAL") {
      // More-restrictive policy change — only downgrade if no other rule already fired CRITICAL.
      reasons.push(
        `${c.address} is an IAM or security resource (${c.type}) — policy change appears to RESTRICT access (review to confirm).`,
      );
    } else {
      severity = "CRITICAL";
      const directionNote = iamDirection === "widening" ? " (access appears to be WIDENED)" : "";
      reasons.push(
        `${c.address} is an IAM or security resource (${c.type}) — changes may widen access permissions${directionNote}.`,
      );
    }
  }

  // Default: new resource creation is NORMAL.
  if (isCreateOnly(actions)) {
    reasons.push(`${c.address} will be created (new resource, no existing state affected).`);
  } else if (severity === "NORMAL") {
    reasons.push(
      `${c.address}: in-place attribute update (${actions.join(", ")}) — no replacement or deletion.`,
    );
  }

  return { change: c, severity, reasons };
}

/**
 * Analyzes the before/after state of an IAM or security resource to determine
 * whether the change widens or narrows access.
 *
 * Returns "widening" when more Allow statements, more CIDRs, or wildcard actions
 * are being added. Returns "narrowing" when permissions are being removed or
 * restricted. Returns "unknown" when the data is insufficient to determine direction
 * (conservative — caller should treat unknown as CRITICAL).
 */
export function analyzeIamDirection(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): "widening" | "narrowing" | "unknown" {
  if (!before || !after) return "unknown";

  // Try IAM policy document analysis (aws_iam_policy, aws_iam_role_policy, etc.)
  const beforeStatements = extractIamStatements(before);
  const afterStatements = extractIamStatements(after);
  if (beforeStatements !== null && afterStatements !== null) {
    const beforeAllows = beforeStatements.filter(
      (s) => (s as Record<string, unknown>)["Effect"] === "Allow",
    ).length;
    const afterAllows = afterStatements.filter(
      (s) => (s as Record<string, unknown>)["Effect"] === "Allow",
    ).length;
    if (afterAllows > beforeAllows) return "widening";
    if (afterAllows < beforeAllows) return "narrowing";

    // Same statement count — check for wildcard Action additions.
    const countWildcards = (stmts: unknown[]): number =>
      stmts.filter((s) => {
        const stmt = s as Record<string, unknown>;
        if (stmt["Effect"] !== "Allow") return false;
        const action = stmt["Action"];
        return action === "*" || (Array.isArray(action) && action.includes("*"));
      }).length;
    const beforeWild = countWildcards(beforeStatements);
    const afterWild = countWildcards(afterStatements);
    if (afterWild > beforeWild) return "widening";
    if (afterWild < beforeWild) return "narrowing";
    return "unknown";
  }

  // Try security-group CIDR analysis (aws_security_group_rule, aws_security_group, etc.)
  const beforeCidrs = extractCidrCount(before);
  const afterCidrs = extractCidrCount(after);
  if (beforeCidrs !== null && afterCidrs !== null) {
    if (afterCidrs > beforeCidrs) return "widening";
    if (afterCidrs < beforeCidrs) return "narrowing";
    return "unknown";
  }

  return "unknown";
}

/** Parses IAM policy JSON from a resource state object. Returns null on failure. */
function extractIamStatements(state: Record<string, unknown>): unknown[] | null {
  const policyVal = state["policy"];
  if (typeof policyVal !== "string") return null;
  try {
    const doc = JSON.parse(policyVal) as Record<string, unknown>;
    const statements = doc["Statement"];
    return Array.isArray(statements) ? statements : null;
  } catch {
    return null;
  }
}

/** Counts total CIDR entries across all ingress/egress rule arrays. Returns null if not present. */
function extractCidrCount(state: Record<string, unknown>): number | null {
  let total = 0;
  let found = false;
  for (const field of ["cidr_blocks", "ipv6_cidr_blocks", "ingress", "egress"]) {
    const val = state[field];
    if (Array.isArray(val)) {
      // Each element may be a CIDR string or an ingress/egress rule object with cidr_blocks.
      for (const item of val) {
        if (typeof item === "string") {
          total++;
          found = true;
        } else if (item && typeof item === "object") {
          const cidrArr = (item as Record<string, unknown>)["cidr_blocks"];
          if (Array.isArray(cidrArr)) {
            total += cidrArr.length;
            found = true;
          }
        }
      }
    }
  }
  return found ? total : null;
}

/** Returns true iff all actions are 'no-op' (resource will not change). */
export function isNoOp(actions: string[]): boolean {
  return actions.length > 0 && actions.every((a) => a === "no-op");
}

/**
 * Returns true iff this action set represents a replacement.
 * Terraform 0.15+ uses the single action 'replace'.
 * Earlier Terraform used ['delete', 'create'] (or ['create', 'delete'] for
 * create_before_destroy). Both are treated as replacement.
 */
export function hasReplacePattern(actions: string[]): boolean {
  if (actions.includes("replace")) return true;
  return actions.includes("delete") && actions.includes("create");
}

/** Returns true iff the only action is 'create' (pure new resource). */
export function isCreateOnly(actions: string[]): boolean {
  return actions.length === 1 && actions[0] === "create";
}

/**
 * Returns a human-readable description of the replace strategy.
 * - Terraform 0.15+ uses the single action "replace".
 * - Earlier Terraform uses ["delete","create"] (destroy-before-create) or
 *   ["create","delete"] (create-before-destroy / lifecycle.create_before_destroy=true).
 */
export function replaceOrderDetail(actions: string[]): string {
  if (actions.includes("replace")) return "deleted and re-created";
  if (actions[0] === "create") return "create_before_destroy: new resource created first, then old one deleted — lower downtime risk";
  return "destroy_before_create: old resource deleted first, then re-created — downtime window between deletion and creation";
}

/** Classify all changes in a plan. */
export function classifyAll(changes: TfChange[]): TfClassification[] {
  return changes.map(classifyChange);
}

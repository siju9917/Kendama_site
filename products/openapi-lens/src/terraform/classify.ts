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

  // Rule 5: IAM / security-group change → CRITICAL (access-control risk).
  // Phase 1: conservative — flag ALL changes; Phase 2 adds before/after policy diff.
  if (isIamOrSecurityType(c.type) && !isCreateOnly(actions) && !isNoOp(actions)) {
    severity = "CRITICAL";
    reasons.push(
      `${c.address} is an IAM or security resource (${c.type}) — changes may widen access permissions.`,
    );
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

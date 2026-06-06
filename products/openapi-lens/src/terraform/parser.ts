import type { TfChange, TfPlanSummary } from "./types.js";
import { classifyAll } from "./classify.js";

/**
 * Parses a `terraform show -json` output and returns a classified plan summary.
 * @throws {Error} if the input is not valid JSON or missing required fields.
 */
export function parseTerraformPlan(json: string): TfPlanSummary {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("Invalid terraform plan: JSON parse failed");
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid terraform plan: expected a JSON object");
  }

  const plan = raw as Record<string, unknown>;

  if (!Array.isArray(plan["resource_changes"])) {
    throw new Error("Invalid terraform plan: missing or invalid resource_changes array");
  }

  const changes: TfChange[] = (plan["resource_changes"] as unknown[])
    .filter(isResourceChange)
    .map((r) => {
      const rec = r as {
        address: string;
        type: string;
        name: string;
        change: {
          actions: string[];
          before: Record<string, unknown> | null;
          after: Record<string, unknown> | null;
        };
      };
      return {
        address: rec.address,
        type: rec.type,
        name: rec.name,
        actions: rec.change.actions,
        before: rec.change.before,
        after: rec.change.after,
      };
    });

  const classified = classifyAll(changes);
  const critical = classified.filter((c) => c.severity === "CRITICAL").length;
  const normal = classified.filter((c) => c.severity === "NORMAL").length;
  const noOp = classified.filter((c) => c.severity === "NO-OP").length;

  return {
    changes: classified,
    critical,
    normal,
    noOp,
    terraformVersion: typeof plan["terraform_version"] === "string"
      ? plan["terraform_version"]
      : "unknown",
  };
}

function isResourceChange(x: unknown): x is {
  address: string;
  type: string;
  name: string;
  change: { actions: string[]; before: unknown; after: unknown };
} {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const r = x as Record<string, unknown>;
  // Data sources (mode: "data") have "read" actions — they are not infrastructure
  // changes and must be excluded from classification.
  if (r["mode"] === "data") return false;
  if (typeof r["address"] !== "string") return false;
  if (typeof r["type"] !== "string") return false;
  if (typeof r["name"] !== "string") return false;
  const ch = r["change"];
  if (!ch || typeof ch !== "object" || Array.isArray(ch)) return false;
  if (!Array.isArray((ch as Record<string, unknown>)["actions"])) return false;
  return true;
}

/**
 * Returns true if the given string looks like the top of a terraform show -json output.
 * Used by the VS Code extension to detect if a JSON file is a terraform plan.
 */
export function isTerraformPlanJson(text: string): boolean {
  const sample = text.slice(0, 2000);
  return sample.includes('"resource_changes"') &&
    (sample.includes('"format_version"') || sample.includes('"terraform_version"'));
}

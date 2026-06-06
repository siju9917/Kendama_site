export type { BreakingChange, HttpMethod, OapiOperation, OapiParameter, OapiRawChange, OapiSchema, OapiSpec, OapiChangeType, Severity } from "./types.js";
export { parseOapiSpec } from "./parser.js";
export { diffSpecs } from "./diff.js";
export { classifyChanges } from "./classify.js";

import { parseOapiSpec } from "./parser.js";
import { diffSpecs } from "./diff.js";
import { classifyChanges } from "./classify.js";
import type { BreakingChange } from "./types.js";

/**
 * High-level API: parse two OpenAPI spec strings and return all classified changes.
 *
 * @param baselineInput - YAML or JSON string of the old spec
 * @param currentInput  - YAML or JSON string of the new spec
 * @returns Classified list of all changes (BREAKING, INFO, SAFE)
 */
export function analyzeOpenApiDiff(baselineInput: string, currentInput: string): BreakingChange[] {
  const baseline = parseOapiSpec(baselineInput);
  const current = parseOapiSpec(currentInput);
  const rawChanges = diffSpecs(baseline, current);
  return classifyChanges(rawChanges);
}

/** Filter the result of analyzeOpenApiDiff to BREAKING-only changes. */
export function breakingOnly(changes: BreakingChange[]): BreakingChange[] {
  return changes.filter((c) => c.severity === "BREAKING");
}

/**
 * Token-level diff for MODIFY changes (Phase 3.4).
 *
 * Produces `TokenSpan[]` so the UI can render word-precise edits.
 * Adjacent same-op spans are merged.
 */
import { diffSequence } from "./myers.js";
import type { TokenSpan } from "./types.js";

export function tokenDiff(
  beforeTokens: ReadonlyArray<string>,
  afterTokens: ReadonlyArray<string>,
): TokenSpan[] {
  // diffSequence treats a=before, b=after. The mapping to TokenSpan is:
  //   equal -> equal, delete -> delete (gone from after), insert -> insert.
  const ops = diffSequence(beforeTokens, afterTokens, (a, b) => a === b);
  const spans: TokenSpan[] = [];
  for (const o of ops) {
    let opName: TokenSpan["op"];
    if (o.op === "equal") opName = "equal";
    else if (o.op === "delete") opName = "delete";
    else opName = "insert";
    const last = spans[spans.length - 1];
    if (last && last.op === opName) {
      last.text = last.text + " " + o.value;
    } else {
      spans.push({ op: opName, text: o.value });
    }
  }
  return spans;
}

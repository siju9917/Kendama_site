/**
 * Local clause client — looks up clauses from the bundled dataset.
 * The server-augmented client subclasses this for online lookups (Phase 5.2).
 */
import type { IClauseClient } from "../interfaces.js";
import type { ClauseInfo } from "../diff/types.js";
import { CLAUSE_INDEX } from "./data/clauses.js";

export class LocalClauseClient implements IClauseClient {
  async lookup(clauseNumbers: ReadonlyArray<string>): Promise<Map<string, ClauseInfo>> {
    const out = new Map<string, ClauseInfo>();
    for (const num of clauseNumbers) {
      out.set(num, this.lookupSync(num) ?? this.unknownStub(num));
    }
    return out;
  }

  /**
   * Synchronous lookup against the bundled dataset. Returns null when the
   * clause number is not present locally — callers may augment via the
   * server endpoint after.
   */
  lookupSync(num: string): ClauseInfo | null {
    return CLAUSE_INDEX.get(num) ?? null;
  }

  private unknownStub(num: string): ClauseInfo {
    return {
      clauseNumber: num,
      title: "(Clause title not in local dataset)",
      plainLanguageNote: "",
      regulation: num.startsWith("252.") ? "DFARS" : num.startsWith("52.") ? "FAR" : "OTHER",
    };
  }
}

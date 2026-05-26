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
      const info = CLAUSE_INDEX.get(num);
      if (info) {
        out.set(num, info);
      } else {
        // Unknown clause: still surface what we have so the UI shows the number.
        out.set(num, {
          clauseNumber: num,
          title: "(Clause title not in local dataset)",
          plainLanguageNote: "",
          regulation: num.startsWith("252.") ? "DFARS" : num.startsWith("52.") ? "FAR" : "OTHER",
        });
      }
    }
    return out;
  }
}

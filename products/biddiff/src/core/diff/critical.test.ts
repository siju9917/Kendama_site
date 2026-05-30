/**
 * Direct unit tests for the critical-change ruleset (the product's core
 * value-prop logic). Documents each rule's behavior and guards the
 * data-driven refactor (CRITICAL_RULES). The corpus tests cover end-to-end
 * recall; these pin the rule semantics precisely.
 */
import { describe, it, expect } from "vitest";
import { evaluateCriticality, CRITICAL_RULES, type CriticalInput } from "./critical.js";
import type { Anchor } from "../model/types.js";

function anchor(type: Anchor["type"]): Anchor {
  return { type, raw: "x", normalized: "x", charStart: 0, charEnd: 1 };
}
const input = (p: Partial<CriticalInput>): CriticalInput => ({
  changeType: "MODIFY",
  category: "OTHER",
  anchors: [],
  ...p,
});

describe("evaluateCriticality", () => {
  it("a date change is critical (by category or DATE anchor)", () => {
    expect(evaluateCriticality(input({ category: "DATES_DEADLINES" })).severity).toBe("CRITICAL");
    expect(evaluateCriticality(input({ anchors: [anchor("DATE")] })).reasons).toContain(
      "A date or deadline changed.",
    );
  });

  it("submission instructions: page-limit vs generic reason", () => {
    expect(
      evaluateCriticality(input({ category: "SUBMISSION_INSTRUCTIONS", anchors: [anchor("PAGE_LIMIT")] })).reasons,
    ).toContain("A page limit changed.");
    expect(evaluateCriticality(input({ category: "SUBMISSION_INSTRUCTIONS" })).reasons).toContain(
      "Submission instructions changed.",
    );
  });

  it("clause add/remove/modify each get the right reason", () => {
    expect(evaluateCriticality(input({ category: "CLAUSES", changeType: "INSERT" })).reasons).toContain(
      "A FAR/DFARS clause was added.",
    );
    expect(evaluateCriticality(input({ category: "CLAUSES", changeType: "DELETE" })).reasons).toContain(
      "A FAR/DFARS clause was removed.",
    );
    expect(evaluateCriticality(input({ category: "CLAUSES", changeType: "MODIFY" })).reasons).toContain(
      "A FAR/DFARS clause changed.",
    );
    // A clause that only MOVED is not critical under rule 3.
    expect(evaluateCriticality(input({ category: "CLAUSES", changeType: "MOVE" })).severity).toBe("NORMAL");
  });

  it("evaluation criteria and CLIN structure are critical", () => {
    expect(evaluateCriticality(input({ category: "EVALUATION_CRITERIA" })).severity).toBe("CRITICAL");
    expect(evaluateCriticality(input({ category: "PRICING_CLINS", changeType: "INSERT" })).reasons).toContain(
      "Contract-line-item (CLIN) structure changed.",
    );
  });

  it("attachments are critical on add/remove but not modify/move", () => {
    expect(evaluateCriticality(input({ category: "ATTACHMENTS", changeType: "INSERT" })).reasons).toContain(
      "An attachment was added.",
    );
    expect(evaluateCriticality(input({ category: "ATTACHMENTS", changeType: "DELETE" })).reasons).toContain(
      "An attachment was removed.",
    );
    expect(evaluateCriticality(input({ category: "ATTACHMENTS", changeType: "MODIFY" })).severity).toBe("NORMAL");
  });

  it("an OTHER-category change with no anchors is NORMAL", () => {
    const r = evaluateCriticality(input({}));
    expect(r.severity).toBe("NORMAL");
    expect(r.reasons).toEqual([]);
  });

  it("multiple rules can fire and stack reasons in rule order", () => {
    // A date anchor in a clause-category INSERT → both rule 1 and rule 3.
    const r = evaluateCriticality(input({ category: "CLAUSES", changeType: "INSERT", anchors: [anchor("DATE")] }));
    expect(r.reasons).toEqual(["A date or deadline changed.", "A FAR/DFARS clause was added."]);
  });

  it("the ruleset is data (extensible)", () => {
    expect(CRITICAL_RULES.length).toBe(6);
  });
});

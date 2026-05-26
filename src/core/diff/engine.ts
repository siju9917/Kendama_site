/**
 * DiffEngine — pure deterministic IDiffEngine implementation.
 *
 * Composes alignment, classification, criticality, move detection,
 * suppression. No Date.now(), no Math.random(), no unordered iteration.
 * IDs are content hashes.
 *
 * `generatedAt` is the only non-deterministic field — and the caller is
 * responsible for setting it. The engine produces `generatedAt = ""` and the
 * caller overrides.
 */
import type { Block, Section, StructuredDocument } from "../model/types.js";
import type {
  Change,
  ChangeCategory,
  ChangeType,
  ClauseInfo,
  DiffResult,
} from "./types.js";
import { emptyCategoryCounts } from "./types.js";
import type { IClauseClient, IDiffEngine } from "../interfaces.js";
import { contentHash } from "../../shared/hash.js";
import { alignSections, type SectionPair } from "./align/sections.js";
import { alignBlocks, type BlockAlignmentItem } from "./align/blocks.js";
import {
  detectMoves,
  type PendingDelete,
  type PendingInsert,
} from "./align/moves.js";
import { tokenDiff } from "./tokens.js";
import { classifyChange } from "./classify.js";
import { evaluateCriticality } from "./critical.js";
import { isReformattingOnly } from "./suppress.js";

interface PendingChange {
  changeType: ChangeType;
  /** The section where the change is located (the current-side if available). */
  section: Section | null;
  before: Block | null;
  after: Block | null;
}

export class DiffEngine implements IDiffEngine {
  constructor(private readonly clauseClient: IClauseClient | null = null) {}

  diff(current: StructuredDocument, prior: StructuredDocument): DiffResult {
    const sectionPairs = alignSections(current.sections, prior.sections);

    // ---- Phase 1: gather per-section block-level alignment items ----
    interface PairItem {
      sectionPair: SectionPair;
      items: BlockAlignmentItem[];
    }
    const pairItems: PairItem[] = [];
    for (const sp of sectionPairs) {
      const cBlocks = sp.current?.blocks ?? [];
      const pBlocks = sp.prior?.blocks ?? [];
      const items = alignBlocks(cBlocks, pBlocks);
      pairItems.push({ sectionPair: sp, items });
    }

    // ---- Phase 2: gather all INSERT and DELETE blocks for move detection ----
    const pendingInserts: PendingInsert[] = [];
    const pendingDeletes: PendingDelete[] = [];
    pairItems.forEach((pi, sectionIndex) => {
      for (const item of pi.items) {
        if (item.kind === "INSERT") pendingInserts.push({ block: item.current, sectionIndex });
        else if (item.kind === "DELETE") pendingDeletes.push({ block: item.prior, sectionIndex });
      }
    });
    const { moves, remainingInserts, remainingDeletes } = detectMoves(
      pendingInserts,
      pendingDeletes,
    );

    // ---- Phase 3: synthesize PendingChange records ----
    const pending: PendingChange[] = [];

    // EQUAL items → no change. MODIFY items → MODIFY. Remaining INSERTs/DELETEs
    // (after move detection) get added per-section. MOVE items are added separately.
    const remInsertSet = new Set(remainingInserts.map((r) => r.block.id));
    const remDeleteSet = new Set(remainingDeletes.map((r) => r.block.id));

    pairItems.forEach((pi) => {
      const section = pi.sectionPair.current ?? pi.sectionPair.prior;
      for (const item of pi.items) {
        if (item.kind === "EQUAL") continue;
        if (item.kind === "MODIFY") {
          if (isReformattingOnly(item.prior, item.current)) continue;
          pending.push({
            changeType: "MODIFY",
            section,
            before: item.prior,
            after: item.current,
          });
        } else if (item.kind === "INSERT") {
          if (!remInsertSet.has(item.current.id)) continue; // claimed by a move
          pending.push({
            changeType: "INSERT",
            section,
            before: null,
            after: item.current,
          });
        } else if (item.kind === "DELETE") {
          if (!remDeleteSet.has(item.prior.id)) continue; // claimed by a move
          pending.push({
            changeType: "DELETE",
            section,
            before: item.prior,
            after: null,
          });
        }
      }
    });
    // MOVEs from the detector.
    for (const mv of moves) {
      pending.push({
        changeType: "MOVE",
        section: pairItems[mv.insertSectionIndex].sectionPair.current ?? pairItems[mv.insertSectionIndex].sectionPair.prior,
        before: mv.prior,
        after: mv.current,
      });
    }

    // ---- Phase 4: build Change records ----
    const changes: Change[] = pending.map((p) => this.buildChange(p));

    // Deterministic stable order: by section ordinal, then current ordinal, then change type.
    changes.sort((a, b) => {
      const aLoc = locationSortKey(a);
      const bLoc = locationSortKey(b);
      if (aLoc !== bLoc) return aLoc < bLoc ? -1 : 1;
      return a.changeType.localeCompare(b.changeType);
    });

    // ---- Phase 5: clause-info enrichment (synchronous fallback to local) ----
    // Clause client lookup is async; the engine itself is synchronous. We
    // enrich with whatever local data is available via the constructor.
    // The async path (server augmentation) is layered by the caller.

    // ---- Phase 6: assemble totals ----
    const criticalCount = changes.filter((c) => c.severity === "CRITICAL").length;
    const changeCountByCategory = emptyCategoryCounts();
    for (const c of changes) changeCountByCategory[c.category]++;

    // Confidence: the lower of the two doc confidences, reduced if section
    // alignment had low-scored pairs.
    const baseConf = Math.min(
      current.metadata.overallExtractionConfidence,
      prior.metadata.overallExtractionConfidence,
    );
    const lowScoredPairs = sectionPairs.filter(
      (sp) => sp.current && sp.prior && sp.score < 0.7,
    ).length;
    const confPenalty = Math.min(0.3, lowScoredPairs * 0.05);
    const diffConfidence = Math.max(0, baseConf - confPenalty);

    const warnings: string[] = [];
    if (diffConfidence < 0.7) {
      // Note: deliberately not advisory. The disclaimer (rendered once at
      // the panel root and in every export) is the single canonical
      // place that says the human must review.
      warnings.push(
        `Extraction confidence is ${(diffConfidence * 100).toFixed(0)}% — lower than typical for clean text PDFs.`,
      );
    }

    const id = contentHash(
      `diff:${current.metadata.sourceFileHash}:${prior.metadata.sourceFileHash}:${changes.length}`,
    );

    return {
      id,
      generatedAt: "", // caller sets
      currentDoc: current.metadata,
      priorDoc: prior.metadata,
      changes,
      criticalCount,
      changeCountByCategory,
      diffConfidence,
      warnings,
    };
  }

  private buildChange(p: PendingChange): Change {
    const beforeBlock = p.before;
    const afterBlock = p.after;
    const beforeText = beforeBlock?.text ?? null;
    const afterText = afterBlock?.text ?? null;

    // Combine anchors from both sides; deduplicate by (type, normalized).
    const anchorsFromBoth = [
      ...(beforeBlock?.anchors ?? []),
      ...(afterBlock?.anchors ?? []),
    ];
    const seen = new Set<string>();
    const anchorsInvolved = anchorsFromBoth.filter((a) => {
      const k = `${a.type}|${a.normalized}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const category: ChangeCategory = classifyChange({
      section: p.section,
      anchors: anchorsInvolved,
    });

    const { severity, reasons } = evaluateCriticality({
      changeType: p.changeType,
      category,
      anchors: anchorsInvolved,
    });

    const tokenSpans =
      p.changeType === "MODIFY" && beforeBlock && afterBlock
        ? tokenDiff(beforeBlock.tokens, afterBlock.tokens)
        : null;

    // Clause info: look in the local dataset if the engine was constructed
    // with a clause client. The interface guarantees lookupSync exists; a
    // client without a local cache returns null.
    let clauseInfo: ClauseInfo | null = null;
    if (this.clauseClient && anchorsInvolved.some((a) => a.type === "CLAUSE_REF")) {
      const num = anchorsInvolved.find((a) => a.type === "CLAUSE_REF")!.normalized;
      clauseInfo = this.clauseClient.lookupSync(num);
    }

    const sectionHeading = p.section?.heading ?? "(Unattached)";
    const ucfLetter = p.section?.ucfLetter ?? null;
    const ordinal = afterBlock?.ordinal ?? beforeBlock?.ordinal ?? 0;
    const locationHint = p.section
      ? `${p.section.heading} — block ${ordinal + 1}`
      : "Document";

    const idSeed = [
      p.changeType,
      category,
      sectionHeading,
      String(ordinal),
      beforeBlock?.id ?? "-",
      afterBlock?.id ?? "-",
    ].join("|");

    return {
      id: contentHash(idSeed),
      changeType: p.changeType,
      category,
      severity,
      sectionHeading,
      ucfLetter,
      beforeText,
      afterText,
      tokenSpans,
      anchorsInvolved,
      criticalReasons: reasons,
      clauseInfo,
      locationHint,
    };
  }
}

function locationSortKey(c: Change): string {
  // Stable sort key: UCF letter (or zzz fallback) + heading + change type.
  const letter = c.ucfLetter ?? "zzz";
  return `${letter}|${c.sectionHeading}|${c.changeType}`;
}

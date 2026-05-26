/**
 * Corpus generator. Run via:
 *   npx tsx test/corpus/generate.ts
 *
 * Produces:
 *   test/corpus/synthetic/<pair-id>/{prior,current,meta}.json
 *   test/corpus/labels/<pair-id>.json
 *   test/corpus/manifest.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTemplateDocument, type TemplateOptions } from "./templates.js";
import {
  addAttachment,
  addClause,
  addClin,
  changeClinQty,
  changePageLimit,
  changePeriodOfPerformance,
  changeProposalDueDate,
  insertSowParagraph,
  modifySowParagraph,
  removeAttachment,
  removeClause,
  replaceEvaluationFactor,
} from "./edits.js";
import type { CorpusManifest, CorpusManifestEntry, ExpectedChange, PairLabel } from "./schema.js";
import type { StructuredDocument } from "../../src/core/model/types.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_SYNTHETIC = path.join(HERE, "synthetic");
const OUT_LABELS = path.join(HERE, "labels");
const OUT_MANIFEST = path.join(HERE, "manifest.json");

interface PairPlan {
  pairId: string;
  description: string;
  tags: ReadonlyArray<string>;
  base: TemplateOptions;
  edits: ReadonlyArray<(doc: StructuredDocument) => { doc: StructuredDocument; labels: ExpectedChange[] }>;
}

// ---- Template options factories ----

const baseServicesITTemplate: TemplateOptions = {
  id: "tpl-services-it",
  agencyName: "General Services Administration",
  solicitationId: "47QFCA24R0001",
  isDefense: false,
  proposalDueDate: "2026-08-15",
  pageLimit: 30,
  evaluationFactors: ["Technical Approach", "Past Performance", "Management Plan", "Price"],
  clins: [
    { number: "0001", description: "Year 1 Help Desk Services", qty: 12, unit: "Months" },
    { number: "0002", description: "Year 1 Optional Tier 3 Support", qty: 12, unit: "Months" },
    { number: "0003", description: "Year 1 Transition-In", qty: 1, unit: "LOT" },
  ],
  clauses: [
    "52.212-1",
    "52.212-2",
    "52.212-3",
    "52.212-4",
    "52.212-5",
    "52.204-21",
    "52.219-14",
    "52.222-41",
    "52.247-34",
  ],
  attachments: [
    { id: "1", title: "Performance Work Statement" },
    { id: "2", title: "Wage Determination" },
    { id: "3", title: "Past Performance Questionnaire" },
  ],
  sowParagraphs: [
    "The Contractor shall provide enterprise help-desk services supporting up to 5,000 federal users across two campuses.",
    "Services include Tier 1, Tier 2, and on-call Tier 3 support, available 24x7x365, with first-call resolution targets defined in the PWS.",
    "The Contractor shall maintain ITIL-aligned incident, problem, and change management processes.",
    "All personnel performing on this contract shall meet the security clearance requirements set forth in Attachment 1.",
    "Performance metrics include mean time to acknowledge (MTTA) and mean time to resolve (MTTR), reported monthly.",
  ],
};

const baseSuppliesNavyTemplate: TemplateOptions = {
  id: "tpl-supplies-navy",
  agencyName: "Department of the Navy",
  solicitationId: "N00024-26-R-2200",
  isDefense: true,
  proposalDueDate: "2026-09-30",
  pageLimit: 50,
  evaluationFactors: ["Technical Capability", "Past Performance", "Small Business Participation", "Price"],
  clins: [
    { number: "0001", description: "Spare Parts Kit, Type A", qty: 250, unit: "EA" },
    { number: "0002", description: "Spare Parts Kit, Type B", qty: 120, unit: "EA" },
  ],
  clauses: [
    "52.212-1",
    "52.212-3",
    "52.212-4",
    "52.212-5",
    "52.204-21",
    "52.204-25",
    "252.204-7012",
    "252.225-7001",
    "252.225-7048",
  ],
  attachments: [
    { id: "A", title: "Technical Data Package" },
    { id: "B", title: "Quality Assurance Surveillance Plan" },
  ],
  sowParagraphs: [
    "The Contractor shall manufacture and deliver spare parts kits in accordance with the Technical Data Package (Attachment A).",
    "All deliverables shall be inspected and accepted at origin by the Defense Contract Management Agency.",
    "First Article Test units shall be delivered within 90 days of award; production deliveries begin upon FAT approval.",
  ],
};

const baseResearchTemplate: TemplateOptions = {
  id: "tpl-research",
  agencyName: "National Aeronautics and Space Administration",
  solicitationId: "80HQTR26R0010",
  isDefense: false,
  proposalDueDate: "2026-10-20",
  pageLimit: 75,
  evaluationFactors: ["Scientific/Technical Merit", "Cost Realism", "Past Performance", "Management"],
  clins: [
    { number: "0001", description: "Base Period Research Effort", qty: 12, unit: "Months" },
    { number: "0002", description: "Option Period 1", qty: 12, unit: "Months" },
  ],
  clauses: ["52.212-1", "52.212-3", "52.212-4", "52.212-5", "52.204-21", "52.219-9", "52.222-50"],
  attachments: [
    { id: "1", title: "Statement of Work" },
    { id: "2", title: "Reporting Requirements" },
  ],
  sowParagraphs: [
    "The Contractor shall conduct applied research in autonomous flight control systems for unmanned aerial platforms.",
    "Monthly status reports and quarterly technical reports are required deliverables.",
    "All published research products shall acknowledge the Government's funding role.",
  ],
};

// ---- Pair plans: 12 templates × multiple edit configurations = 40+ pairs ----

const PAIRS: PairPlan[] = [
  // ---- IT Services template variants ----
  {
    pairId: "it-svc-001-due-date-shift",
    description: "Proposal due date pushed back 14 days.",
    tags: ["dates", "single-edit", "critical"],
    base: baseServicesITTemplate,
    edits: [(d) => changeProposalDueDate(d, "2026-08-29")],
  },
  {
    pairId: "it-svc-002-page-limit",
    description: "Page limit reduced from 30 to 25.",
    tags: ["instructions", "single-edit", "critical"],
    base: baseServicesITTemplate,
    edits: [(d) => changePageLimit(d, 25)],
  },
  {
    pairId: "it-svc-003-clause-add",
    description: "FAR 52.204-25 added to clause inventory.",
    tags: ["clauses", "single-edit", "critical"],
    base: baseServicesITTemplate,
    edits: [(d) => addClause(d, "52.204-25")],
  },
  {
    pairId: "it-svc-004-clause-remove",
    description: "FAR 52.222-41 removed (re-categorized as supplies).",
    tags: ["clauses", "single-edit", "critical"],
    base: baseServicesITTemplate,
    edits: [(d) => removeClause(d, "52.222-41")],
  },
  {
    pairId: "it-svc-005-eval-factor-replace",
    description: "Section M Factor 1 replaced with stronger technical language.",
    tags: ["evaluation", "single-edit", "critical"],
    base: baseServicesITTemplate,
    edits: [
      (d) => replaceEvaluationFactor(d, 0, "Technical Approach including security architecture maturity"),
    ],
  },
  {
    pairId: "it-svc-006-attachment-add",
    description: "Attachment 4 (Cybersecurity Self-Assessment) added.",
    tags: ["attachments", "single-edit", "critical"],
    base: baseServicesITTemplate,
    edits: [(d) => addAttachment(d, "4", "Cybersecurity Self-Assessment")],
  },
  {
    pairId: "it-svc-007-clin-qty-change",
    description: "CLIN 0002 quantity reduced from 12 to 6 months.",
    tags: ["pricing", "single-edit", "critical"],
    base: baseServicesITTemplate,
    edits: [(d) => changeClinQty(d, "0002", 6)],
  },
  {
    pairId: "it-svc-008-clin-add",
    description: "New CLIN 0004 added for surge capacity.",
    tags: ["pricing", "single-edit", "critical"],
    base: baseServicesITTemplate,
    edits: [(d) => addClin(d, { number: "0004", description: "Surge Capacity Hours", qty: 200, unit: "HR" })],
  },
  {
    pairId: "it-svc-009-sow-modify",
    description: "SOW paragraph 1 user-count revised down to 4,000.",
    tags: ["sow", "single-edit", "normal"],
    base: baseServicesITTemplate,
    edits: [
      (d) =>
        modifySowParagraph(
          d,
          0,
          "The Contractor shall provide enterprise help-desk services supporting up to 4,000 federal users across two campuses.",
        ),
    ],
  },
  {
    pairId: "it-svc-010-sow-insert",
    description: "New SOW paragraph inserted on cloud-migration responsibilities.",
    tags: ["sow", "single-edit", "normal"],
    base: baseServicesITTemplate,
    edits: [
      (d) =>
        insertSowParagraph(
          d,
          "The Contractor shall support migration of legacy ticketing systems to the Government-furnished cloud platform during the base period.",
        ),
    ],
  },
  {
    pairId: "it-svc-011-multi-critical",
    description: "Multi-edit amendment: due-date shift + new clause + page-limit change.",
    tags: ["multi-edit", "critical"],
    base: baseServicesITTemplate,
    edits: [
      (d) => changeProposalDueDate(d, "2026-09-05"),
      (d) => addClause(d, "52.204-27"),
      (d) => changePageLimit(d, 35),
    ],
  },
  {
    pairId: "it-svc-012-pop-change",
    description: "Period of performance extended to 24 months.",
    tags: ["dates", "single-edit", "critical"],
    base: baseServicesITTemplate,
    edits: [(d) => changePeriodOfPerformance(d, 24)],
  },

  // ---- Navy supplies template variants ----
  {
    pairId: "navy-001-due-date",
    description: "Navy proposal due date moved to October.",
    tags: ["dates", "single-edit", "critical"],
    base: baseSuppliesNavyTemplate,
    edits: [(d) => changeProposalDueDate(d, "2026-10-15")],
  },
  {
    pairId: "navy-002-dfars-add",
    description: "DFARS 252.204-7019 added to clauses.",
    tags: ["clauses", "single-edit", "critical"],
    base: baseSuppliesNavyTemplate,
    edits: [(d) => addClause(d, "252.204-7019")],
  },
  {
    pairId: "navy-003-dfars-cmmc-add",
    description: "DFARS 252.204-7021 (CMMC) added.",
    tags: ["clauses", "single-edit", "critical"],
    base: baseSuppliesNavyTemplate,
    edits: [(d) => addClause(d, "252.204-7021")],
  },
  {
    pairId: "navy-004-clin-add",
    description: "New CLIN added for technical manuals.",
    tags: ["pricing", "single-edit", "critical"],
    base: baseSuppliesNavyTemplate,
    edits: [(d) => addClin(d, { number: "0003", description: "Technical Manuals", qty: 50, unit: "EA" })],
  },
  {
    pairId: "navy-005-clin-qty",
    description: "CLIN 0001 quantity increased to 350.",
    tags: ["pricing", "single-edit", "critical"],
    base: baseSuppliesNavyTemplate,
    edits: [(d) => changeClinQty(d, "0001", 350)],
  },
  {
    pairId: "navy-006-page-limit",
    description: "Page limit raised to 60.",
    tags: ["instructions", "single-edit", "critical"],
    base: baseSuppliesNavyTemplate,
    edits: [(d) => changePageLimit(d, 60)],
  },
  {
    pairId: "navy-007-eval-replace",
    description: "Evaluation Factor 2 (Past Performance) language tightened.",
    tags: ["evaluation", "single-edit", "critical"],
    base: baseSuppliesNavyTemplate,
    edits: [
      (d) =>
        replaceEvaluationFactor(d, 1, "Past Performance with same or similar Navy supply contracts in the last 5 years"),
    ],
  },
  {
    pairId: "navy-008-attachment-remove",
    description: "Attachment B removed (QASP folded into PWS).",
    tags: ["attachments", "single-edit", "critical"],
    base: baseSuppliesNavyTemplate,
    edits: [(d) => removeAttachment(d, "B")],
  },
  {
    pairId: "navy-009-sow-modify",
    description: "Navy SOW paragraph on FAT timeline modified to 60 days.",
    tags: ["sow", "single-edit", "normal"],
    base: baseSuppliesNavyTemplate,
    edits: [
      (d) =>
        modifySowParagraph(
          d,
          2,
          "First Article Test units shall be delivered within 60 days of award; production deliveries begin upon FAT approval.",
        ),
    ],
  },
  {
    pairId: "navy-010-multi-critical",
    description: "Multi-edit: due-date, CMMC clause add, attachment add.",
    tags: ["multi-edit", "critical"],
    base: baseSuppliesNavyTemplate,
    edits: [
      (d) => changeProposalDueDate(d, "2026-10-22"),
      (d) => addClause(d, "252.204-7021"),
      (d) => addAttachment(d, "C", "Cybersecurity Compliance Plan"),
    ],
  },
  {
    pairId: "navy-011-three-clause-changes",
    description: "Two clauses added, one removed in a single amendment.",
    tags: ["clauses", "multi-edit", "critical"],
    base: baseSuppliesNavyTemplate,
    edits: [
      (d) => addClause(d, "252.204-7020"),
      (d) => addClause(d, "252.204-7021"),
      (d) => removeClause(d, "252.225-7048"),
    ],
  },
  {
    pairId: "navy-012-pop-extension",
    description: "Period of performance extended to 18 months.",
    tags: ["dates", "single-edit", "critical"],
    base: baseSuppliesNavyTemplate,
    edits: [(d) => changePeriodOfPerformance(d, 18)],
  },

  // ---- NASA research template variants ----
  {
    pairId: "nasa-001-due-date",
    description: "NASA proposal due date moved forward by one week.",
    tags: ["dates", "single-edit", "critical"],
    base: baseResearchTemplate,
    edits: [(d) => changeProposalDueDate(d, "2026-10-13")],
  },
  {
    pairId: "nasa-002-page-limit",
    description: "Page limit increased to 90.",
    tags: ["instructions", "single-edit", "critical"],
    base: baseResearchTemplate,
    edits: [(d) => changePageLimit(d, 90)],
  },
  {
    pairId: "nasa-003-eval-add-factor",
    description: "New evaluation Factor 4 (Cost) replaces older Management factor.",
    tags: ["evaluation", "single-edit", "critical"],
    base: baseResearchTemplate,
    edits: [(d) => replaceEvaluationFactor(d, 3, "Cost / Price")],
  },
  {
    pairId: "nasa-004-clause-add-wage",
    description: "FAR 52.222-55 added (minimum wage clause).",
    tags: ["clauses", "single-edit", "critical"],
    base: baseResearchTemplate,
    edits: [(d) => addClause(d, "52.222-55")],
  },
  {
    pairId: "nasa-005-sow-major-revise",
    description: "Significant SOW revision: scope language tightened.",
    tags: ["sow", "single-edit", "normal"],
    base: baseResearchTemplate,
    edits: [
      (d) =>
        modifySowParagraph(
          d,
          0,
          "The Contractor shall conduct applied research in fully autonomous flight control systems for High Altitude Long Endurance unmanned aerial platforms.",
        ),
    ],
  },
  {
    pairId: "nasa-006-attachment-add",
    description: "Attachment 3 (Data Rights Assertion Table) added.",
    tags: ["attachments", "single-edit", "critical"],
    base: baseResearchTemplate,
    edits: [(d) => addAttachment(d, "3", "Data Rights Assertion Table")],
  },
  {
    pairId: "nasa-007-clin-qty-change",
    description: "CLIN 0001 base-period duration changed to 18 months.",
    tags: ["pricing", "single-edit", "critical"],
    base: baseResearchTemplate,
    edits: [(d) => changeClinQty(d, "0001", 18)],
  },
  {
    pairId: "nasa-008-multi-edit",
    description: "Multi-edit: page limit + attachment + sow revision.",
    tags: ["multi-edit", "critical"],
    base: baseResearchTemplate,
    edits: [
      (d) => changePageLimit(d, 85),
      (d) => addAttachment(d, "4", "Acquisition Strategy Briefing"),
      (d) =>
        modifySowParagraph(
          d,
          1,
          "Monthly status reports, quarterly technical reports, and an annual independent research review are required deliverables.",
        ),
    ],
  },
  {
    pairId: "nasa-009-q-and-a-amendment",
    description: "Q&A amendment: due date shift only.",
    tags: ["dates", "single-edit", "critical"],
    base: baseResearchTemplate,
    edits: [(d) => changeProposalDueDate(d, "2026-11-05")],
  },
  {
    pairId: "nasa-010-pop-extend",
    description: "Period of performance extended to 24 months.",
    tags: ["dates", "single-edit", "critical"],
    base: baseResearchTemplate,
    edits: [(d) => changePeriodOfPerformance(d, 24)],
  },

  // ---- Big multi-edit amendments to stress the diff engine ----
  {
    pairId: "stress-001-multi-six-edits",
    description: "Six-edit amendment: due date, page limit, clause add, clause remove, eval, attachment.",
    tags: ["multi-edit", "stress", "critical"],
    base: baseServicesITTemplate,
    edits: [
      (d) => changeProposalDueDate(d, "2026-09-12"),
      (d) => changePageLimit(d, 28),
      (d) => addClause(d, "52.204-27"),
      (d) => removeClause(d, "52.247-34"),
      (d) => replaceEvaluationFactor(d, 0, "Technical Approach with cloud-native architecture"),
      (d) => addAttachment(d, "5", "Cloud Architecture Diagram"),
    ],
  },
  {
    pairId: "stress-002-dfars-overhaul",
    description: "DFARS cyber overhaul: 7019, 7020, 7021 all added.",
    tags: ["clauses", "stress", "critical"],
    base: baseSuppliesNavyTemplate,
    edits: [
      (d) => addClause(d, "252.204-7019"),
      (d) => addClause(d, "252.204-7020"),
      (d) => addClause(d, "252.204-7021"),
    ],
  },
  {
    pairId: "stress-003-clin-rewrite",
    description: "CLIN structure rewrite: new CLINs added, existing quantities changed.",
    tags: ["pricing", "stress", "critical"],
    base: baseServicesITTemplate,
    edits: [
      (d) => addClin(d, { number: "0004", description: "Year 2 Help Desk", qty: 12, unit: "Months" }),
      (d) => addClin(d, { number: "0005", description: "Year 2 Optional Tier 3 Support", qty: 12, unit: "Months" }),
      (d) => changeClinQty(d, "0001", 18),
    ],
  },
  {
    pairId: "stress-004-sow-and-l-and-m",
    description: "Combined SOW prose revision, instructions update, and evaluation factor swap.",
    tags: ["multi-edit", "stress", "critical"],
    base: baseResearchTemplate,
    edits: [
      (d) =>
        modifySowParagraph(
          d,
          2,
          "All published research products shall acknowledge the Government's funding role and identify dual-use applications.",
        ),
      (d) => changePageLimit(d, 65),
      (d) => replaceEvaluationFactor(d, 1, "Cost Realism, with emphasis on labor-mix justification"),
    ],
  },

  // ---- Reformatting-only "null" pairs: must produce ZERO changes ----
  {
    pairId: "null-001-identical",
    description: "Identical documents (sanity check: must produce zero changes).",
    tags: ["null", "sanity"],
    base: baseServicesITTemplate,
    edits: [],
  },
  {
    pairId: "null-002-identical-navy",
    description: "Identical Navy documents.",
    tags: ["null", "sanity"],
    base: baseSuppliesNavyTemplate,
    edits: [],
  },
];

function generatePair(plan: PairPlan): {
  prior: StructuredDocument;
  current: StructuredDocument;
  label: PairLabel;
  manifestEntry: CorpusManifestEntry;
} {
  const prior = buildTemplateDocument(plan.base);
  let current = prior;
  const allLabels: ExpectedChange[] = [];
  for (const edit of plan.edits) {
    const result = edit(current);
    current = result.doc;
    allLabels.push(...result.labels);
  }
  // Mark current with an amendment number so metadata is realistic.
  current = {
    ...current,
    metadata: {
      ...current.metadata,
      sourceFileName: `${plan.pairId}-current.synthetic`,
      amendmentNumber: "0001",
    },
  };
  const priorTagged: StructuredDocument = {
    ...prior,
    metadata: {
      ...prior.metadata,
      sourceFileName: `${plan.pairId}-prior.synthetic`,
    },
  };

  const label: PairLabel = {
    pairId: plan.pairId,
    description: plan.description,
    currentFile: `synthetic/${plan.pairId}/current.json`,
    priorFile: `synthetic/${plan.pairId}/prior.json`,
    origin: "generated",
    expectedChanges: allLabels,
  };

  const manifestEntry: CorpusManifestEntry = {
    pairId: plan.pairId,
    description: plan.description,
    tags: plan.tags,
    currentFile: `synthetic/${plan.pairId}/current.json`,
    priorFile: `synthetic/${plan.pairId}/prior.json`,
    labelFile: `labels/${plan.pairId}.json`,
  };

  return { prior: priorTagged, current, label, manifestEntry };
}

function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(p: string, data: unknown): void {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function flatten(doc: StructuredDocument): string {
  return doc.sections.flatMap((s) => s.blocks.map((b) => b.text)).join("\n");
}

/** Generator self-check: refuse to write a corpus whose labels are inconsistent. */
function consistencyCheck(plan: PairPlan, prior: StructuredDocument, current: StructuredDocument, label: PairLabel): string[] {
  const errors: string[] = [];
  const currentFlat = flatten(current);
  const priorFlat = flatten(prior);
  for (const e of label.expectedChanges) {
    if (!e.expectedTextFragments) continue;
    const hay = e.changeType === "DELETE" ? priorFlat : currentFlat;
    for (const frag of e.expectedTextFragments) {
      if (!hay.includes(frag)) {
        errors.push(`[${plan.pairId}] expected fragment "${frag}" missing from the ${e.changeType === "DELETE" ? "prior" : "current"} doc`);
      }
    }
  }
  return errors;
}

export function generateCorpus(): CorpusManifest {
  ensureDir(OUT_SYNTHETIC);
  ensureDir(OUT_LABELS);

  // Detect pair-id collisions before writing anything.
  const seenIds = new Set<string>();
  for (const plan of PAIRS) {
    if (seenIds.has(plan.pairId)) {
      throw new Error(`Duplicate pair id in PAIRS: ${plan.pairId}`);
    }
    seenIds.add(plan.pairId);
  }

  const entries: CorpusManifestEntry[] = [];
  const allErrors: string[] = [];
  for (const plan of PAIRS) {
    const { prior, current, label, manifestEntry } = generatePair(plan);
    allErrors.push(...consistencyCheck(plan, prior, current, label));
    const pairDir = path.join(OUT_SYNTHETIC, plan.pairId);
    ensureDir(pairDir);
    writeJson(path.join(pairDir, "prior.json"), prior);
    writeJson(path.join(pairDir, "current.json"), current);
    writeJson(path.join(pairDir, "meta.json"), {
      pairId: plan.pairId,
      description: plan.description,
      tags: plan.tags,
      editCount: plan.edits.length,
    });
    writeJson(path.join(OUT_LABELS, `${plan.pairId}.json`), label);
    entries.push(manifestEntry);
  }

  if (allErrors.length > 0) {
    throw new Error(
      `Corpus consistency check failed (${allErrors.length} errors):\n  - ` + allErrors.join("\n  - "),
    );
  }

  const manifest: CorpusManifest = {
    generatedAt: new Date(0).toISOString(),
    pairs: entries,
  };
  writeJson(OUT_MANIFEST, manifest);
  return manifest;
}

// Allow execution as a script (tsx test/corpus/generate.ts).
const isMain = (() => {
  try {
    return fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
})();
if (isMain) {
  const m = generateCorpus();
  // eslint-disable-next-line no-console
  console.log(`Generated ${m.pairs.length} pairs into test/corpus/`);
}

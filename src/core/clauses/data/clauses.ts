/**
 * A bundled FAR/DFARS clause dataset.
 *
 * Plain-language notes are deliberately NEUTRAL and DESCRIPTIVE.
 * They report what the clause covers; they NEVER advise.
 * Compliance role: every note here must pass the advisory-language check.
 *
 * The list is not exhaustive — it covers the clauses most commonly added or
 * modified by amendments to commercial-item, services, and supply
 * solicitations. The server endpoint augments this at runtime; this bundle
 * makes lookup work offline (spec 5.2).
 */
import type { ClauseInfo } from "../../diff/types.js";

export const CLAUSES: ReadonlyArray<ClauseInfo> = [
  // ---- FAR commercial-item core ----
  {
    clauseNumber: "52.212-1",
    title: "Instructions to Offerors—Commercial Products and Commercial Services",
    plainLanguageNote:
      "Describes how offers are prepared and submitted for commercial-item buys.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.212-2",
    title: "Evaluation—Commercial Products and Commercial Services",
    plainLanguageNote:
      "Sets out the evaluation factors and basis for award for commercial-item buys.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.212-3",
    title: "Offeror Representations and Certifications—Commercial Products and Commercial Services",
    plainLanguageNote:
      "Standard offeror representations and certifications for commercial-item buys.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.212-4",
    title: "Contract Terms and Conditions—Commercial Products and Commercial Services",
    plainLanguageNote: "Standard contract terms and conditions for commercial-item buys.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.212-5",
    title:
      "Contract Terms and Conditions Required to Implement Statutes or Executive Orders—Commercial Products and Commercial Services",
    plainLanguageNote:
      "Incorporates statutory/executive-order clauses applicable to the commercial-item buy.",
    regulation: "FAR",
  },

  // ---- FAR cybersecurity / safeguarding ----
  {
    clauseNumber: "52.204-21",
    title: "Basic Safeguarding of Covered Contractor Information Systems",
    plainLanguageNote:
      "Requires basic safeguards on contractor information systems that process or store federal contract information.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.204-25",
    title:
      "Prohibition on Contracting for Certain Telecommunications and Video Surveillance Services or Equipment",
    plainLanguageNote:
      "Prohibits procuring covered telecommunications equipment or services from listed entities.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.204-27",
    title: "Prohibition on a ByteDance Covered Application",
    plainLanguageNote:
      "Prohibits the presence or use of a ByteDance covered application on contractor information technology.",
    regulation: "FAR",
  },

  // ---- FAR socioeconomic / small business ----
  {
    clauseNumber: "52.219-14",
    title: "Limitations on Subcontracting",
    plainLanguageNote:
      "Limits how much of a set-aside contract a prime small business may subcontract to non-similarly-situated entities.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.219-9",
    title: "Small Business Subcontracting Plan",
    plainLanguageNote:
      "Requires offerors above certain thresholds to submit a subcontracting plan for small business participation.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.222-50",
    title: "Combating Trafficking in Persons",
    plainLanguageNote:
      "Prohibits trafficking-in-persons activities by contractors and their employees.",
    regulation: "FAR",
  },

  // ---- FAR labor / wages ----
  {
    clauseNumber: "52.222-41",
    title: "Service Contract Labor Standards",
    plainLanguageNote:
      "Applies Service Contract Labor Standards wage-determination requirements to service contracts.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.222-55",
    title: "Minimum Wages for Contractor Workers Under Executive Order 14026",
    plainLanguageNote:
      "Sets the minimum hourly wage for contractor workers performing on covered federal contracts.",
    regulation: "FAR",
  },

  // ---- FAR delivery / inspection ----
  {
    clauseNumber: "52.247-34",
    title: "F.o.b.—Destination",
    plainLanguageNote:
      "Requires the contractor to deliver supplies F.o.b. destination — the contractor bears delivery costs and risk to destination.",
    regulation: "FAR",
  },

  // ---- DFARS cybersecurity ----
  {
    clauseNumber: "252.204-7012",
    title: "Safeguarding Covered Defense Information and Cyber Incident Reporting",
    plainLanguageNote:
      "Requires safeguards for covered defense information and rapid reporting of cyber incidents.",
    regulation: "DFARS",
  },
  {
    clauseNumber: "252.204-7019",
    title:
      "Notice of NIST SP 800-171 DoD Assessment Requirements",
    plainLanguageNote:
      "Notifies offerors of NIST SP 800-171 self-assessment posting requirements before award.",
    regulation: "DFARS",
  },
  {
    clauseNumber: "252.204-7020",
    title: "NIST SP 800-171 DoD Assessment Requirements",
    plainLanguageNote:
      "Requires the contractor to provide access for and respond to higher-level NIST SP 800-171 assessments.",
    regulation: "DFARS",
  },
  {
    clauseNumber: "252.204-7021",
    title: "Cybersecurity Maturity Model Certification Requirements",
    plainLanguageNote:
      "Requires the contractor and applicable subcontractors to hold a current CMMC certificate at the required level.",
    regulation: "DFARS",
  },

  // ---- DFARS supply chain / origin ----
  {
    clauseNumber: "252.225-7001",
    title: "Buy American and Balance of Payments Program",
    plainLanguageNote:
      "Restricts acquisition to domestic end products with limited exceptions for the Balance of Payments Program.",
    regulation: "DFARS",
  },
  {
    clauseNumber: "252.225-7048",
    title: "Export-Controlled Items",
    plainLanguageNote:
      "Requires compliance with applicable export-control laws and regulations for items provided under the contract.",
    regulation: "DFARS",
  },
];

/** Quick-lookup map. */
export const CLAUSE_INDEX: ReadonlyMap<string, ClauseInfo> = new Map(
  CLAUSES.map((c) => [c.clauseNumber, c]),
);

export function lookupClauseLocal(number: string): ClauseInfo | null {
  return CLAUSE_INDEX.get(number) ?? null;
}

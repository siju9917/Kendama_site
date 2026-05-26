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

  // ---- More FAR clauses commonly appearing in amendments ----
  {
    clauseNumber: "52.203-13",
    title: "Contractor Code of Business Ethics and Conduct",
    plainLanguageNote:
      "Requires contractors above certain thresholds to maintain a written code of business ethics and an internal control system.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.203-17",
    title: "Contractor Employee Whistleblower Rights",
    plainLanguageNote:
      "Notifies contractor employees of whistleblower rights and prohibitions on retaliation.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.204-7",
    title: "System for Award Management",
    plainLanguageNote:
      "Requires offerors to be registered in the System for Award Management (SAM) at time of offer submission.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.204-13",
    title: "System for Award Management Maintenance",
    plainLanguageNote:
      "Requires the contractor to maintain SAM registration during the period of performance.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.204-16",
    title: "Commercial and Government Entity Code Reporting",
    plainLanguageNote:
      "Requires the offeror to provide its Commercial and Government Entity (CAGE) code at offer submission.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.204-18",
    title: "Commercial and Government Entity Code Maintenance",
    plainLanguageNote:
      "Requires the contractor to maintain accurate CAGE-code data throughout contract performance.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.209-10",
    title: "Prohibition on Contracting With Inverted Domestic Corporations",
    plainLanguageNote:
      "Prohibits award to entities organized as inverted domestic corporations and to subsidiaries of such entities.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.215-1",
    title: "Instructions to Offerors—Competitive Acquisition",
    plainLanguageNote:
      "Instructions for non-commercial competitive acquisitions, including proposal preparation and submission.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.216-1",
    title: "Type of Contract",
    plainLanguageNote:
      "States the type of contract contemplated by the solicitation (e.g., firm-fixed-price, cost-plus-fixed-fee).",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.219-6",
    title: "Notice of Total Small Business Set-Aside",
    plainLanguageNote:
      "Indicates the procurement is set aside for small business concerns.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.219-8",
    title: "Utilization of Small Business Concerns",
    plainLanguageNote:
      "Requires contractors to use their best efforts to subcontract to small business concerns.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.219-28",
    title: "Post-Award Small Business Program Rerepresentation",
    plainLanguageNote:
      "Requires periodic rerepresentation of small business size status after award.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.222-3",
    title: "Convict Labor",
    plainLanguageNote:
      "Prohibits employment of federal prisoners in performance of the contract except as specifically authorized.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.222-19",
    title: "Child Labor — Cooperation With Authorities and Remedies",
    plainLanguageNote:
      "Prohibits use of certain forms of child labor and requires cooperation with enforcement authorities.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.222-21",
    title: "Prohibition of Segregated Facilities",
    plainLanguageNote: "Prohibits the contractor from maintaining segregated facilities.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.222-26",
    title: "Equal Opportunity",
    plainLanguageNote:
      "Requires the contractor to comply with Executive Order 11246 equal-opportunity obligations.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.222-35",
    title: "Equal Opportunity for Veterans",
    plainLanguageNote:
      "Requires equal opportunity for protected veteran employees and applicants.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.222-36",
    title: "Equal Opportunity for Workers with Disabilities",
    plainLanguageNote:
      "Requires equal opportunity for workers with disabilities and reasonable accommodation.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.222-37",
    title: "Employment Reports on Veterans",
    plainLanguageNote:
      "Requires annual reporting on employment of veterans on covered federal contracts.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.222-40",
    title: "Notification of Employee Rights Under the National Labor Relations Act",
    plainLanguageNote:
      "Requires contractors to inform employees of their rights under the National Labor Relations Act.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.222-54",
    title: "Employment Eligibility Verification",
    plainLanguageNote:
      "Requires use of E-Verify for employment eligibility verification on covered contracts.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.223-18",
    title: "Encouraging Contractor Policies to Ban Text Messaging While Driving",
    plainLanguageNote:
      "Encourages the contractor to adopt and enforce a policy banning text messaging while driving on duty.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.225-13",
    title: "Restrictions on Certain Foreign Purchases",
    plainLanguageNote:
      "Restricts purchases of products from certain foreign countries under federal sanctions.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.227-1",
    title: "Authorization and Consent",
    plainLanguageNote:
      "Authorizes the contractor to use any United-States-protected invention as the U.S. Government's agent.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.227-14",
    title: "Rights in Data—General",
    plainLanguageNote:
      "Sets the Government's data-rights position in technical data produced under the contract.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.232-1",
    title: "Payments",
    plainLanguageNote:
      "States the Government's obligation to pay for properly delivered supplies or rendered services.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.232-25",
    title: "Prompt Payment",
    plainLanguageNote:
      "Sets the Government's prompt-payment due dates and interest penalty for late payment.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.232-33",
    title: "Payment by Electronic Funds Transfer—System for Award Management",
    plainLanguageNote:
      "Requires payment by EFT and reliance on the contractor's SAM-registered banking information.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.233-3",
    title: "Protest After Award",
    plainLanguageNote:
      "Sets procedures for stays of contract performance pending the resolution of an agency-level protest after award.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.233-4",
    title: "Applicable Law for Breach of Contract Claim",
    plainLanguageNote:
      "States that U.S. federal law applies to any breach-of-contract claim under the contract.",
    regulation: "FAR",
  },
  {
    clauseNumber: "52.252-2",
    title: "Clauses Incorporated by Reference",
    plainLanguageNote:
      "Notifies offerors that listed clauses are incorporated by reference and provides the full-text source.",
    regulation: "FAR",
  },

  // ---- More DFARS clauses ----
  {
    clauseNumber: "252.203-7000",
    title: "Requirements Relating to Compensation of Former DoD Officials",
    plainLanguageNote:
      "Requires personal-services certifications for former DoD officials and limits post-employment compensation arrangements.",
    regulation: "DFARS",
  },
  {
    clauseNumber: "252.204-7000",
    title: "Disclosure of Information",
    plainLanguageNote:
      "Restricts the contractor's release of information generated under the contract without prior written approval.",
    regulation: "DFARS",
  },
  {
    clauseNumber: "252.204-7008",
    title: "Compliance With Safeguarding Covered Defense Information Controls",
    plainLanguageNote:
      "Requires compliance with NIST SP 800-171 safeguarding controls before contract award.",
    regulation: "DFARS",
  },
  {
    clauseNumber: "252.211-7003",
    title: "Item Unique Identification and Valuation",
    plainLanguageNote:
      "Requires the contractor to assign unique item identifiers (UID) to qualifying delivered items.",
    regulation: "DFARS",
  },
  {
    clauseNumber: "252.215-7008",
    title: "Only One Offer",
    plainLanguageNote:
      "Requires the contracting officer to seek additional sources when only one offer is received in a competitive acquisition.",
    regulation: "DFARS",
  },
  {
    clauseNumber: "252.225-7012",
    title: "Preference for Certain Domestic Commodities",
    plainLanguageNote:
      "Establishes preference for specific domestic items required by 10 U.S.C. 4862 (formerly Berry Amendment).",
    regulation: "DFARS",
  },
  {
    clauseNumber: "252.227-7013",
    title: "Rights in Technical Data—Noncommercial Items",
    plainLanguageNote:
      "Sets the Government's rights in noncommercial technical data delivered under the contract.",
    regulation: "DFARS",
  },
  {
    clauseNumber: "252.227-7014",
    title: "Rights in Noncommercial Computer Software and Noncommercial Computer Software Documentation",
    plainLanguageNote:
      "Sets the Government's rights in noncommercial computer software delivered under the contract.",
    regulation: "DFARS",
  },
  {
    clauseNumber: "252.232-7006",
    title: "Wide Area WorkFlow Payment Instructions",
    plainLanguageNote:
      "Directs the contractor to use Wide Area WorkFlow (WAWF) for invoice and receipt-of-goods submissions.",
    regulation: "DFARS",
  },
  {
    clauseNumber: "252.243-7001",
    title: "Pricing of Contract Modifications",
    plainLanguageNote:
      "Requires equitable adjustment pricing to follow FAR Part 31 cost principles for contract modifications.",
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

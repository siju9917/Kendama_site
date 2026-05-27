/**
 * Module interfaces. Every core module implements one of these so modules
 * are independently testable and site-specific integrations are swappable.
 */
import type { StructuredDocument } from "./model/types.js";
import type { ClauseInfo, DiffResult } from "./diff/types.js";

/** Document extractor: bytes -> structured document (or throws ExtractionError). */
export interface IExtractor {
  extract(file: ArrayBuffer, fileName: string): Promise<StructuredDocument>;
  canHandle(file: ArrayBuffer): Promise<boolean>;
}

/** Diff engine: deterministic pure function of its two inputs. */
export interface IDiffEngine {
  diff(current: StructuredDocument, prior: StructuredDocument): DiffResult;
}

/** Clause-intelligence client: looks up titles + neutral notes. */
export interface IClauseClient {
  lookup(clauseNumbers: string[]): Promise<Map<string, ClauseInfo>>;
  /**
   * Synchronous lookup from a locally-bundled cache. Returns null when the
   * clause number is not in the local cache. Implementations that have no
   * local cache return null for every call.
   */
  lookupSync(clauseNumber: string): ClauseInfo | null;
}

export interface OpportunityAttachment {
  id: string;
  fileName: string;
  url: string;
  mimeType: string | null;
  postedAt: string | null;
  amendmentNumber: string | null;
  sizeBytes: number | null;
}

export interface OpportunityAmendmentMeta {
  amendmentNumber: string;
  postedAt: string | null;
  description: string | null;
}

/**
 * Opportunity-site integration. ALL site-specific selectors and URL
 * patterns live in the concrete implementation under src/content/, not here.
 */
export interface IOpportunitySite {
  isOpportunityPage(): boolean;
  findAttachments(): Promise<OpportunityAttachment[]>;
  readAmendmentMetadata(): Promise<OpportunityAmendmentMeta[]>;
}


export interface DiffSummary {
  id: string;
  generatedAt: string;
  currentFileName: string;
  priorFileName: string;
  criticalCount: number;
  totalChanges: number;
  solicitationId: string | null;
  /** ISO-8601 timestamp the user last opened this diff. null = never viewed since save. */
  lastViewedAt?: string | null;
}

export interface IStorage {
  saveDiff(result: DiffResult): Promise<void>;
  listDiffs(): Promise<DiffSummary[]>;
  getDiff(id: string): Promise<DiffResult | null>;
  deleteDiff(id: string): Promise<void>;
  markViewed(id: string): Promise<void>;
  pruneToLimit(maxBytes: number): Promise<void>;
}

export type LicenseTier = "trial" | "solo" | "team" | "enterprise";
export type LicenseStatus = "active" | "expired" | "lapsed" | "invalid" | "grace";

export interface LicenseState {
  tier: LicenseTier;
  status: LicenseStatus;
  /** null for non-trial states. */
  trialDaysLeft: number | null;
  /** Seconds remaining in offline grace period; null if not in grace. */
  gracePeriodSecondsLeft: number | null;
  /** ISO-8601 last successful server validation. */
  lastValidatedAt: string | null;
}

export interface ILicenseClient {
  validate(): Promise<LicenseState>;
}

/** Errors thrown by extraction. UI surfaces `userMessage` directly. */
export class ExtractionError extends Error {
  readonly code:
    | "ENCRYPTED"
    | "CORRUPT"
    | "EMPTY"
    | "UNSUPPORTED_FORMAT"
    | "TOO_LARGE"
    | "TIMEOUT"
    | "OCR_FAILED"
    | "UNKNOWN";
  readonly userMessage: string;
  constructor(
    code: ExtractionError["code"],
    userMessage: string,
    message?: string,
  ) {
    super(message ?? userMessage);
    this.name = "ExtractionError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

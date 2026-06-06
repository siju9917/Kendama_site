/** Core data types for the Terraform plan destructive-change classifier. */

export type TfActionSet = string[];

export interface TfChange {
  address: string;
  type: string;
  name: string;
  actions: TfActionSet;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export type TfSeverity = "CRITICAL" | "NORMAL" | "NO-OP";

export interface TfClassification {
  change: TfChange;
  severity: TfSeverity;
  reasons: string[];
}

export interface TfPlanSummary {
  changes: TfClassification[];
  critical: number;
  normal: number;
  noOp: number;
  terraformVersion: string;
}

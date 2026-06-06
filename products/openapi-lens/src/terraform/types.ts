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

/** An output value change from the Terraform plan's output_changes section. */
export interface TfOutputChange {
  name: string;
  actions: TfActionSet;
  sensitive: boolean;
}

export interface TfPlanSummary {
  changes: TfClassification[];
  outputChanges: TfOutputChange[];
  critical: number;
  normal: number;
  noOp: number;
  terraformVersion: string;
}

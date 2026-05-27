/**
 * Strongly-typed runtime-message protocol between content script,
 * background service worker, side panel, and offscreen document.
 *
 * Every place that calls chrome.runtime.sendMessage or addListener should
 * route through this union so a bad payload is caught at compile time.
 */
import type { DiffResult } from "../core/diff/types.js";
import type { OpportunityAttachment } from "../core/interfaces.js";

/** Open the side panel for the current window. Sent from content/popup. */
export interface OpenSidePanelMsg {
  kind: "biddiff/open-side-panel";
  attachments?: OpportunityAttachment[];
}

/** Read the most recently captured attachments from the background cache. */
export interface GetLastAttachmentsMsg {
  kind: "biddiff/get-last-attachments";
}
export interface LastAttachmentsResponse {
  ok: boolean;
  attachments: OpportunityAttachment[];
}

/** Ask the active content script for a fresh fetch of attachments. */
export interface GetSamAttachmentsMsg {
  kind: "biddiff/get-sam-attachments";
}

/** Side panel asks offscreen to run a diff job. */
export interface DiffJobMsg {
  kind: "biddiff/diff";
  jobId: string;
  currentBytes: ArrayBuffer;
  currentName: string;
  priorBytes: ArrayBuffer;
  priorName: string;
}

/** Offscreen → side panel progress. */
export interface DiffProgressMsg {
  kind: "biddiff/progress";
  jobId: string;
  note: string;
  percent: number;
}

/** Offscreen → side panel final result. */
export interface DiffResultMsg {
  kind: "biddiff/result";
  jobId: string;
  result: DiffResult;
}

/** Offscreen → side panel terminal error. */
export interface DiffErrorMsg {
  kind: "biddiff/error";
  jobId: string;
  code: string;
  message: string;
}

export type BidDiffMessage =
  | OpenSidePanelMsg
  | GetLastAttachmentsMsg
  | GetSamAttachmentsMsg
  | DiffJobMsg
  | DiffProgressMsg
  | DiffResultMsg
  | DiffErrorMsg;

export function isBidDiffMessage(m: unknown): m is BidDiffMessage {
  return (
    !!m &&
    typeof m === "object" &&
    typeof (m as { kind?: unknown }).kind === "string" &&
    (m as { kind: string }).kind.startsWith("biddiff/")
  );
}

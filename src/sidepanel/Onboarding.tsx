/**
 * First-run onboarding (Phase 7.5).
 *
 * Three small "did you know?" cards shown when the user has zero saved
 * diffs in history. Skip-once flag lives in chrome.storage so we don't
 * keep showing it once dismissed.
 */
import React, { useEffect, useState } from "react";
import { makeKv } from "../core/storage/index.js";

const SEEN_KEY = "biddiff.onboarding.seen";

export function Onboarding(): React.ReactElement | null {
  const [show, setShow] = useState<boolean | null>(null);
  const kv = makeKv();

  useEffect(() => {
    kv.get<boolean>(SEEN_KEY).then((v) => setShow(!v));
  }, []);

  const dismiss = async (): Promise<void> => {
    await kv.set(SEEN_KEY, true);
    setShow(false);
  };

  if (show !== true) return null;

  return (
    <section
      style={{
        background: "linear-gradient(180deg, #f4f7fd 0%, #ffffff 100%)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
      aria-label="Getting started"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0, fontSize: 14 }}>Welcome to BidDiff</h2>
        <button
          onClick={dismiss}
          style={{ fontSize: 11, padding: "2px 8px" }}
          aria-label="Dismiss the getting-started card"
        >
          Dismiss
        </button>
      </div>
      <ol style={{ paddingLeft: 18, marginTop: 8, color: "var(--fg-muted)", fontSize: 12 }}>
        <li>
          <strong>Drop two versions.</strong> The new amendment first, then the prior version
          (PDF or .docx).
        </li>
        <li>
          <strong>Critical changes appear at the top.</strong> Due dates, clause changes,
          page-limit shifts, evaluation-criteria edits, CLIN changes, attachment changes.
        </li>
        <li>
          <strong>Export or copy.</strong> Branded PDF report for your capture team, or a
          one-paste summary for Slack.
        </li>
      </ol>
    </section>
  );
}

/**
 * First-run onboarding (Phase 7.5).
 */
import React, { useEffect, useMemo, useState } from "react";
import { makeKv } from "../core/storage/index.js";

const SEEN_KEY = "biddiff.onboarding.seen";

export function Onboarding(): React.ReactElement | null {
  const [show, setShow] = useState<boolean | null>(null);
  const kv = useMemo(() => makeKv(), []);

  useEffect(() => {
    kv.get<boolean>(SEEN_KEY).then((v) => setShow(!v));
  }, [kv]);

  const dismiss = (): void => {
    // Hide first so the click is instant; persist after. A persist
    // failure would only resurface the card on next reload.
    setShow(false);
    void kv.set(SEEN_KEY, true);
  };

  if (show !== true) return null;

  return (
    <section className="onboarding" aria-label="Getting started">
      <div className="onboarding__head">
        <h2>Welcome to BidDiff</h2>
        <button
          className="ghost"
          onClick={dismiss}
          style={{ fontSize: 11 }}
          aria-label="Dismiss the getting-started card"
        >
          Dismiss
        </button>
      </div>
      <ol>
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

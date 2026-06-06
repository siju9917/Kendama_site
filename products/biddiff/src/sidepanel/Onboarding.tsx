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
    kv.get<boolean>(SEEN_KEY)
      .then((v) => setShow(!v))
      .catch(() => setShow(false));
  }, [kv]);

  const dismiss = (): void => {
    // Hide first so the click is instant; persist after.
    setShow(false);
    kv.set(SEEN_KEY, true).catch(() => {});
  };

  if (show !== true) return null;

  return (
    <section className="onboarding" aria-labelledby="biddiff-onboarding-heading">
      <div className="onboarding__head">
        <h2 id="biddiff-onboarding-heading">Welcome to BidDiff</h2>
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
          <strong>Critical changes are flagged.</strong> Due dates, clause changes,
          page-limit shifts, evaluation-criteria edits, CLIN changes, attachment changes.
          Use the &lsquo;Critical&rsquo; filter chip to see just those.
        </li>
        <li>
          <strong>Export or copy.</strong> Branded PDF report for your records, or a
          one-paste summary for Slack.
        </li>
      </ol>
      <p style={{ margin: "8px 0 0", fontSize: 12 }}>
        Ready? Drop your amendment files above, or try a{" "}
        <strong>sample diff</strong> from the New Diff screen.
      </p>
    </section>
  );
}

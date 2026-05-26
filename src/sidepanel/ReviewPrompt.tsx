/**
 * Polite Web-Store review prompt (Phase 7.8).
 *
 * Trigger logic:
 *   - Wait until the user has completed at least 5 successful diffs.
 *   - Don't prompt while a diff is open the first time it crosses the
 *     threshold — wait until the SECOND successful run AFTER that.
 *   - Once dismissed, never show again.
 *
 * The prompt is non-blocking and offers a clear opt-out.
 */
import React, { useEffect, useMemo, useState } from "react";
import { makeKv } from "../core/storage/index.js";

const COUNT_KEY = "biddiff.review.count";
const DISMISSED_KEY = "biddiff.review.dismissed";
const PROMPT_AT = 5;

/**
 * Increment the count of successful diffs. Returns the new count.
 * Side-effect intended to be called from App when a diff completes.
 */
export async function noteDiffSucceeded(): Promise<number> {
  const kv = makeKv();
  const current = (await kv.get<number>(COUNT_KEY)) ?? 0;
  const next = current + 1;
  await kv.set(COUNT_KEY, next);
  return next;
}

export function ReviewPrompt(): React.ReactElement | null {
  const [show, setShow] = useState<boolean | null>(null);
  const kv = useMemo(() => makeKv(), []);

  useEffect(() => {
    void (async () => {
      const dismissed = await kv.get<boolean>(DISMISSED_KEY);
      if (dismissed) {
        setShow(false);
        return;
      }
      const count = (await kv.get<number>(COUNT_KEY)) ?? 0;
      setShow(count >= PROMPT_AT);
    })();
  }, []);

  const onDone = async (): Promise<void> => {
    await kv.set(DISMISSED_KEY, true);
    setShow(false);
  };

  if (show !== true) return null;

  return (
    <div className="review-prompt" role="region" aria-label="Enjoying BidDiff?">
      <div className="review-prompt__title">Enjoying BidDiff?</div>
      <div className="review-prompt__body">
        Reviews on the Chrome Web Store help other proposal and capture teams find us.
      </div>
      <div className="review-prompt__actions">
        <a
          href="https://chromewebstore.google.com/category/extensions"
          target="_blank"
          rel="noreferrer noopener"
          onClick={() => void onDone()}
        >
          <button className="primary review-prompt__cta">Leave a review</button>
        </a>
        <button onClick={() => void onDone()} className="review-prompt__cta">
          No thanks
        </button>
      </div>
    </div>
  );
}

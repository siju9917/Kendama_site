/**
 * Polite Web-Store review prompt (Phase 7.8).
 *
 * Trigger logic:
 *   - Show once the user has completed at least PROMPT_AT (5) successful
 *     diffs — the count is read on mount, so in practice the prompt
 *     appears the next time the side panel mounts at/after the threshold.
 *   - Once dismissed ("Leave a review" or "No thanks"), never show again.
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
    // Wrap in try/catch so an unexpected kv error doesn't bubble out
    // of the async IIFE as an unhandled rejection.
    void (async () => {
      try {
        const dismissed = await kv.get<boolean>(DISMISSED_KEY);
        if (dismissed) {
          setShow(false);
          return;
        }
        const count = (await kv.get<number>(COUNT_KEY)) ?? 0;
        setShow(count >= PROMPT_AT);
      } catch {
        setShow(false);
      }
    })();
  }, []);

  const onDone = (): void => {
    // Hide first so the click is instant; persist after.
    setShow(false);
    kv.set(DISMISSED_KEY, true).catch(() => {});
  };

  if (show !== true) return null;

  return (
    <div className="review-prompt" role="region" aria-label="Enjoying BidDiff?">
      <div className="review-prompt__title">Enjoying BidDiff?</div>
      <div className="review-prompt__body">
        Reviews on the Chrome Web Store help other proposal and capture teams find us.
      </div>
      <div className="review-prompt__actions">
        <button
          className="primary review-prompt__cta"
          onClick={() => {
            // chrome.runtime.id resolves to the published extension's ID
            // for users on the Web Store build; in dev / unpacked it's an
            // ephemeral ID and the page will 404. The 5-diff gate means
            // the prompt only ever reaches real installs in practice.
            const id = typeof chrome !== "undefined" ? chrome.runtime?.id : undefined;
            const url = id
              ? `https://chromewebstore.google.com/detail/${id}/reviews`
              : "https://chromewebstore.google.com/";
            window.open(url, "_blank", "noopener,noreferrer");
            onDone();
          }}
        >
          Leave a review
        </button>
        <button onClick={onDone} className="review-prompt__cta">
          No thanks
        </button>
      </div>
    </div>
  );
}

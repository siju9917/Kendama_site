/**
 * Side panel — the main workspace.
 *
 * App.tsx is intentionally thin. State + side effects live in
 * useDiffPipeline; the diff view's filtering/keyboard nav lives in
 * DiffView; the empty state pulls in Onboarding + FilePickerWithSam +
 * History. App orchestrates phase transitions.
 */
import React, { useEffect, useMemo, useState } from "react";
import { DISCLAIMER_TEXT } from "../shared/disclaimer.js";
import { LocalLicenseClient } from "../core/licensing/client.js";
import type { LicenseState } from "../core/interfaces.js";
import { makeKv } from "../core/storage/index.js";
import { DiffView } from "./DiffView.js";
import { FilePickerWithSam } from "./FilePickerWithSam.js";
import { History } from "./History.js";
import { LicenseChip } from "./LicenseChip.js";
import { Onboarding } from "./Onboarding.js";
import { ProgressView } from "./ProgressView.js";
import { useDiffPipeline } from "./useDiffPipeline.js";

const DISCLAIMER_DISMISSED_KEY = "biddiff.disclaimer.dismissed";

export function App(): React.ReactElement {
  const { state, storage, run, openSaved, reset } = useDiffPipeline();
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [disclaimerShown, setDisclaimerShown] = useState<boolean>(true);
  const kv = useMemo(() => makeKv(), []);

  useEffect(() => {
    new LocalLicenseClient().validate().then(setLicense).catch(() => setLicense(null));
    kv.get<boolean>(DISCLAIMER_DISMISSED_KEY)
      .then((v) => setDisclaimerShown(!v))
      .catch(() => setDisclaimerShown(true));
  }, [kv]);

  const dismissDisclaimer = (): void => {
    // Hide locally first so the click feels instant; persist after.
    // A persist failure would only mean the disclaimer reappears on
    // next reload — better than the user clicking Hide and seeing
    // nothing happen.
    setDisclaimerShown(false);
    void kv.set(DISCLAIMER_DISMISSED_KEY, true);
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">BidDiff</h1>
        <span className="app__subtitle">Federal solicitation amendment diff</span>
        <LicenseChip license={license} />
        {state.phase !== "EMPTY" && (
          <button className="ghost" onClick={reset} style={{ marginLeft: "auto" }}>
            Start over
          </button>
        )}
      </header>

      <main className="app__body">
        {disclaimerShown && (
          <p className="disclaimer">
            {DISCLAIMER_TEXT}{" "}
            <button
              className="disclaimer__toggle"
              onClick={dismissDisclaimer}
              aria-label="Hide the disclaimer (can be restored from Settings)"
            >
              Hide
            </button>
          </p>
        )}

        {state.phase === "EMPTY" && (
          <>
            <Onboarding />
            <FilePickerWithSam onRun={run} />
            <History storage={storage} onOpen={openSaved} />
          </>
        )}

        {state.phase === "RUNNING" && (
          <ProgressView note={state.loadingNote} percent={state.loadingPercent} />
        )}

        {state.phase === "ERROR" && state.error && (
          <div className="error" role="alert">
            <strong>Could not diff these documents.</strong>
            <div>{state.error}</div>
            <div style={{ marginTop: 12 }}>
              <button onClick={reset}>Try again</button>
            </div>
          </div>
        )}

        {state.phase === "DONE" && state.result && (
          // Key on the diff ID so per-diff view state (reviewed,
          // filters, focused index, dismissed tip) resets when a
          // different diff is loaded.
          <DiffView key={state.result.id} result={state.result} />
        )}
      </main>

      <footer className="footer">
        Processed on your device. BidDiff assists — it does not advise.
      </footer>
    </div>
  );
}

import React from "react";
import type { LicenseState } from "../core/interfaces.js";
import { openOptionsPage } from "../shared/chrome-rt.js";

export function LicenseChip({
  license,
}: {
  license: LicenseState | null;
}): React.ReactElement | null {
  if (!license) return null;
  let label = "";
  let upgrade = false;
  if (license.tier === "trial" && license.status === "active") {
    const d = license.trialDaysLeft ?? 0;
    // 0 days left is the LAST day, not expired — surface it that way so
    // "0d left" doesn't read as the trial already being over.
    label = d === 0 ? "Trial · last day" : `Trial · ${d}d left`;
    upgrade = d <= 3;
  } else if (license.status === "active") {
    label = `${license.tier} · active`;
  } else if (license.status === "grace") {
    label = "Trial expired · grace";
    upgrade = true;
  } else if (license.status === "expired") {
    label = "Subscribe to continue";
    upgrade = true;
  } else {
    label = `License ${license.status}`;
    upgrade = true;
  }
  return (
    <span
      style={{
        fontSize: 11,
        color: upgrade ? "var(--critical)" : "var(--fg-muted)",
        marginLeft: 8,
        padding: "2px 8px",
        background: upgrade ? "var(--critical-soft)" : "var(--bg-subtle)",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {upgrade && (
        <button
          onClick={openOptionsPage}
          style={{
            marginLeft: 6,
            fontWeight: 600,
            background: "transparent",
            border: "0",
            padding: "0",
            color: "var(--accent)",
            cursor: "pointer",
            font: "inherit",
            textDecoration: "underline",
          }}
        >
          Upgrade
        </button>
      )}
    </span>
  );
}

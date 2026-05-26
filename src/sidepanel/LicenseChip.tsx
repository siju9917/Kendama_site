import React from "react";
import type { LicenseState } from "../core/interfaces.js";

export function LicenseChip({
  license,
}: {
  license: LicenseState | null;
}): React.ReactElement | null {
  if (!license) return null;
  let label = "";
  let upgrade = false;
  if (license.tier === "trial" && license.status === "active") {
    label = `Trial · ${license.trialDaysLeft ?? 0}d left`;
    upgrade = (license.trialDaysLeft ?? 0) <= 3;
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
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (chrome as any).runtime?.openOptionsPage?.();
          }}
          style={{ marginLeft: 6, fontWeight: 600 }}
        >
          Upgrade
        </a>
      )}
    </span>
  );
}

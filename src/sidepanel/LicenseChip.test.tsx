// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LicenseChip } from "./LicenseChip.js";

describe("LicenseChip", () => {
  it("renders nothing when license is null", () => {
    const { container } = render(<LicenseChip license={null} />);
    expect(container.textContent).toBe("");
  });

  it("renders trial days left for an active trial", () => {
    render(
      <LicenseChip
        license={{
          tier: "trial",
          status: "active",
          trialDaysLeft: 9,
          gracePeriodSecondsLeft: null,
          lastValidatedAt: null,
        }}
      />,
    );
    expect(screen.getByText(/Trial · 9d left/i)).toBeTruthy();
  });

  it("shows Upgrade when trial has 3 or fewer days left", () => {
    render(
      <LicenseChip
        license={{
          tier: "trial",
          status: "active",
          trialDaysLeft: 2,
          gracePeriodSecondsLeft: null,
          lastValidatedAt: null,
        }}
      />,
    );
    expect(screen.getByText(/Upgrade/i)).toBeTruthy();
  });

  it("shows Subscribe message for expired trial", () => {
    render(
      <LicenseChip
        license={{
          tier: "trial",
          status: "expired",
          trialDaysLeft: 0,
          gracePeriodSecondsLeft: null,
          lastValidatedAt: null,
        }}
      />,
    );
    expect(screen.getByText(/Subscribe to continue/i)).toBeTruthy();
  });
});

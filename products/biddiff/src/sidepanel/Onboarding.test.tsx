// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Onboarding } from "./Onboarding.js";
import { makeKv, __resetMemoryKvForTests } from "../core/storage/index.js";

const SEEN_KEY = "biddiff.onboarding.seen";

beforeEach(() => {
  __resetMemoryKvForTests();
});

describe("Onboarding first-run gating", () => {
  it("shows on first run (SEEN_KEY unset)", async () => {
    render(<Onboarding />);
    expect(await screen.findByRole("heading", { name: /welcome to biddiff/i })).toBeTruthy();
  });

  it("does not show once SEEN_KEY is set", async () => {
    await makeKv().set(SEEN_KEY, true);
    const { container } = render(<Onboarding />);
    await waitFor(() => expect(container.querySelector(".onboarding")).toBeNull());
  });

  it("Dismiss hides the card and persists SEEN_KEY", async () => {
    const kv = makeKv();
    render(<Onboarding />);
    const dismiss = await screen.findByRole("button", { name: /dismiss/i });
    fireEvent.click(dismiss);
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: /welcome to biddiff/i })).toBeNull(),
    );
    expect(await kv.get<boolean>(SEEN_KEY)).toBe(true);
  });
});

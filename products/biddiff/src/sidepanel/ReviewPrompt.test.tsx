// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReviewPrompt, noteDiffSucceeded } from "./ReviewPrompt.js";
import { makeKv, __resetMemoryKvForTests } from "../core/storage/index.js";

const COUNT_KEY = "biddiff.review.count";
const DISMISSED_KEY = "biddiff.review.dismissed";

beforeEach(() => {
  __resetMemoryKvForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("noteDiffSucceeded", () => {
  it("increments the stored count and returns the new value", async () => {
    expect(await noteDiffSucceeded()).toBe(1);
    expect(await noteDiffSucceeded()).toBe(2);
    expect(await makeKv().get<number>(COUNT_KEY)).toBe(2);
  });
});

describe("ReviewPrompt", () => {
  it("does not render below the 5-diff threshold", async () => {
    await makeKv().set(COUNT_KEY, 4);
    const { container } = render(<ReviewPrompt />);
    // The effect resolves to show=false; nothing renders.
    await waitFor(() => expect(container.querySelector(".review-prompt")).toBeNull());
  });

  it("renders once the count reaches the threshold", async () => {
    await makeKv().set(COUNT_KEY, 5);
    render(<ReviewPrompt />);
    expect(await screen.findByRole("region", { name: /enjoying biddiff/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /leave a review/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /no thanks/i })).toBeTruthy();
  });

  it("never shows again once dismissed, even past the threshold", async () => {
    const kv = makeKv();
    await kv.set(COUNT_KEY, 50);
    await kv.set(DISMISSED_KEY, true);
    const { container } = render(<ReviewPrompt />);
    await waitFor(() => expect(container.querySelector(".review-prompt")).toBeNull());
  });

  it("'No thanks' hides the prompt and persists the dismissal", async () => {
    const kv = makeKv();
    await kv.set(COUNT_KEY, 5);
    render(<ReviewPrompt />);
    const noThanks = await screen.findByRole("button", { name: /no thanks/i });
    fireEvent.click(noThanks);
    await waitFor(() => expect(screen.queryByRole("region", { name: /enjoying/i })).toBeNull());
    expect(await kv.get<boolean>(DISMISSED_KEY)).toBe(true);
  });

  it("'Leave a review' opens the store and dismisses", async () => {
    const kv = makeKv();
    await kv.set(COUNT_KEY, 5);
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<ReviewPrompt />);
    const cta = await screen.findByRole("button", { name: /leave a review/i });
    fireEvent.click(cta);
    expect(open).toHaveBeenCalledTimes(1);
    const url = String(open.mock.calls[0][0]);
    expect(url).toContain("chromewebstore.google.com");
    expect(await kv.get<boolean>(DISMISSED_KEY)).toBe(true);
  });
});

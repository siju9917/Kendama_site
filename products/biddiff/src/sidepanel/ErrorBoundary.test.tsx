// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ErrorBoundary } from "./ErrorBoundary.js";

// A child that throws on first render, then (after the boundary resets and
// the flag is flipped) renders cleanly — lets us exercise the Recover path.
function Boom({ message }: { message: string }): React.ReactElement {
  throw new Error(message);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <div>healthy content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("healthy content")).toBeTruthy();
  });

  it("catches a render error and shows a recoverable alert (panel never blank)", () => {
    // React logs the caught error to console.error; silence it for a clean run.
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom message="kaboom" />
      </ErrorBoundary>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain("Something went wrong");
    // Reassures the user their data is safe + offers recovery.
    expect(alert.textContent).toContain("saved diffs are still safe");
    expect(screen.getByRole("button", { name: /recover/i })).toBeTruthy();
  });

  it("logs the error to the console (never remote — privacy boundary)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom message="diagnostic detail" />
      </ErrorBoundary>,
    );
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.flat().some((a) => a instanceof Error)).toBe(true);
  });

  it("truncates the shown technical detail (no long path/stack leak)", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const long = "X".repeat(1000);
    render(
      <ErrorBoundary>
        <Boom message={long} />
      </ErrorBoundary>,
    );
    const pre = document.querySelector("pre");
    expect(pre).toBeTruthy();
    // Shown detail is "Error: " + at most 240 message chars — far below 1000.
    expect((pre!.textContent ?? "").length).toBeLessThanOrEqual(260);
  });

  it("Recover re-renders the subtree, then shows healthy content once it stops throwing", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    // A child controlled by module-level state so we can stop it throwing
    // between the error render and the Recover click.
    let shouldThrow = true;
    function Toggling(): React.ReactElement {
      if (shouldThrow) throw new Error("transient");
      return <div>recovered content</div>;
    }

    render(
      <ErrorBoundary>
        <Toggling />
      </ErrorBoundary>,
    );
    // Errored surface is shown.
    expect(screen.getByRole("alert")).toBeTruthy();

    // The underlying cause is resolved, then the user clicks Recover.
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: /recover/i }));

    // reset() cleared the error; the boundary re-rendered the (now healthy)
    // child instead of staying permanently dead.
    expect(screen.getByText("recovered content")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

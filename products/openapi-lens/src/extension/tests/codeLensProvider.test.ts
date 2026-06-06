import { describe, it, expect, vi } from "vitest";

vi.mock("vscode", () => {
  class MockRange {
    constructor(
      public startLine: number,
      public startChar: number,
      public endLine: number,
      public endChar: number,
    ) {}
  }
  class MockCodeLens {
    public command: unknown;
    constructor(public range: MockRange) {}
  }
  class MockEventEmitter<T> {
    private _listeners: Array<(e: T) => void> = [];
    get event() {
      return (listener: (e: T) => void) => {
        this._listeners.push(listener);
        return { dispose: () => {} };
      };
    }
    fire(e: T) {
      this._listeners.forEach((l) => l(e));
    }
    dispose() {
      this._listeners = [];
    }
  }
  return {
    Range: MockRange,
    CodeLens: MockCodeLens,
    EventEmitter: MockEventEmitter,
  };
});

import { OpenApiCodeLensProvider } from "../providers/codeLensProvider.js";
import type { BreakingChange } from "../../engine/types.js";
import type * as vscode from "vscode";

function makeDoc(): vscode.TextDocument {
  return {} as vscode.TextDocument;
}

function makeBreaking(): BreakingChange {
  return {
    severity: "BREAKING",
    type: "endpoint-removed",
    path: "/users",
    method: "get",
    location: "paths./users.get",
    message: "Endpoint removed",
    before: null,
    after: null,
  };
}

function makeInfo(): BreakingChange {
  return { ...makeBreaking(), severity: "INFO", type: "endpoint-added", message: "Endpoint added" };
}

describe("OpenApiCodeLensProvider", () => {
  describe("no-baseline state (initial / after clear)", () => {
    it("starts in no-baseline state", () => {
      const provider = new OpenApiCodeLensProvider();
      const lenses = provider.provideCodeLenses(makeDoc());
      expect(lenses).toHaveLength(1);
      // @ts-expect-error accessing .command on mock
      expect(lenses[0]!.command.title).toContain("Set baseline");
      // @ts-expect-error accessing .command on mock
      expect(lenses[0]!.command.command).toBe("openapi-lens.selectBaseline");
    });

    it("returns to no-baseline after clear()", () => {
      const provider = new OpenApiCodeLensProvider();
      provider.update([makeBreaking()]);
      provider.clear();
      const lenses = provider.provideCodeLenses(makeDoc());
      // @ts-expect-error accessing .command on mock
      expect(lenses[0]!.command.title).toContain("Set baseline");
    });

    it("returns to no-baseline after setNoBaseline()", () => {
      const provider = new OpenApiCodeLensProvider();
      provider.update([makeBreaking()]);
      provider.setNoBaseline();
      const lenses = provider.provideCodeLenses(makeDoc());
      // @ts-expect-error accessing .command on mock
      expect(lenses[0]!.command.title).toContain("Set baseline");
    });
  });

  describe("clean state (baseline set, no changes)", () => {
    it("shows 'No breaking changes' when update called with empty array", () => {
      const provider = new OpenApiCodeLensProvider();
      provider.update([]);
      const lenses = provider.provideCodeLenses(makeDoc());
      // @ts-expect-error accessing .command on mock
      expect(lenses[0]!.command.title).toContain("No breaking changes");
    });
  });

  describe("changes state", () => {
    it("shows BREAKING count when only BREAKING changes", () => {
      const provider = new OpenApiCodeLensProvider();
      provider.update([makeBreaking(), makeBreaking()]);
      const lenses = provider.provideCodeLenses(makeDoc());
      // @ts-expect-error accessing .command on mock
      expect(lenses[0]!.command.title).toContain("2 BREAKING");
    });

    it("shows INFO count when only INFO changes", () => {
      const provider = new OpenApiCodeLensProvider();
      provider.update([makeInfo()]);
      const lenses = provider.provideCodeLenses(makeDoc());
      // @ts-expect-error accessing .command on mock
      expect(lenses[0]!.command.title).toContain("1 INFO");
    });

    it("shows both BREAKING and INFO counts", () => {
      const provider = new OpenApiCodeLensProvider();
      provider.update([makeBreaking(), makeInfo(), makeInfo()]);
      const lenses = provider.provideCodeLenses(makeDoc());
      // @ts-expect-error accessing .command on mock
      const title: string = lenses[0]!.command.title;
      expect(title).toContain("1 BREAKING");
      expect(title).toContain("2 INFO");
    });

    it("command is openapi-lens.showChangePanel to open the details panel", () => {
      const provider = new OpenApiCodeLensProvider();
      provider.update([makeBreaking()]);
      const lenses = provider.provideCodeLenses(makeDoc());
      // @ts-expect-error accessing .command on mock
      expect(lenses[0]!.command.command).toBe("openapi-lens.showChangePanel");
    });
  });

  it("fires onDidChangeCodeLenses when state changes", () => {
    const provider = new OpenApiCodeLensProvider();
    const fired: unknown[] = [];
    provider.onDidChangeCodeLenses(() => fired.push(true));
    provider.update([makeBreaking()]);
    provider.clear();
    provider.setNoBaseline();
    expect(fired.length).toBeGreaterThanOrEqual(3);
  });
});

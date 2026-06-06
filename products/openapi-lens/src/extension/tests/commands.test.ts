import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommandContext } from "../commands.js";

const commandHandlers = new Map<string, (...args: unknown[]) => unknown>();

vi.mock("vscode", () => {
  return {
    commands: {
      registerCommand: vi.fn((name: string, handler: (...args: unknown[]) => unknown) => {
        commandHandlers.set(name, handler);
        return { dispose: vi.fn() };
      }),
    },
    window: {
      showInformationMessage: vi.fn(),
      showOpenDialog: vi.fn().mockResolvedValue(null),
    },
    workspace: {
      getConfiguration: vi.fn(() => ({
        update: vi.fn().mockResolvedValue(undefined),
      })),
      fs: {
        readFile: vi.fn().mockResolvedValue(new Uint8Array()),
      },
    },
    ConfigurationTarget: { Workspace: 1 },
    Uri: { file: vi.fn((p: string) => ({ fsPath: p })) },
  };
});

import * as vscode from "vscode";
import { registerCommands } from "../commands.js";

const mockContext = {
  subscriptions: { push: vi.fn() },
} as unknown as vscode.ExtensionContext;

function makeCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    onBaselineSelected: vi.fn(),
    onBaselineCleared: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  commandHandlers.clear();
  vi.clearAllMocks();
});

describe("registerCommands — clearBaseline", () => {
  it("calls onBaselineCleared even when config.update throws (no workspace scenario)", async () => {
    const updateFn = vi.fn().mockRejectedValue(new Error("no workspace"));
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      update: updateFn,
      get: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    const ctx = makeCtx();
    registerCommands(mockContext, ctx);

    const handler = commandHandlers.get("openapi-lens.clearBaseline");
    expect(handler).toBeDefined();
    await handler?.();

    expect(ctx.onBaselineCleared).toHaveBeenCalledOnce();
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });

  it("calls onBaselineCleared after config.update succeeds", async () => {
    const updateFn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      update: updateFn,
      get: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    const ctx = makeCtx();
    registerCommands(mockContext, ctx);

    const handler = commandHandlers.get("openapi-lens.clearBaseline");
    await handler?.();

    expect(updateFn).toHaveBeenCalledWith("baselineFile", "", 1); // ConfigurationTarget.Workspace = 1
    expect(ctx.onBaselineCleared).toHaveBeenCalledOnce();
  });
});

describe("registerCommands — selectBaseline", () => {
  it("does not call onBaselineSelected when user cancels the file dialog", async () => {
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValue(undefined);

    const ctx = makeCtx();
    registerCommands(mockContext, ctx);

    const handler = commandHandlers.get("openapi-lens.selectBaseline");
    await handler?.();

    expect(ctx.onBaselineSelected).not.toHaveBeenCalled();
  });
});

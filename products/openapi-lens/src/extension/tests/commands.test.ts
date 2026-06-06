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
      showErrorMessage: vi.fn(),
      showOpenDialog: vi.fn().mockResolvedValue(null),
    },
    workspace: {
      getConfiguration: vi.fn(() => ({
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn(),
      })),
      fs: {
        readFile: vi.fn().mockResolvedValue(new Uint8Array()),
      },
    },
    ConfigurationTarget: { Workspace: 1 },
    Uri: { file: vi.fn((p: string) => ({ fsPath: p })) },
  };
});

// Mock fs/promises so fileBaseline.ts doesn't touch the real filesystem.
vi.mock("fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue("openapi: '3.0.3'\ninfo: {title: T, version: '1'}"),
}));

import * as vscode from "vscode";
import * as fsMod from "fs/promises";
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
  // Restore fs.readFile default after each test.
  vi.mocked(fsMod.readFile).mockResolvedValue(
    "openapi: '3.0.3'\ninfo: {title: T, version: '1'}" as unknown as Buffer,
  );
});

// ─── clearBaseline ──────────────────────────────────────────────────────────

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

  it("removes the baselineFile key from workspace settings (uses undefined, not empty string) and calls onBaselineCleared", async () => {
    const updateFn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      update: updateFn,
      get: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    const ctx = makeCtx();
    registerCommands(mockContext, ctx);

    const handler = commandHandlers.get("openapi-lens.clearBaseline");
    await handler?.();

    // F1-1 fix: must pass undefined (not "") so VS Code removes the key from settings.json.
    expect(updateFn).toHaveBeenCalledWith("baselineFile", undefined, 1); // ConfigurationTarget.Workspace = 1
    expect(ctx.onBaselineCleared).toHaveBeenCalledOnce();
  });
});

// ─── selectBaseline ─────────────────────────────────────────────────────────

describe("registerCommands — selectBaseline", () => {
  it("does not call onBaselineSelected when user cancels the file dialog", async () => {
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValue(undefined);

    const ctx = makeCtx();
    registerCommands(mockContext, ctx);

    const handler = commandHandlers.get("openapi-lens.selectBaseline");
    await handler?.();

    expect(ctx.onBaselineSelected).not.toHaveBeenCalled();
  });

  it("does not call config.update when user cancels the file dialog", async () => {
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValue(undefined);
    const updateFn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      update: updateFn,
      get: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    const ctx = makeCtx();
    registerCommands(mockContext, ctx);

    const handler = commandHandlers.get("openapi-lens.selectBaseline");
    await handler?.();

    expect(updateFn).not.toHaveBeenCalled();
  });

  it("persists the file path to workspace settings (POLISH N1) when a file is picked", async () => {
    const fakePath = "/workspace/api-baseline.yaml";
    const fakeContent = "openapi: '3.0.3'\ninfo: {title: T, version: '1'}";
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
      { fsPath: fakePath } as vscode.Uri,
    ]);
    vi.mocked(fsMod.readFile).mockResolvedValue(fakeContent as unknown as Buffer);
    const updateFn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      update: updateFn,
      get: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    const ctx = makeCtx();
    registerCommands(mockContext, ctx);

    const handler = commandHandlers.get("openapi-lens.selectBaseline");
    await handler?.();

    // N1 core assertion: path persisted so baseline survives VS Code reloads.
    expect(updateFn).toHaveBeenCalledWith("baselineFile", fakePath, 1);
    expect(ctx.onBaselineSelected).toHaveBeenCalledWith(fakeContent);
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });

  it("still calls onBaselineSelected even when config.update throws (no workspace open)", async () => {
    const fakePath = "/home/user/api-baseline.yaml";
    const fakeContent = "openapi: '3.0.3'";
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
      { fsPath: fakePath } as vscode.Uri,
    ]);
    vi.mocked(fsMod.readFile).mockResolvedValue(fakeContent as unknown as Buffer);
    const updateFn = vi.fn().mockRejectedValue(new Error("no workspace"));
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      update: updateFn,
      get: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    const ctx = makeCtx();
    registerCommands(mockContext, ctx);

    const handler = commandHandlers.get("openapi-lens.selectBaseline");
    await handler?.();

    // Persistence failed but in-memory baseline still set — extension degrades gracefully.
    expect(ctx.onBaselineSelected).toHaveBeenCalledWith(fakeContent);
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });
});

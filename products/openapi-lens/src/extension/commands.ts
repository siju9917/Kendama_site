import * as vscode from "vscode";
import { pickBaselineFile } from "./baseline/fileBaseline.js";

export interface CommandContext {
  onBaselineSelected(content: string): void;
  onBaselineCleared(): void;
}

export function registerCommands(
  context: vscode.ExtensionContext,
  ctx: CommandContext,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "openapi-lens.selectBaseline",
      async () => {
        const picked = await pickBaselineFile();
        if (picked !== null) {
          // Persist the file path so the baseline survives VS Code reloads.
          try {
            const config = vscode.workspace.getConfiguration("openapi-lens");
            await config.update("baselineFile", picked.path, vscode.ConfigurationTarget.Workspace);
          } catch {
            // No workspace open — path can't be persisted, but in-memory state still works.
          }
          ctx.onBaselineSelected(picked.content);
          void vscode.window.showInformationMessage(
            "OpenAPI Lens: Baseline file loaded.",
          );
        }
      },
    ),
    vscode.commands.registerCommand("openapi-lens.clearBaseline", async () => {
      // Clear the persisted workspace setting if a workspace is open (best-effort).
      try {
        const config = vscode.workspace.getConfiguration("openapi-lens");
        // Use undefined to remove the key entirely (VS Code convention for clearing a setting).
        await config.update("baselineFile", undefined, vscode.ConfigurationTarget.Workspace);
      } catch {
        // No workspace open — setting can't be persisted, but in-memory state still clears.
      }
      ctx.onBaselineCleared();
      void vscode.window.showInformationMessage(
        "OpenAPI Lens: Baseline cleared. Using git HEAD.",
      );
    }),
  );
}

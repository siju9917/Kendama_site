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
        const content = await pickBaselineFile();
        if (content !== null) {
          const config = vscode.workspace.getConfiguration("openapi-lens");
          // Persist the choice so it survives reload.
          ctx.onBaselineSelected(content);
          await config.update(
            "baselineFile",
            "",
            vscode.ConfigurationTarget.Workspace,
          );
          void vscode.window.showInformationMessage(
            "OpenAPI Lens: Baseline file loaded.",
          );
        }
      },
    ),
    vscode.commands.registerCommand("openapi-lens.clearBaseline", async () => {
      const config = vscode.workspace.getConfiguration("openapi-lens");
      await config.update(
        "baselineFile",
        "",
        vscode.ConfigurationTarget.Workspace,
      );
      ctx.onBaselineCleared();
      void vscode.window.showInformationMessage(
        "OpenAPI Lens: Baseline cleared. Using git HEAD.",
      );
    }),
  );
}

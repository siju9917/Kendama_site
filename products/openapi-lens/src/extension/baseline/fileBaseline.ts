import * as vscode from "vscode";
import * as fs from "fs/promises";

/**
 * Shows an open-file dialog and returns the contents of the chosen file.
 * Returns null if the user cancels or the read fails.
 */
export async function pickBaselineFile(): Promise<string | null> {
  const uris = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: { "OpenAPI spec": ["yaml", "yml", "json"] },
    title: "Select baseline OpenAPI spec",
  });
  if (!uris || uris.length === 0) return null;
  const uri = uris[0];
  if (!uri) return null;
  try {
    return await fs.readFile(uri.fsPath, "utf-8");
  } catch {
    void vscode.window.showErrorMessage(
      `OpenAPI Lens: Could not read baseline file: ${uri.fsPath}`,
    );
    return null;
  }
}

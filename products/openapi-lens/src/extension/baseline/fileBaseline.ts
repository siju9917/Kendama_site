import * as vscode from "vscode";
import * as fs from "fs/promises";

export interface PickedBaseline {
  /** Absolute path to the file on disk — persisted to workspace settings. */
  path: string;
  /** File contents at the moment of picking. */
  content: string;
}

/**
 * Shows an open-file dialog and returns the path + contents of the chosen file.
 * Returns null if the user cancels or the read fails.
 */
export async function pickBaselineFile(): Promise<PickedBaseline | null> {
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
    const content = await fs.readFile(uri.fsPath, "utf-8");
    return { path: uri.fsPath, content };
  } catch {
    void vscode.window.showErrorMessage(
      `OpenAPI Lens: Could not read baseline file: ${uri.fsPath}`,
    );
    return null;
  }
}

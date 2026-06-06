import * as vscode from "vscode";
import * as path from "path";

interface GitExtensionAPI {
  getRepository(uri: vscode.Uri): GitRepository | null;
}

interface GitRepository {
  rootUri: vscode.Uri;
  show(ref: string, filePath: string): Promise<string>;
}

interface GitExtension {
  getAPI(version: 1): GitExtensionAPI;
}

/**
 * Fetches the content of the given document as it exists at HEAD in git.
 * Returns null if the git extension is unavailable or the file is untracked.
 */
export async function fetchGitHeadContent(
  document: vscode.TextDocument,
): Promise<string | null> {
  try {
    const ext = vscode.extensions.getExtension<GitExtension>("vscode.git");
    if (!ext) return null;
    if (!ext.isActive) await ext.activate();
    const git = ext.exports.getAPI(1);
    const repo = git.getRepository(document.uri);
    if (!repo) return null;
    const relPath = path.relative(repo.rootUri.fsPath, document.uri.fsPath);
    return await repo.show("HEAD", relPath);
  } catch {
    return null;
  }
}

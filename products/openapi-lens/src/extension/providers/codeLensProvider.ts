import * as vscode from "vscode";
import type { BreakingChange } from "../../engine/types.js";

export class OpenApiCodeLensProvider implements vscode.CodeLensProvider {
  private _changes: BreakingChange[] = [];
  private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  update(changes: BreakingChange[]): void {
    this._changes = changes;
    this._onDidChangeCodeLenses.fire();
  }

  clear(): void {
    this._changes = [];
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(_document: vscode.TextDocument): vscode.CodeLens[] {
    if (this._changes.length === 0) {
      const lens = new vscode.CodeLens(new vscode.Range(0, 0, 0, 0));
      lens.command = {
        title: "OpenAPI Lens: No changes detected",
        command: "",
      };
      return [lens];
    }
    const breaking = this._changes.filter((c) => c.severity === "BREAKING").length;
    const info = this._changes.filter((c) => c.severity === "INFO").length;
    const parts: string[] = [];
    if (breaking > 0) parts.push(`${breaking} BREAKING`);
    if (info > 0) parts.push(`${info} INFO`);
    const lens = new vscode.CodeLens(new vscode.Range(0, 0, 0, 0));
    lens.command = {
      title: `OpenAPI Lens: ${parts.join(", ")}`,
      command: "openapi-lens.selectBaseline",
      tooltip: "Click to change baseline",
    };
    return [lens];
  }

  dispose(): void {
    this._onDidChangeCodeLenses.dispose();
  }
}

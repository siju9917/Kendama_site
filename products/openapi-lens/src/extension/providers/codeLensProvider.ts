import * as vscode from "vscode";
import type { BreakingChange } from "../../engine/types.js";

type CodeLensState =
  | { kind: "no-baseline" }
  | { kind: "clean" }
  | { kind: "changes"; changes: BreakingChange[] };

export class OpenApiCodeLensProvider implements vscode.CodeLensProvider {
  private _state: CodeLensState = { kind: "no-baseline" };
  private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  update(changes: BreakingChange[]): void {
    this._state =
      changes.length === 0 ? { kind: "clean" } : { kind: "changes", changes };
    this._onDidChangeCodeLenses.fire();
  }

  setNoBaseline(): void {
    this._state = { kind: "no-baseline" };
    this._onDidChangeCodeLenses.fire();
  }

  clear(): void {
    this._state = { kind: "no-baseline" };
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(_document: vscode.TextDocument): vscode.CodeLens[] {
    const range = new vscode.Range(0, 0, 0, 0);

    if (this._state.kind === "no-baseline") {
      const lens = new vscode.CodeLens(range);
      lens.command = {
        title: "OpenAPI Lens: Set baseline to enable diff",
        command: "openapi-lens.selectBaseline",
        tooltip: "Click to choose a baseline OpenAPI spec for comparison",
      };
      return [lens];
    }

    if (this._state.kind === "clean") {
      const lens = new vscode.CodeLens(range);
      lens.command = {
        title: "OpenAPI Lens: No breaking changes",
        command: "",
      };
      return [lens];
    }

    const { changes } = this._state;
    const breaking = changes.filter((c) => c.severity === "BREAKING").length;
    const info = changes.filter((c) => c.severity === "INFO").length;
    const parts: string[] = [];
    if (breaking > 0) parts.push(`${breaking} BREAKING`);
    if (info > 0) parts.push(`${info} INFO`);
    const lens = new vscode.CodeLens(range);
    lens.command = {
      title: `OpenAPI Lens: ${parts.join(", ")} — click to view details`,
      command: "openapi-lens.showChangePanel",
      tooltip: "Open the full breaking-change panel",
    };
    return [lens];
  }

  dispose(): void {
    this._onDidChangeCodeLenses.dispose();
  }
}

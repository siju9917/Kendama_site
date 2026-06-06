import type * as vscode from "vscode";

/** Returns true if the raw text looks like an OpenAPI or Swagger document. */
export function isOpenApiText(text: string): boolean {
  // Match "openapi:" or "swagger:" at the start of a YAML line, or as a JSON key.
  return /^\s*(openapi|swagger)\s*:/m.test(text) || /"(openapi|swagger)"\s*:/.test(text);
}

export function isOpenApiDocument(document: vscode.TextDocument): boolean {
  return isOpenApiText(document.getText());
}

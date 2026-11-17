import * as vscode from 'vscode';
import { RenderedMarkdownEditorProvider, VIEW_TYPE } from './editorProvider';
import { registerToggle } from './toggle';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new RenderedMarkdownEditorProvider(context);
  registerToggle(context, provider);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(VIEW_TYPE, provider, {
      supportsMultipleEditorsPerDocument: true,
    }),
  );
}

export function deactivate(): void {}

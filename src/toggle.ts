import * as vscode from 'vscode';
import { RenderedMarkdownEditorProvider, VIEW_TYPE, forceRendered } from './editorProvider';

type RenderedTab = vscode.Tab & { input: vscode.TabInputCustom };
type TextTab = vscode.Tab & { input: vscode.TabInputText };

function isRenderedTab(tab: vscode.Tab): tab is RenderedTab {
  return tab.input instanceof vscode.TabInputCustom && tab.input.viewType === VIEW_TYPE;
}

function isMarkdownTextTab(tab: vscode.Tab): tab is TextTab {
  return tab.input instanceof vscode.TabInputText && /\.(md|markdown)$/i.test(tab.input.uri.path);
}

function allTabs(): vscode.Tab[] {
  return vscode.window.tabGroups.all.flatMap((group) => group.tabs);
}

function sameUri(a: vscode.Uri, b: vscode.Uri): boolean {
  return a.toString() === b.toString();
}

/** Pencil: open the file in VS Code's text editor next to the rendered view, which stays open. */
async function editBeside(rendered: RenderedTab): Promise<void> {
  const uri = rendered.input.uri;
  // Reuse a text editor for this file if one is already open in another group.
  const existing = allTabs().find(
    (t) => isMarkdownTextTab(t) && sameUri(t.input.uri, uri) && t.group !== rendered.group,
  );
  await vscode.window.showTextDocument(uri, {
    viewColumn: existing ? existing.group.viewColumn : vscode.ViewColumn.Beside,
    preview: false,
  });
}

/** From the text editor: go back to the rendered view (focusing it if it is already open). */
async function backToRendered(text: TextTab): Promise<void> {
  const uri = text.input.uri;
  const rendered = allTabs().find((t) => isRenderedTab(t) && sameUri(t.input.uri, uri));
  if (rendered) {
    await vscode.commands.executeCommand('vscode.openWith', uri, VIEW_TYPE, {
      viewColumn: rendered.group.viewColumn,
    });
  } else {
    forceRendered.add(uri.toString());
    await vscode.commands.executeCommand('vscode.openWith', uri, VIEW_TYPE, {
      viewColumn: text.group.viewColumn,
      preview: text.isPreview,
    });
  }
  try {
    await vscode.window.tabGroups.close(text);
  } catch {
    // A preview tab is replaced in place by openWith, so the old tab no longer exists.
  }
}

function activeTab(): vscode.Tab | undefined {
  return vscode.window.tabGroups.activeTabGroup.activeTab;
}

export function registerToggle(context: vscode.ExtensionContext, provider: RenderedMarkdownEditorProvider): void {
  context.subscriptions.push(
    // Rendered view: switch Rendered / Source in place. Text editor: back to the rendered view.
    vscode.commands.registerCommand('inkstand.toggle', async () => {
      const tab = activeTab();
      if (!tab) return;
      if (isRenderedTab(tab)) provider.toggleActiveMode();
      else if (isMarkdownTextTab(tab)) await backToRendered(tab);
    }),
    vscode.commands.registerCommand('inkstand.editSource', async () => {
      const tab = activeTab();
      if (tab && isRenderedTab(tab)) await editBeside(tab);
    }),
    vscode.commands.registerCommand('inkstand.showRendered', async () => {
      const tab = activeTab();
      if (tab && isMarkdownTextTab(tab)) await backToRendered(tab);
    }),
  );
}

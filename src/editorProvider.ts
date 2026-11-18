import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import { classifyLink } from './links';
import { renderMarkdown, renderSource } from './render';
import { setTaskChecked } from './tasks';
import { buildHtml } from './webviewHtml';

export const VIEW_TYPE = 'inkstand.editor';

const UPDATE_DEBOUNCE_MS = 150;
/** After the preview scrolls the text editor, its own scroll events are not echoed back for this long. */
const SYNC_ECHO_MS = 150;

const setting = <T>(name: string, fallback: T): T =>
  vscode.workspace.getConfiguration('inkstand').get<T>(name, fallback);

/** URIs (as strings) the user explicitly asked to open rendered even when inkstand.enabled is false. */
export const forceRendered = new Set<string>();

function isInside(child: vscode.Uri, parent: vscode.Uri): boolean {
  return (
    child.scheme === parent.scheme &&
    child.authority === parent.authority &&
    (child.path === parent.path || child.path.startsWith(parent.path.replace(/\/$/, '') + '/'))
  );
}

export class RenderedMarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  private activePanel: vscode.WebviewPanel | undefined;
  /** Open rendered panels, by document URI. */
  private readonly panels = new Map<string, Set<vscode.WebviewPanel>>();
  /** Heading to scroll to, by document URI, taken by the next page that panel builds. */
  private readonly pendingAnchors = new Map<string, string>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  /** Switches the focused rendered panel between "Rendered" and "Source". Returns false if none is focused. */
  toggleActiveMode(): boolean {
    if (!this.activePanel?.active) return false;
    void this.activePanel.webview.postMessage({ type: 'toggleMode' });
    return true;
  }

  /** Opens a linked Markdown file rendered in the active group, scrolled to `anchor` if given. */
  private async openMarkdown(uri: vscode.Uri, anchor: string | undefined): Promise<void> {
    const key = uri.toString();
    const column = vscode.window.tabGroups.activeTabGroup.viewColumn;
    // openWith focuses a rendered panel already in the active group instead of creating one.
    const existing = [...(this.panels.get(key) ?? [])].find((p) => p.viewColumn === column);
    // A link is an explicit request for the rendered view, even when inkstand.enabled is false.
    if (!existing) forceRendered.add(key);
    // A visible page is not rebuilt, so it gets a message; a new or hidden one reads the pending anchor.
    const message = anchor !== undefined && existing?.visible === true;
    if (anchor !== undefined && !message) this.pendingAnchors.set(key, anchor);
    await vscode.commands.executeCommand('vscode.openWith', uri, VIEW_TYPE);
    if (message && existing) void existing.webview.postMessage({ type: 'reveal', id: anchor });
  }

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): void {
    // The toggle command marks a document as explicitly requested in rendered mode.
    const forced = forceRendered.delete(document.uri.toString());
    if (!forced && !setting('enabled', true)) {
      void vscode.commands
        .executeCommand('vscode.openWith', document.uri, 'default', { viewColumn: panel.viewColumn })
        .then(() => panel.dispose());
      return;
    }

    const docDir = vscode.Uri.joinPath(document.uri, '..');
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)?.uri;
    const mediaRoot = vscode.Uri.joinPath(this.context.extensionUri, 'media');
    const distRoot = vscode.Uri.joinPath(this.context.extensionUri, 'dist');
    const imageRoots = [docDir, ...(workspaceFolder ? [workspaceFolder] : [])];
    const webview = panel.webview;

    webview.options = { enableScripts: true, localResourceRoots: [mediaRoot, distRoot, ...imageRoots] };

    const resolveRelative = (path: string): vscode.Uri => {
      const base = path.startsWith('/') && workspaceFolder ? workspaceFolder : docDir;
      return vscode.Uri.joinPath(base, ...path.split('/').filter((s) => s !== ''));
    };

    const render = () =>
      renderMarkdown(document.getText(), {
        resolveImage(src) {
          const target = resolveRelative(src);
          if (!imageRoots.some((root) => isInside(target, root))) return undefined;
          return webview.asWebviewUri(target).toString();
        },
      });

    const key = document.uri.toString();
    const title = document.uri.path.split('/').pop() ?? '';
    const takeAnchor = () => {
      const anchor = this.pendingAnchors.get(key);
      this.pendingAnchors.delete(key);
      return anchor;
    };
    const buildPage = () =>
      buildHtml({
        title,
        body: render(),
        source: renderSource(document.getText()),
        cspSource: webview.cspSource,
        nonce: randomBytes(16).toString('hex'),
        styleUri: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'style.css')).toString(),
        scriptUri: webview.asWebviewUri(vscode.Uri.joinPath(distRoot, 'webview.js')).toString(),
        anchor: takeAnchor(),
      });
    webview.html = buildPage();

    const siblings = this.panels.get(key) ?? new Set<vscode.WebviewPanel>();
    siblings.add(panel);
    this.panels.set(key, siblings);

    if (panel.active) this.activePanel = panel;
    let wasVisible = panel.visible;
    const viewStateSub = panel.onDidChangeViewState((e) => {
      if (e.webviewPanel.active) this.activePanel = panel;
      // A hidden webview is destroyed and rebuilt from its stored html, and messages sent while it
      // is hidden are lost: refresh the stored html when the panel comes back from hidden.
      if (e.webviewPanel.visible && !wasVisible) webview.html = buildPage();
      wasVisible = e.webviewPanel.visible;
    });

    const refresh = () =>
      webview.postMessage({ type: 'update', html: render(), source: renderSource(document.getText()) });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== key) return;
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), UPDATE_DEBOUNCE_MS);
    });

    /** Writes a checkbox click to the file; if that is not possible, the page is refreshed to undo the click. */
    const toggleTask = async (line: number, checked: boolean): Promise<void> => {
      const text = line < document.lineCount ? document.lineAt(line).text : '';
      const updated = setTaskChecked(text, checked);
      if (updated === undefined || updated === text) {
        void refresh();
        return;
      }
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, document.lineAt(line).range, updated);
      if (!(await vscode.workspace.applyEdit(edit))) void refresh();
    };

    // Scroll sync: the text editor's first visible line drives the preview, and the other way round.
    let ignoreEditorUntil = 0;
    const textEditors = () => vscode.window.visibleTextEditors.filter((e) => e.document.uri.toString() === key);
    const rangesSub = vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
      if (e.textEditor.document.uri.toString() !== key || !panel.visible || e.visibleRanges.length === 0) return;
      if (Date.now() < ignoreEditorUntil || !setting('scrollSync', true)) return;
      void webview.postMessage({
        type: 'syncScroll',
        line: e.visibleRanges[0].start.line,
        lineCount: e.textEditor.document.lineCount,
      });
    });

    const messageSub = webview.onDidReceiveMessage((message: unknown) => {
      const m = message as { type?: string; href?: unknown; line?: unknown; checked?: unknown };
      const line = typeof m?.line === 'number' && Number.isFinite(m.line) ? Math.max(0, Math.floor(m.line)) : undefined;
      if (m?.type === 'edit' || (m?.type === 'dblclick' && setting('doubleClickToEdit', true))) {
        void vscode.commands.executeCommand('inkstand.editSource', { line });
        return;
      }
      if (m?.type === 'toggleTask') {
        if (line !== undefined && typeof m.checked === 'boolean') void toggleTask(line, m.checked);
        return;
      }
      if (m?.type === 'revealLine') {
        if (line === undefined || !setting('scrollSync', true)) return;
        const editors = textEditors();
        if (editors.length === 0) return;
        ignoreEditorUntil = Date.now() + SYNC_ECHO_MS;
        const range = new vscode.Range(line, 0, line, 0);
        for (const editor of editors) editor.revealRange(range, vscode.TextEditorRevealType.AtTop);
        return;
      }
      if (m?.type !== 'openLink' || typeof m.href !== 'string') return;
      const target = classifyLink(m.href);
      switch (target.kind) {
        case 'external':
          void vscode.env.openExternal(vscode.Uri.parse(target.url));
          break;
        case 'markdown':
          void this.openMarkdown(resolveRelative(target.path), target.anchor);
          break;
        case 'file':
          void vscode.commands.executeCommand('vscode.open', resolveRelative(target.path));
          break;
        default:
          break;
      }
    });

    panel.onDidDispose(() => {
      if (this.activePanel === panel) this.activePanel = undefined;
      siblings.delete(panel);
      if (siblings.size === 0 && this.panels.get(key) === siblings) this.panels.delete(key);
      clearTimeout(timer);
      changeSub.dispose();
      messageSub.dispose();
      rangesSub.dispose();
      viewStateSub.dispose();
    });
  }
}

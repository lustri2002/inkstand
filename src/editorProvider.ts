import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import { classifyLink } from './links';
import { renderMarkdown, renderSource } from './render';
import { buildHtml } from './webviewHtml';

export const VIEW_TYPE = 'inkstand.editor';

const UPDATE_DEBOUNCE_MS = 150;

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

  constructor(private readonly context: vscode.ExtensionContext) {}

  /** Switches the focused rendered panel between "Rendered" and "Source". Returns false if none is focused. */
  toggleActiveMode(): boolean {
    if (!this.activePanel?.active) return false;
    void this.activePanel.webview.postMessage({ type: 'toggleMode' });
    return true;
  }

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): void {
    // The toggle command marks a document as explicitly requested in rendered mode.
    const forced = forceRendered.delete(document.uri.toString());
    if (!forced && !vscode.workspace.getConfiguration('inkstand').get<boolean>('enabled', true)) {
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

    const title = document.uri.path.split('/').pop() ?? '';
    const buildPage = () =>
      buildHtml({
        title,
        body: render(),
        source: renderSource(document.getText()),
        cspSource: webview.cspSource,
        nonce: randomBytes(16).toString('hex'),
        styleUri: webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'style.css')).toString(),
        scriptUri: webview.asWebviewUri(vscode.Uri.joinPath(distRoot, 'webview.js')).toString(),
      });
    webview.html = buildPage();

    if (panel.active) this.activePanel = panel;
    let wasVisible = panel.visible;
    const viewStateSub = panel.onDidChangeViewState((e) => {
      if (e.webviewPanel.active) this.activePanel = panel;
      // A hidden webview is destroyed and rebuilt from its stored html, and messages sent while it
      // is hidden are lost: refresh the stored html when the panel comes back from hidden.
      if (e.webviewPanel.visible && !wasVisible) webview.html = buildPage();
      wasVisible = e.webviewPanel.visible;
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      clearTimeout(timer);
      timer = setTimeout(
        () => webview.postMessage({ type: 'update', html: render(), source: renderSource(document.getText()) }),
        UPDATE_DEBOUNCE_MS,
      );
    });

    const messageSub = webview.onDidReceiveMessage((message: unknown) => {
      const m = message as { type?: string; href?: unknown };
      if (m?.type === 'edit') {
        void vscode.commands.executeCommand('inkstand.editSource');
        return;
      }
      if (m?.type !== 'openLink' || typeof m.href !== 'string') return;
      const target = classifyLink(m.href);
      switch (target.kind) {
        case 'external':
          void vscode.env.openExternal(vscode.Uri.parse(target.url));
          break;
        case 'markdown':
          void vscode.commands.executeCommand('vscode.openWith', resolveRelative(target.path), VIEW_TYPE);
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
      clearTimeout(timer);
      changeSub.dispose();
      messageSub.dispose();
      viewStateSub.dispose();
    });
  }
}

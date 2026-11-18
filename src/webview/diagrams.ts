/**
 * Mermaid diagrams. The renderer emits <pre class="mermaid"> with the diagram source; Mermaid (a large
 * script, shipped as dist/mermaid.min.js) is loaded only for pages that have one.
 */

interface Mermaid {
  initialize(config: Record<string, unknown>): void;
  run(options: { nodes: HTMLElement[]; suppressErrors?: boolean }): Promise<void>;
}

declare global {
  interface Window {
    mermaid?: Mermaid;
  }
}

let loading: Promise<Mermaid> | undefined;
/** Drawn SVGs by theme and source, so re-renders while typing reuse unchanged diagrams. */
let drawn = new Map<string, string>();
let initializedTheme: string | undefined;

function load(scriptUrl: string, nonce: string): Promise<Mermaid> {
  loading ??= new Promise<Mermaid>((resolve, reject) => {
    const script = document.createElement('script');
    script.nonce = nonce;
    script.src = scriptUrl;
    script.onload = () => (window.mermaid ? resolve(window.mermaid) : reject(new Error('mermaid did not load')));
    script.onerror = () => reject(new Error('mermaid did not load'));
    document.head.append(script);
  });
  return loading;
}

function theme(): string {
  const classes = document.body.classList;
  const dark = classes.contains('vscode-dark') || (classes.contains('vscode-high-contrast') && !classes.contains('vscode-high-contrast-light'));
  return dark ? 'dark' : 'default';
}

/** Draws every diagram under `root`. Diagrams that fail keep showing their source. */
export async function renderDiagrams(root: HTMLElement, scriptUrl: string, nonce: string): Promise<void> {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('pre.mermaid'));
  if (nodes.length === 0 || !scriptUrl) return;
  const current = theme();
  const used = new Map<string, string>();
  const pending: HTMLElement[] = [];
  for (const node of nodes) {
    const source = node.dataset.source ?? node.textContent ?? '';
    node.dataset.source = source;
    const svg = drawn.get(`${current}\n${source}`);
    if (svg !== undefined) {
      node.innerHTML = svg;
      node.classList.add('mermaid-drawn');
      used.set(`${current}\n${source}`, svg);
    } else {
      node.textContent = source;
      node.classList.remove('mermaid-drawn', 'mermaid-error');
      node.removeAttribute('data-processed');
      pending.push(node);
    }
  }
  drawn = used;
  if (pending.length === 0) return;

  let mermaid: Mermaid;
  try {
    mermaid = await load(scriptUrl, nonce);
  } catch {
    pending.forEach((node) => node.classList.add('mermaid-error'));
    return;
  }
  if (initializedTheme !== current) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: current,
      fontFamily: getComputedStyle(document.body).fontFamily,
      suppressErrorRendering: true,
    });
    initializedTheme = current;
  }
  await mermaid.run({ nodes: pending, suppressErrors: true });
  for (const node of pending) {
    // The page may have been replaced while Mermaid was drawing.
    if (!node.isConnected) continue;
    const svg = node.querySelector('svg');
    if (svg) {
      node.classList.add('mermaid-drawn');
      drawn.set(`${current}\n${node.dataset.source ?? ''}`, node.innerHTML);
    } else {
      node.textContent = node.dataset.source ?? '';
      node.classList.add('mermaid-error');
    }
  }
}

/** Calls `onChange` when VS Code switches between a light and a dark theme. */
export function watchTheme(onChange: () => void): void {
  let last = theme();
  new MutationObserver(() => {
    const next = theme();
    if (next !== last) {
      last = next;
      onChange();
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

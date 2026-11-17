import { describe, expect, test } from 'vitest';
import { buildHtml } from '../src/webviewHtml';

const html = buildHtml({
  title: 'demo <x>.md',
  body: '<h1>Hi</h1>',
  source: '<span class="hljs-section"># Hi</span>',
  cspSource: 'CSP',
  nonce: 'abc',
  styleUri: 'vscode-resource://style.css',
  scriptUri: 'vscode-resource://webview.js',
});

describe('buildHtml', () => {
  test('uses the exact CSP from the spec', () => {
    expect(html).toContain(
      "default-src 'none'; img-src CSP https: data:; style-src CSP; font-src CSP; script-src 'nonce-abc'",
    );
  });

  test('has no unsafe-inline or unsafe-eval', () => {
    expect(html).not.toContain('unsafe-inline');
    expect(html).not.toContain('unsafe-eval');
  });

  test('wraps the body in #content', () => {
    expect(html).toContain('<div id="content"><h1>Hi</h1></div>');
  });

  test('puts the highlighted source in #source', () => {
    expect(html).toContain('<pre id="source" class="source-view hljs"><code><span class="hljs-section"># Hi</span></code></pre>');
  });

  test('toolbar shows the escaped title as the initial breadcrumb', () => {
    expect(html).toContain('<span id="breadcrumb" class="toolbar-title" data-title="demo &lt;x&gt;.md">demo &lt;x&gt;.md</span>');
  });

  test('has no initial anchor by default', () => {
    expect(html).toContain('<body class="mode-rendered">');
  });

  test('carries the escaped initial anchor on the body', () => {
    const withAnchor = buildHtml({
      title: 't',
      body: '',
      source: '',
      cspSource: 'CSP',
      nonce: 'abc',
      styleUri: 's',
      scriptUri: 'j',
      anchor: 'a"b<c',
    });
    expect(withAnchor).toContain('<body class="mode-rendered" data-anchor="a&quot;b&lt;c">');
  });

  test('toolbar has the position indicator', () => {
    expect(html).toContain('<span id="position" class="toolbar-position">Position 0%</span>');
  });

  test('toolbar has the table of contents toggle', () => {
    expect(html).toMatch(/<button[^>]*id="toc-toggle"[^>]*aria-pressed="false"[^>]*>Contents<\/button>/);
  });

  test('has an empty table of contents panel with a close button', () => {
    expect(html).toContain('<nav id="toc" aria-label="Contents">');
    expect(html).toMatch(/<button[^>]*id="toc-close"/);
    expect(html).toContain('<ul id="toc-list"></ul>');
  });

  test('toolbar has the two mode buttons and the edit button', () => {
    expect(html).toMatch(/<button[^>]*data-mode="rendered"[^>]*>Rendered<\/button>/);
    expect(html).toMatch(/<button[^>]*data-mode="source"[^>]*>Source<\/button>/);
    expect(html).toMatch(/<button[^>]*id="edit"/);
  });

  test('has no inline style attributes (blocked by the CSP)', () => {
    expect(html).not.toMatch(/\sstyle="/);
  });

  test('script tag carries the nonce', () => {
    expect(html).toMatch(/<script[^>]*nonce="abc"[^>]*src="vscode-resource:\/\/webview\.js"/);
  });
});

describe('buildHtml language', () => {
  test('the page is declared as English', () => {
    expect(html).toContain('<html lang="en">');
  });

  test('pencil and close buttons have English labels', () => {
    expect(html).toContain('title="Edit side by side" aria-label="Edit side by side"');
    expect(html).toContain('title="Close contents" aria-label="Close contents"');
  });
});

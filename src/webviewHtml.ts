function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const PENCIL_ICON =
  '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">' +
  '<path d="M11.1 1.6a1.6 1.6 0 0 1 2.3 0l1 1a1.6 1.6 0 0 1 0 2.3L5.6 13.7l-3.9 1 1-3.9 8.4-9.2z' +
  'M10.4 3.9l1.7 1.7" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';

export function buildHtml(a: {
  title: string;
  body: string;
  source: string;
  cspSource: string;
  nonce: string;
  styleUri: string;
  scriptUri: string;
  /** Heading id to scroll to once the page has loaded. */
  anchor?: string;
}): string {
  const anchorAttr = a.anchor ? ` data-anchor="${escapeHtml(a.anchor)}"` : '';
  const csp =
    `default-src 'none'; img-src ${a.cspSource} https: data:; ` +
    `style-src ${a.cspSource}; font-src ${a.cspSource}; script-src 'nonce-${a.nonce}'`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${a.styleUri}">
</head>
<body class="mode-rendered"${anchorAttr}>
<header class="toolbar">
<div class="toolbar-status">
<span id="breadcrumb" class="toolbar-title" data-title="${escapeHtml(a.title)}">${escapeHtml(a.title)}</span>
<span id="position" class="toolbar-position">Position 0%</span>
</div>
<div class="toolbar-actions">
<button type="button" id="toc-toggle" class="pill-button" aria-pressed="false">Contents</button>
<div class="segmented" role="group" aria-label="View mode">
<button type="button" class="segment" data-mode="rendered" aria-pressed="true">Rendered</button>
<button type="button" class="segment" data-mode="source" aria-pressed="false">Source</button>
</div>
<button type="button" id="edit" class="circle-button" title="Edit side by side" aria-label="Edit side by side">${PENCIL_ICON}</button>
</div>
</header>
<div class="layout">
<main>
<div id="content">${a.body}</div>
<pre id="source" class="source-view hljs"><code>${a.source}</code></pre>
</main>
<nav id="toc" aria-label="Contents">
<div class="toc-header"><span>Contents</span><button type="button" id="toc-close" class="toc-close" title="Close contents" aria-label="Close contents">&#x2715;</button></div>
<ul id="toc-list"></ul>
</nav>
</div>
<script nonce="${a.nonce}" src="${a.scriptUri}"></script>
</body>
</html>`;
}

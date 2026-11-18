import { describe, expect, test, vi } from 'vitest';
import { renderMarkdown, renderSource } from '../src/render';

describe('renderSource', () => {
  test('highlights markdown syntax and escapes html', () => {
    const html = renderSource('# Ciao <b>');
    expect(html).toContain('hljs-section');
    expect(html).toContain('&lt;');
    expect(html).not.toContain('<b>');
  });

  test('empty source gives empty output', () => {
    expect(renderSource('')).toBe('');
  });

  test('very large source is escaped without highlighting', () => {
    const html = renderSource('# <b>\n'.repeat(100_000));
    expect(html).not.toContain('hljs-');
    expect(html).toContain('# &lt;b&gt;');
  });
});

const opts = { resolveImage: (s: string) => 'vscode-resource://' + s };

describe('renderMarkdown', () => {
  test('heading gets a slug id', () => {
    expect(renderMarkdown('# Ciao', opts)).toContain('<h1 id="ciao">Ciao</h1>');
  });

  test('heading slugs match GitHub: underscores kept, punctuation dropped', () => {
    expect(renderMarkdown('## my_function()', opts)).toContain('id="my_function"');
    expect(renderMarkdown('## Q&A: why?', opts)).toContain('id="qa-why"');
  });

  test('heading slug keeps combining marks', () => {
    expect(renderMarkdown('## Café', opts)).toContain('id="café"');
  });

  test('accented heading keeps accents in id', () => {
    expect(renderMarkdown('## Perché sì', opts)).toContain('id="perché-sì"');
  });

  test('duplicate headings get numbered ids', () => {
    const html = renderMarkdown('## A\n\n## A', opts);
    expect(html).toContain('id="a"');
    expect(html).toContain('id="a-1"');
  });

  test('renders tables', () => {
    expect(renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |', opts)).toContain('<table>');
  });

  test('task list renders disabled checkbox', () => {
    const html = renderMarkdown('- [x] fatto', opts);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked');
    expect(html).toContain('disabled');
  });

  test('highlights known language', () => {
    expect(renderMarkdown('```ts\nconst a = 1;\n```', opts)).toContain('hljs-keyword');
  });

  test('unknown language does not throw and escapes', () => {
    expect(renderMarkdown('```boh\n<b>\n```', opts)).toContain('&lt;b&gt;');
  });

  test('raw html is escaped', () => {
    const html = renderMarkdown('<script>alert(1)</script>', opts);
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script');
  });

  test('javascript: links are not rendered as href', () => {
    expect(renderMarkdown('[x](javascript:alert(1))', opts)).not.toContain('href="javascript:');
  });

  test('relative image goes through resolveImage with decoded path', () => {
    const resolveImage = vi.fn((s: string) => 'vscode-resource://' + s);
    const html = renderMarkdown('![a](<img/a b.png>)', { resolveImage });
    expect(resolveImage).toHaveBeenCalledWith('img/a b.png');
    expect(html).toMatch(/vscode-resource:\/\/img\/a(%20| )b\.png/);
  });

  test('https image kept, http image dropped with alt text', () => {
    expect(renderMarkdown('![a](https://x.io/a.png)', opts)).toContain('<img');
    const dropped = renderMarkdown('![a](http://x.io/a.png)', opts);
    expect(dropped).not.toContain('<img');
    expect(dropped).toContain('a');
  });

  test('front matter is shown as a key/value table', () => {
    const html = renderMarkdown('---\ntitle: Demo\ntags: [prova, markdown]\n---\n# T', opts);
    expect(html).toContain('<table class="front-matter">');
    expect(html).toContain('<th>title</th><td>Demo</td>');
    expect(html).toContain('<li>prova</li><li>markdown</li>');
    expect(html).toContain('<h1');
  });

  test('front matter values are escaped', () => {
    const html = renderMarkdown('---\nt: "<b>x</b>"\n---\n', opts);
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<b>x');
  });

  test('nested front matter objects are shown as inline code', () => {
    const html = renderMarkdown('---\nauthor:\n  name: Ada\n---\n', opts);
    expect(html).toContain('<th>author</th><td><code>{&quot;name&quot;:&quot;Ada&quot;}</code></td>');
  });

  test('invalid or non-object front matter falls back to a pre block', () => {
    expect(renderMarkdown('---\nfoo: [unclosed\n---\n', opts)).toContain('<pre class="front-matter">foo: [unclosed</pre>');
    expect(renderMarkdown('---\njust text\n---\n', opts)).toContain('<pre class="front-matter">just text</pre>');
  });

  test('lone --- is a horizontal rule', () => {
    expect(renderMarkdown('---', opts)).toContain('<hr');
  });

  test('empty source gives empty output', () => {
    expect(renderMarkdown('', opts)).toBe('');
  });

  test('1 MB document renders', () => {
    const big = 'Paragrafo **bold**\n\n'.repeat(Math.ceil(1_000_000 / 20));
    expect(renderMarkdown(big, opts).length).toBeGreaterThan(0);
  });
});

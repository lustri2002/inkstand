import { describe, expect, test } from 'vitest';
import { classifyLink } from '../src/links';

describe('classifyLink', () => {
  test('anchor is decoded', () => {
    expect(classifyLink('#perch%C3%A9')).toEqual({ kind: 'anchor', id: 'perché' });
  });

  test('http(s) and mailto are external', () => {
    expect(classifyLink('https://a.io/x?y=1')).toEqual({ kind: 'external', url: 'https://a.io/x?y=1' });
    expect(classifyLink('mailto:a@b.it')).toEqual({ kind: 'external', url: 'mailto:a@b.it' });
  });

  test.each(['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'vscode://x', '//evil.com/x', ''])(
    '%s is ignored',
    (href) => {
      expect(classifyLink(href)).toEqual({ kind: 'ignored' });
    },
  );

  test('markdown link keeps the decoded fragment as anchor and decodes path', () => {
    expect(classifyLink('docs/guida%20uno.md#perch%C3%A9')).toEqual({
      kind: 'markdown',
      path: 'docs/guida uno.md',
      anchor: 'perché',
    });
  });

  test('markdown link drops the query', () => {
    expect(classifyLink('a.md?x=1#sez')).toEqual({ kind: 'markdown', path: 'a.md', anchor: 'sez' });
    expect(classifyLink('a.md?x=1')).toEqual({ kind: 'markdown', path: 'a.md' });
  });

  test('empty fragment gives no anchor', () => {
    expect(classifyLink('a.md#')).toEqual({ kind: 'markdown', path: 'a.md' });
  });

  test('markdown extension is case-insensitive', () => {
    expect(classifyLink('../README.MARKDOWN')).toEqual({ kind: 'markdown', path: '../README.MARKDOWN' });
  });

  test('other relative paths are files', () => {
    expect(classifyLink('img/a.png')).toEqual({ kind: 'file', path: 'img/a.png' });
  });
});

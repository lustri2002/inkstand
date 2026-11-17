export type LinkTarget =
  | { kind: 'anchor'; id: string }
  | { kind: 'external'; url: string }
  | { kind: 'markdown'; path: string; anchor?: string }
  | { kind: 'file'; path: string }
  | { kind: 'ignored' };

const IGNORED: LinkTarget = { kind: 'ignored' };

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function classifyLink(href: string): LinkTarget {
  if (!href) return IGNORED;
  if (href.startsWith('#')) return { kind: 'anchor', id: decode(href.slice(1)) };
  if (href.startsWith('//')) return IGNORED;

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href);
  if (scheme) {
    return /^(https?|mailto)$/i.test(scheme[1]) ? { kind: 'external', url: href } : IGNORED;
  }

  const hash = href.indexOf('#');
  const anchor = hash >= 0 ? decode(href.slice(hash + 1)) : '';
  const path = decode(href.replace(/[?#].*$/, ''));
  if (!path) return IGNORED;
  if (!/\.(md|markdown)$/i.test(path)) return { kind: 'file', path };
  return anchor ? { kind: 'markdown', path, anchor } : { kind: 'markdown', path };
}

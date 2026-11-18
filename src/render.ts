import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import hljs from 'highlight.js';
import { parse as parseYaml } from 'yaml';

/** Above this size the source view is escaped but not highlighted, to keep updates fast. */
const SOURCE_HIGHLIGHT_LIMIT = 500_000;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderSource(source: string): string {
  if (!source) return '';
  if (source.length > SOURCE_HIGHLIGHT_LIMIT) return escapeHtml(source);
  return hljs.highlight(source, { language: 'markdown', ignoreIllegals: true }).value;
}

function renderFrontMatter(raw: string): string {
  let data: unknown;
  try {
    data = parseYaml(raw);
  } catch {
    data = undefined;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return `<pre class="front-matter" data-line="0">${escapeHtml(raw)}</pre>\n`;
  }
  const cell = (value: unknown): string => {
    if (Array.isArray(value) && value.every((v) => v === null || typeof v !== 'object')) {
      return `<ul>${value.map((v) => `<li>${escapeHtml(String(v ?? ''))}</li>`).join('')}</ul>`;
    }
    if (value !== null && typeof value === 'object') return `<code>${escapeHtml(JSON.stringify(value))}</code>`;
    return escapeHtml(String(value ?? ''));
  };
  const rows = Object.entries(data)
    .map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${cell(value)}</td></tr>`)
    .join('');
  return `<table class="front-matter" data-line="0"><tbody>${rows}</tbody></table>\n`;
}

// A type alias, not an interface, so that it fits markdown-it's index-signature Env type.
type RenderEnv = {
  /** Lines removed from the top of the file (the front matter) before rendering. */
  lineOffset?: number;
};

export interface RenderOptions {
  /** Receives the decoded relative image path; returns the URL to use, or undefined to drop the image. */
  resolveImage(src: string): string | undefined;
}

const FRONT_MATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/** Same rules as GitHub's heading anchors: letters, marks, digits, `_` and `-` survive; spaces become `-`. */
function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\s-]/gu, '')
    .replace(/\s/g, '-');
}

function createMarkdown(options: RenderOptions): InstanceType<typeof MarkdownIt> {
  const md = new MarkdownIt({ html: false, linkify: true });
  md.use(taskLists, { enabled: false });

  // Source line of each block (0-based, counted in the whole file), used to sync scrolling with the
  // text editor and to jump from the rendered page to the source.
  md.core.ruler.push('source_lines', (state) => {
    const offset = (state.env as RenderEnv).lineOffset ?? 0;
    for (const token of state.tokens) {
      if (token.map && token.block && token.nesting >= 0 && token.type !== 'inline') {
        token.attrSet('data-line', String(token.map[0] + offset));
      }
    }
  });

  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const lang = md.utils.unescapeAll(token.info).trim().split(/\s+/)[0] ?? '';
    const line = token.attrGet('data-line');
    const lineAttr = line === null ? '' : ` data-line="${line}"`;
    const known = lang !== '' && hljs.getLanguage(lang) !== undefined;
    const code = known
      ? hljs.highlight(token.content, { language: lang, ignoreIllegals: true }).value
      : escapeHtml(token.content);
    const langAttrs = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
    const codeClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
    return `<pre${known ? ' class="hljs"' : ''}${lineAttr}${langAttrs}><code${codeClass}>${code}</code></pre>\n`;
  };

  md.core.ruler.push('heading_ids', (state) => {
    const seen = new Map<string, number>();
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'heading_open') continue;
      const inline = tokens[i + 1];
      const text = (inline.children ?? [])
        .filter((t) => t.type === 'text' || t.type === 'code_inline')
        .map((t) => t.content)
        .join('');
      const base = slugify(text) || 'section';
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      tokens[i].attrSet('id', count === 0 ? base : `${base}-${count}`);
    }
  });

  const defaultImage = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const raw = String(token.attrGet('src') ?? '');
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      // keep raw
    }
    const dropped = () => md.utils.escapeHtml(token.content);

    if (/^https:\/\//i.test(raw) || /^data:image\//i.test(raw)) {
      return defaultImage(tokens, idx, opts, env, self);
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) {
      return dropped();
    }
    const resolved = options.resolveImage(decoded);
    if (resolved === undefined) return dropped();
    token.attrSet('src', resolved);
    return defaultImage(tokens, idx, opts, env, self);
  };

  return md;
}

export function renderMarkdown(source: string, options: RenderOptions): string {
  const md = createMarkdown(options);
  const match = FRONT_MATTER.exec(source);
  if (!match) return md.render(source);
  const env: RenderEnv = { lineOffset: match[0].split('\n').length - 1 };
  return renderFrontMatter(match[1]) + md.render(source.slice(match[0].length), env);
}

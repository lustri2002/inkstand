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
    return `<pre class="front-matter">${escapeHtml(raw)}</pre>\n`;
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
  return `<table class="front-matter"><tbody>${rows}</tbody></table>\n`;
}

export interface RenderOptions {
  /** Receives the decoded relative image path; returns the URL to use, or undefined to drop the image. */
  resolveImage(src: string): string | undefined;
}

const FRONT_MATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

function createMarkdown(options: RenderOptions): InstanceType<typeof MarkdownIt> {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        const value = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
        return `<pre class="hljs"><code>${value}</code></pre>`;
      }
      return '';
    },
  });
  md.use(taskLists, { enabled: false });

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
  return renderFrontMatter(match[1]) + md.render(source.slice(match[0].length));
}

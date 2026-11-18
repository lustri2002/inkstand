import { activeIndex, breadcrumb, scrollPercent } from './outline';
import { type LineBlock, lineToOffset, offsetToLine } from './scrollSync';

declare function acquireVsCodeApi(): {
  getState(): unknown;
  setState(state: unknown): void;
  postMessage(message: unknown): void;
};

type Mode = 'rendered' | 'source';
interface State {
  mode: Mode;
  scroll: Record<Mode, number>;
  toc: boolean;
}

const vscode = acquireVsCodeApi();
const body = document.body;
const toolbar = document.querySelector<HTMLElement>('.toolbar')!;
const content = document.getElementById('content')!;
const sourceCode = document.querySelector<HTMLElement>('#source code')!;
const segments = Array.from(document.querySelectorAll<HTMLButtonElement>('.segment'));
const crumb = document.getElementById('breadcrumb')!;
const position = document.getElementById('position')!;
const tocToggle = document.getElementById('toc-toggle')!;
const tocList = document.getElementById('toc-list')!;
const fileTitle = crumb.dataset.title ?? '';

const saved = (vscode.getState() ?? {}) as Partial<State>;
const state: State = {
  mode: saved.mode === 'source' ? 'source' : 'rendered',
  scroll: { rendered: 0, source: 0, ...saved.scroll },
  toc: saved.toc === true,
};

let headings: HTMLElement[] = [];
let tocLinks: HTMLAnchorElement[] = [];
/** Heading chosen from the table of contents; cleared as soon as the user scrolls by hand. */
let pinnedHeading: HTMLElement | undefined;

/** Scroll events until this time come from our own scrolling and are not sent to the text editor. */
let ignoreScrollUntil = 0;
let lineCount = 1;

const save = () => vscode.setState(state);

function countLines(): void {
  const text = sourceCode.textContent ?? '';
  let count = 1;
  for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1)) count++;
  lineCount = count;
}

/** Scrolls without echoing the scroll back to the text editor. */
function scrollToY(y: number): void {
  ignoreScrollUntil = performance.now() + 100;
  window.scrollTo(0, y);
}

function lineBlocks(): LineBlock[] {
  return Array.from(content.querySelectorAll<HTMLElement>('[data-line]'), (el) => {
    const rect = el.getBoundingClientRect();
    return { line: Number(el.dataset.line), top: rect.top + window.scrollY, height: rect.height };
  });
}

/** Source line at the top of the rendered page, just below the toolbar; undefined in the source view. */
function currentLine(): number | undefined {
  if (state.mode !== 'rendered') return undefined;
  return offsetToLine(lineBlocks(), window.scrollY + toolbar.offsetHeight, lineCount);
}
const levelOf = (h: HTMLElement) => Number(h.tagName.slice(1));

function buildToc(): void {
  headings = Array.from(content.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id]'));
  tocList.replaceChildren(
    ...headings.map((heading) => {
      const item = document.createElement('li');
      item.className = `toc-level-${levelOf(heading)}`;
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent ?? '';
      link.addEventListener('click', (event) => {
        event.preventDefault();
        // Near the end of the page the heading cannot reach the top: keep the clicked entry active.
        pinnedHeading = heading;
        heading.scrollIntoView();
        updateIndicators();
      });
      item.append(link);
      return item;
    }),
  );
  tocLinks = Array.from(tocList.querySelectorAll('a'));
  body.classList.toggle('has-toc', headings.length > 0);
}

function updateIndicators(): void {
  const page = document.documentElement;
  const atBottom = window.scrollY > 0 && window.scrollY + window.innerHeight >= page.scrollHeight - 2;
  position.textContent = `Position ${scrollPercent(window.scrollY, page.scrollHeight, window.innerHeight)}%`;

  let label = fileTitle;
  let index = -1;
  if (state.mode === 'rendered') {
    // Headings land at scroll-margin-top (56px) after a jump: the threshold must sit below that.
    index = activeIndex(
      headings.map((h) => ({ top: h.getBoundingClientRect().top })),
      toolbar.offsetHeight + 24,
      atBottom ? window.innerHeight : undefined,
    );
    const pinned = pinnedHeading ? headings.indexOf(pinnedHeading) : -1;
    if (pinned >= 0) index = pinned;
    const path = breadcrumb(
      headings.map((h) => ({ level: levelOf(h), text: h.textContent ?? '' })),
      index,
    );
    if (path.length) label = path.join(' › ');
  }
  crumb.textContent = label;
  crumb.title = label;
  tocLinks.forEach((link, i) => link.classList.toggle('active', i === index));
}

function applyToc(): void {
  body.classList.toggle('toc-open', state.toc);
  tocToggle.setAttribute('aria-pressed', String(state.toc));
}

function applyMode(mode: Mode): void {
  state.mode = mode;
  body.classList.toggle('mode-rendered', mode === 'rendered');
  body.classList.toggle('mode-source', mode === 'source');
  segments.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  scrollToY(state.scroll[mode] || 0);
  save();
  updateIndicators();
}

function setMode(mode: Mode): void {
  if (mode === state.mode) return;
  state.scroll[state.mode] = window.scrollY;
  applyMode(mode);
}

/** Scrolls the rendered page to the heading or element with this id (searched only inside the content). */
function reveal(id: string): void {
  const target = content.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (!target) return;
  setMode('rendered');
  pinnedHeading = headings.includes(target) ? target : undefined;
  target.scrollIntoView();
  updateIndicators();
}

function setToc(open: boolean): void {
  state.toc = open;
  applyToc();
  save();
}

countLines();
buildToc();
applyToc();
applyMode(state.mode);
// Opened from a link such as other.md#section.
if (body.dataset.anchor) reveal(body.dataset.anchor);

segments.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode as Mode)));
tocToggle.addEventListener('click', () => setToc(!state.toc));
document.getElementById('toc-close')!.addEventListener('click', () => setToc(false));
document.getElementById('edit')!.addEventListener('click', () => {
  const line = currentLine();
  vscode.postMessage({ type: 'edit', line: line === undefined ? undefined : Math.round(line) });
});

let frame = 0;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
function onScroll(): void {
  if (!frame) {
    frame = requestAnimationFrame(() => {
      frame = 0;
      updateIndicators();
      if (performance.now() >= ignoreScrollUntil) {
        const line = currentLine();
        if (line !== undefined) vscode.postMessage({ type: 'revealLine', line });
      }
    });
  }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    state.scroll[state.mode] = window.scrollY;
    save();
  }, 100);
}
window.addEventListener('scroll', onScroll);
window.addEventListener('resize', onScroll);
for (const type of ['wheel', 'keydown', 'touchstart', 'mousedown']) {
  window.addEventListener(type, () => (pinnedHeading = undefined), { passive: true });
}

content.addEventListener('dblclick', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.closest('a, input, button')) return;
  const block = target.closest<HTMLElement>('[data-line]');
  if (block) vscode.postMessage({ type: 'dblclick', line: Number(block.dataset.line) });
});

content.addEventListener('click', (event) => {
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!link) return;
  event.preventDefault();
  const href = link.getAttribute('href') ?? '';
  if (href.startsWith('#')) {
    let id = href.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // keep raw
    }
    reveal(id);
    return;
  }
  vscode.postMessage({ type: 'openLink', href });
});

window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data as
    | { type?: string; html?: string; source?: string; id?: string; line?: number; lineCount?: number }
    | undefined;
  if (message?.type === 'update') {
    const y = window.scrollY;
    content.innerHTML = message.html ?? '';
    sourceCode.innerHTML = message.source ?? '';
    scrollToY(y);
    countLines();
    buildToc();
    updateIndicators();
  } else if (message?.type === 'toggleMode') {
    setMode(state.mode === 'rendered' ? 'source' : 'rendered');
  } else if (message?.type === 'reveal' && typeof message.id === 'string') {
    reveal(message.id);
  } else if (message?.type === 'syncScroll' && typeof message.line === 'number' && state.mode === 'rendered') {
    if (typeof message.lineCount === 'number') lineCount = message.lineCount;
    const y = lineToOffset(lineBlocks(), message.line, lineCount);
    if (y === undefined) return;
    pinnedHeading = undefined;
    scrollToY(Math.max(0, y - toolbar.offsetHeight));
  }
});

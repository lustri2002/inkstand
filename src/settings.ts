/** Reading settings sent to the webview, read from the `inkstand.*` configuration. */
export interface ViewSettings {
  /** Maximum width of the text column in pixels; 0 fills the panel. */
  contentWidth: number;
  /** CSS font-family list for the rendered text; empty uses VS Code's UI font. */
  fontFamily: string;
  /** Font size in pixels for the rendered text; 0 uses VS Code's UI font size. */
  fontSize: number;
  lineHeight: number;
  /** Deepest heading level listed in Contents and in the toolbar breadcrumb (1–6). */
  tocDepth: number;
  /** View a file opens in the first time; afterwards each panel remembers its own. */
  defaultMode: 'rendered' | 'source';
  /** Whether Contents starts open the first time a file opens. */
  tocOpen: boolean;
}

export const DEFAULT_VIEW_SETTINGS: Readonly<ViewSettings> = Object.freeze({
  contentWidth: 860,
  fontFamily: '',
  fontSize: 0,
  lineHeight: 1.65,
  tocDepth: 3,
  defaultMode: 'rendered',
  tocOpen: false,
});

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Font names, quotes, commas and spaces only: the value goes into a CSS property. */
const FONT_FAMILY = /^[\p{L}\p{N}\s,'"._-]*$/u;

/** Reads and normalizes the settings; anything missing or invalid falls back to its default. */
export function readViewSettings(get: (name: keyof ViewSettings) => unknown): ViewSettings {
  const d = DEFAULT_VIEW_SETTINGS;
  const width = get('contentWidth');
  const family = get('fontFamily');
  const size = get('fontSize');
  const lineHeight = get('lineHeight');
  const depth = get('tocDepth');
  const mode = get('defaultMode');
  const tocOpen = get('tocOpen');
  const trimmed = typeof family === 'string' ? family.trim() : '';
  return {
    contentWidth: isNumber(width) ? (width <= 0 ? 0 : clamp(Math.round(width), 480, 4000)) : d.contentWidth,
    fontFamily: FONT_FAMILY.test(trimmed) ? trimmed : d.fontFamily,
    fontSize: isNumber(size) ? (size <= 0 ? 0 : clamp(size, 8, 40)) : d.fontSize,
    lineHeight: isNumber(lineHeight) ? clamp(lineHeight, 1, 3) : d.lineHeight,
    tocDepth: isNumber(depth) && Number.isInteger(depth) ? clamp(depth, 1, 6) : d.tocDepth,
    defaultMode: mode === 'source' || mode === 'rendered' ? mode : d.defaultMode,
    tocOpen: typeof tocOpen === 'boolean' ? tocOpen : d.tocOpen,
  };
}

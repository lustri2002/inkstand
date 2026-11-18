import { describe, expect, test } from 'vitest';
import { DEFAULT_VIEW_SETTINGS, readViewSettings } from '../src/settings';

const from = (values: Record<string, unknown>) => readViewSettings((name) => values[name]);

describe('readViewSettings', () => {
  test('unset values give the defaults', () => {
    expect(from({})).toEqual(DEFAULT_VIEW_SETTINGS);
    expect(DEFAULT_VIEW_SETTINGS).toEqual({
      contentWidth: 860,
      fontFamily: '',
      fontSize: 0,
      lineHeight: 1.65,
      tocDepth: 3,
      defaultMode: 'rendered',
      tocOpen: false,
    });
  });

  test('valid values pass through', () => {
    expect(
      from({
        contentWidth: 1200,
        fontFamily: 'Georgia, serif',
        fontSize: 16,
        lineHeight: 1.8,
        tocDepth: 4,
        defaultMode: 'source',
        tocOpen: true,
      }),
    ).toEqual({
      contentWidth: 1200,
      fontFamily: 'Georgia, serif',
      fontSize: 16,
      lineHeight: 1.8,
      tocDepth: 4,
      defaultMode: 'source',
      tocOpen: true,
    });
  });

  test('numbers are clamped to sensible ranges', () => {
    const s = from({ contentWidth: 100, fontSize: 200, lineHeight: 9, tocDepth: 9 });
    expect(s.contentWidth).toBe(480);
    expect(s.fontSize).toBe(40);
    expect(s.lineHeight).toBe(3);
    expect(s.tocDepth).toBe(6);
    expect(from({ fontSize: 3, lineHeight: 0.2, tocDepth: 0 })).toMatchObject({ fontSize: 8, lineHeight: 1, tocDepth: 1 });
  });

  test('0 keeps its meaning: full width, VS Code font size', () => {
    expect(from({ contentWidth: 0, fontSize: 0 })).toMatchObject({ contentWidth: 0, fontSize: 0 });
  });

  test('wrong types and unknown values fall back to the defaults', () => {
    expect(
      from({ contentWidth: '900', fontFamily: 42, fontSize: NaN, tocDepth: 2.7, defaultMode: 'preview', tocOpen: 'yes' }),
    ).toEqual({ ...DEFAULT_VIEW_SETTINGS, tocDepth: 3 });
  });

  test('font family is trimmed and cannot break out of the CSS value', () => {
    expect(from({ fontFamily: '  Iowan Old Style  ' }).fontFamily).toBe('Iowan Old Style');
    expect(from({ fontFamily: 'Georgia; color: red' }).fontFamily).toBe('');
    expect(from({ fontFamily: 'x} body{display:none' }).fontFamily).toBe('');
  });
});

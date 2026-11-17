import { describe, expect, test } from 'vitest';
import { activeIndex, breadcrumb, scrollPercent } from '../src/webview/outline';

describe('activeIndex', () => {
  const headings = [{ top: -300 }, { top: -20 }, { top: 40 }, { top: 500 }];

  test('picks the last heading at or above the offset', () => {
    expect(activeIndex(headings, 60)).toBe(2);
    expect(activeIndex(headings, 39)).toBe(1);
  });

  test('returns -1 before the first heading', () => {
    expect(activeIndex([{ top: 100 }], 60)).toBe(-1);
  });

  test('returns -1 with no headings', () => {
    expect(activeIndex([], 60)).toBe(-1);
  });

  test('at the bottom of the page, the last heading visible on screen is active', () => {
    const nearEnd = [{ top: -400 }, { top: 120 }, { top: 300 }, { top: 900 }];
    expect(activeIndex(nearEnd, 60, 760)).toBe(2);
  });

  test('at the bottom, falls back to the normal rule when no heading is on screen', () => {
    expect(activeIndex([{ top: -400 }, { top: -100 }], 60, 760)).toBe(1);
  });
});

describe('breadcrumb', () => {
  const headings = [
    { level: 1, text: 'Demo' },
    { level: 2, text: 'Perché sì' },
    { level: 3, text: 'Liste' },
    { level: 2, text: 'Altro' },
    { level: 3, text: 'Tabella' },
  ];

  test('builds the path of parent headings', () => {
    expect(breadcrumb(headings, 2)).toEqual(['Demo', 'Perché sì', 'Liste']);
    expect(breadcrumb(headings, 4)).toEqual(['Demo', 'Altro', 'Tabella']);
  });

  test('top-level heading is a single item', () => {
    expect(breadcrumb(headings, 0)).toEqual(['Demo']);
  });

  test('skipped levels still find the parent', () => {
    expect(breadcrumb([{ level: 1, text: 'A' }, { level: 3, text: 'C' }], 1)).toEqual(['A', 'C']);
  });

  test('no active heading gives an empty path', () => {
    expect(breadcrumb(headings, -1)).toEqual([]);
  });
});

describe('scrollPercent', () => {
  test('0 at the top, 100 at the bottom', () => {
    expect(scrollPercent(0, 2000, 500)).toBe(0);
    expect(scrollPercent(1500, 2000, 500)).toBe(100);
  });

  test('rounds to an integer', () => {
    expect(scrollPercent(345, 2000, 500)).toBe(23);
  });

  test('clamps out-of-range values', () => {
    expect(scrollPercent(-50, 2000, 500)).toBe(0);
    expect(scrollPercent(9999, 2000, 500)).toBe(100);
  });

  test('a page that fits on screen counts as fully read', () => {
    expect(scrollPercent(0, 400, 500)).toBe(100);
  });
});

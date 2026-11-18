import { describe, expect, test } from 'vitest';
import { lineToOffset, offsetToLine } from '../src/webview/scrollSync';

// Three blocks: lines 0, 10 and 20, at y = 0, 100 and 400 (the last one 200px tall).
const blocks = [
  { line: 0, top: 0, height: 80 },
  { line: 10, top: 100, height: 250 },
  { line: 20, top: 400, height: 200 },
];

describe('lineToOffset', () => {
  test('a block start maps to its top', () => {
    expect(lineToOffset(blocks, 10, 30)).toBe(100);
  });

  test('lines between blocks are interpolated', () => {
    expect(lineToOffset(blocks, 15, 30)).toBe(250);
  });

  test('lines inside the last block use its height and the line count', () => {
    expect(lineToOffset(blocks, 25, 30)).toBe(500);
  });

  test('before the first block maps to the page top', () => {
    expect(lineToOffset([{ line: 4, top: 50, height: 10 }], 1, 10)).toBe(0);
  });

  test('no blocks gives undefined', () => {
    expect(lineToOffset([], 3, 10)).toBeUndefined();
  });

  test('blocks sharing a line use the first one', () => {
    const nested = [
      { line: 5, top: 40, height: 300 },
      { line: 5, top: 48, height: 20 },
      { line: 7, top: 90, height: 20 },
    ];
    expect(lineToOffset(nested, 6, 10)).toBe(65);
  });
});

describe('offsetToLine', () => {
  test('is the inverse of lineToOffset between blocks', () => {
    expect(offsetToLine(blocks, 250, 30)).toBe(15);
    expect(offsetToLine(blocks, 100, 30)).toBe(10);
  });

  test('inside the last block uses its height and the line count', () => {
    expect(offsetToLine(blocks, 500, 30)).toBe(25);
    expect(offsetToLine(blocks, 9999, 30)).toBe(30);
  });

  test('above the first block is line 0', () => {
    expect(offsetToLine([{ line: 4, top: 50, height: 10 }], 10, 10)).toBe(0);
  });

  test('no blocks gives undefined', () => {
    expect(offsetToLine([], 3, 10)).toBeUndefined();
  });
});

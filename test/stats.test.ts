import { describe, expect, test } from 'vitest';
import { countWords, readingMinutes } from '../src/webview/stats';

describe('countWords', () => {
  test('counts words across punctuation and lines', () => {
    expect(countWords('Hello, world!\nThis is Inkstand.')).toBe(5);
  });

  test('keeps contractions, accents and hyphenated words whole', () => {
    expect(countWords("perché l'editor non-stop don't")).toBe(4);
  });

  test('ignores symbols and empty text', () => {
    expect(countWords('— • → 123')).toBe(1);
    expect(countWords('   ')).toBe(0);
  });
});

describe('readingMinutes', () => {
  test('rounds at 220 words per minute, with at least one minute', () => {
    expect(readingMinutes(1)).toBe(1);
    expect(readingMinutes(220)).toBe(1);
    expect(readingMinutes(1000)).toBe(5);
  });

  test('no words, no minutes', () => {
    expect(readingMinutes(0)).toBe(0);
  });
});

/** Average silent reading speed for prose, in words per minute. */
const WORDS_PER_MINUTE = 220;

/** Words: runs of letters or digits, joined by apostrophes, hyphens or underscores. */
export function countWords(text: string): number {
  return text.match(/[\p{L}\p{M}\p{N}]+(?:['’_-][\p{L}\p{M}\p{N}]+)*/gu)?.length ?? 0;
}

export function readingMinutes(words: number): number {
  return words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * Index of the last heading whose top is at or above `offset` (pixels from the viewport top), or -1.
 * When the page is scrolled to the bottom, pass the viewport height: the last heading visible on screen
 * wins, because headings near the end can never scroll up to `offset`.
 */
export function activeIndex(
  headings: ReadonlyArray<{ top: number }>,
  offset: number,
  bottomViewportHeight?: number,
): number {
  if (bottomViewportHeight !== undefined) {
    for (let i = headings.length - 1; i >= 0; i--) {
      if (headings[i].top >= 0 && headings[i].top < bottomViewportHeight) return i;
    }
  }
  let index = -1;
  for (let i = 0; i < headings.length; i++) {
    if (headings[i].top <= offset) index = i;
    else break;
  }
  return index;
}

/** Texts of the heading at `index` and of its parent headings, outermost first. */
export function breadcrumb(headings: ReadonlyArray<{ level: number; text: string }>, index: number): string[] {
  if (index < 0 || index >= headings.length) return [];
  const path = [headings[index].text];
  let level = headings[index].level;
  for (let i = index - 1; i >= 0 && level > 1; i--) {
    if (headings[i].level < level) {
      path.unshift(headings[i].text);
      level = headings[i].level;
    }
  }
  return path;
}

/** Reading position as an integer percentage; a page that fits on screen counts as 100. */
export function scrollPercent(scrollY: number, scrollHeight: number, viewportHeight: number): number {
  const max = scrollHeight - viewportHeight;
  if (max <= 0) return 100;
  return Math.round(Math.min(Math.max(scrollY / max, 0), 1) * 100);
}

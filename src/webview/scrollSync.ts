/** A rendered block that starts at source `line`, at `top` (document coordinates) and `height` pixels tall. */
export interface LineBlock {
  line: number;
  top: number;
  height: number;
}

/** Keeps the first block of each source line: nested blocks (a list and its first item) share one. */
function distinct(blocks: ReadonlyArray<LineBlock>): LineBlock[] {
  const result: LineBlock[] = [];
  for (const block of blocks) {
    if (result.length === 0 || block.line > result[result.length - 1].line) result.push(block);
  }
  return result;
}

/**
 * Document offset of a (possibly fractional) source line. Lines between two blocks are interpolated; lines after
 * the last block are spread over its height up to `lineCount`. `blocks` are in document order.
 */
export function lineToOffset(blocks: ReadonlyArray<LineBlock>, line: number, lineCount: number): number | undefined {
  const list = distinct(blocks);
  if (list.length === 0) return undefined;
  let i = -1;
  while (i + 1 < list.length && list[i + 1].line <= line) i++;
  if (i < 0) return 0;
  const prev = list[i];
  const next = list[i + 1];
  if (next) return prev.top + ((line - prev.line) / (next.line - prev.line)) * (next.top - prev.top);
  const span = Math.max(lineCount - prev.line, 1);
  return prev.top + Math.min((line - prev.line) / span, 1) * prev.height;
}

/** Source line (fractional) shown at a document offset: the inverse of `lineToOffset`. */
export function offsetToLine(blocks: ReadonlyArray<LineBlock>, offset: number, lineCount: number): number | undefined {
  const list = distinct(blocks);
  if (list.length === 0) return undefined;
  let i = -1;
  while (i + 1 < list.length && list[i + 1].top <= offset) i++;
  if (i < 0) return 0;
  const prev = list[i];
  const next = list[i + 1];
  if (next) {
    const gap = next.top - prev.top;
    return gap > 0 ? prev.line + ((offset - prev.top) / gap) * (next.line - prev.line) : prev.line;
  }
  const fraction = prev.height > 0 ? Math.min((offset - prev.top) / prev.height, 1) : 0;
  return prev.line + fraction * Math.max(lineCount - prev.line, 0);
}

/** `- [ ] `, `1. [x] `, `> * [X] `…: the list marker and the task box at the start of a line. */
const TASK = /^(\s*(?:>\s*)*(?:[-*+]|\d{1,9}[.)])\s+\[)[ xX](\])(?=\s|$)/;

/** The line with its task box set to `checked`, or undefined if the line is not a task list item. */
export function setTaskChecked(line: string, checked: boolean): string | undefined {
  if (!TASK.test(line)) return undefined;
  return line.replace(TASK, `$1${checked ? 'x' : ' '}$2`);
}

import { describe, expect, test } from 'vitest';
import { setTaskChecked } from '../src/tasks';

describe('setTaskChecked', () => {
  test('checks and unchecks a bullet task', () => {
    expect(setTaskChecked('- [ ] buy milk', true)).toBe('- [x] buy milk');
    expect(setTaskChecked('- [x] buy milk', false)).toBe('- [ ] buy milk');
    expect(setTaskChecked('* [X] done', false)).toBe('* [ ] done');
  });

  test('keeps indentation, ordered markers and blockquotes', () => {
    expect(setTaskChecked('    + [ ] nested', true)).toBe('    + [x] nested');
    expect(setTaskChecked('12) [ ] step', true)).toBe('12) [x] step');
    expect(setTaskChecked('> > 1. [ ] quoted', true)).toBe('> > 1. [x] quoted');
  });

  test('only the marker changes, not later brackets', () => {
    expect(setTaskChecked('- [ ] see [ ] and [x]', true)).toBe('- [x] see [ ] and [x]');
  });

  test('lines without a task marker give undefined', () => {
    expect(setTaskChecked('plain text [ ]', true)).toBeUndefined();
    expect(setTaskChecked('- not a task', true)).toBeUndefined();
    expect(setTaskChecked('-[ ] no space', true)).toBeUndefined();
  });
});

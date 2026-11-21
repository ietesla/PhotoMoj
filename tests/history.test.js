import { describe, it, expect } from 'vitest';
import { createHistory } from '../src/core/history.js';

const base = { hue: 0, brightness: 0 };

describe('createHistory', () => {
  it('starts with the given settings and nothing to undo or redo', () => {
    const h = createHistory(base);
    expect(h.current()).toEqual(base);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });

  it('undoes and redoes steps in order', () => {
    const h = createHistory(base);
    h.push({ hue: 30, brightness: 0 });
    h.push({ hue: 30, brightness: 20 });
    expect(h.undo()).toEqual({ hue: 30, brightness: 0 });
    expect(h.undo()).toEqual(base);
    expect(h.canUndo()).toBe(false);
    expect(h.redo()).toEqual({ hue: 30, brightness: 0 });
    expect(h.redo()).toEqual({ hue: 30, brightness: 20 });
    expect(h.canRedo()).toBe(false);
  });

  it('ignores a push that matches the current settings', () => {
    const h = createHistory(base);
    expect(h.push({ ...base })).toBe(false);
    expect(h.canUndo()).toBe(false);
  });

  it('drops the redo steps after a new change', () => {
    const h = createHistory(base);
    h.push({ hue: 10, brightness: 0 });
    h.push({ hue: 20, brightness: 0 });
    h.undo();
    h.push({ hue: 99, brightness: 0 });
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toEqual({ hue: 10, brightness: 0 });
  });

  it('does not change old snapshots when the caller edits its object', () => {
    const h = createHistory(base);
    const edited = { hue: 5, brightness: 0 };
    h.push(edited);
    edited.hue = 500;
    expect(h.current().hue).toBe(5);
  });

  it('keeps only the most recent snapshots when full', () => {
    const h = createHistory({ hue: 0 }, 3);
    for (let i = 1; i <= 5; i += 1) h.push({ hue: i });
    expect(h.current()).toEqual({ hue: 5 });
    expect(h.undo()).toEqual({ hue: 4 });
    expect(h.undo()).toEqual({ hue: 3 });
    expect(h.canUndo()).toBe(false);
  });

  it('says whether settings match the current step', () => {
    const h = createHistory(base);
    expect(h.isCurrent({ ...base })).toBe(true);
    expect(h.isCurrent({ hue: 1, brightness: 0 })).toBe(false);
    h.push({ hue: 1, brightness: 0 });
    expect(h.isCurrent({ hue: 1, brightness: 0 })).toBe(true);
    h.undo();
    expect(h.isCurrent({ hue: 1, brightness: 0 })).toBe(false);
  });
});

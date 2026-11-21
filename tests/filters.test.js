import { describe, it, expect } from 'vitest';
import { FILTERS, applyFilter, filterLabel } from '../src/core/filters.js';
import { applyAdjustments, isDefaultSettings, DEFAULT_SETTINGS } from '../src/core/adjustments.js';

const pixel = (r, g, b, a = 255) => new Uint8ClampedArray([r, g, b, a]);

describe('FILTERS', () => {
  it('starts with Original and lists Golden, Cool, and Mono', () => {
    expect(FILTERS.map((f) => f.label)).toEqual(['Original', 'Golden', 'Cool', 'Mono']);
  });

  it('turns an id into a label', () => {
    expect(filterLabel('golden')).toBe('Golden');
    expect(filterLabel('nope')).toBe('Original');
  });
});

describe('applyFilter', () => {
  it('leaves the photo alone for Original, an unknown id, or strength 0', () => {
    for (const [id, strength] of [['original', 100], ['nope', 100], ['golden', 0]]) {
      expect(Array.from(applyFilter(pixel(100, 120, 140), id, strength))).toEqual([100, 120, 140, 255]);
    }
  });

  it('changes the array in place and returns it', () => {
    const data = pixel(100, 120, 140);
    expect(applyFilter(data, 'golden', 100)).toBe(data);
  });

  it('Golden adds red and takes away blue', () => {
    const [r, g, b, a] = applyFilter(pixel(100, 100, 100), 'golden', 100);
    expect(r).toBeGreaterThan(100);
    expect(b).toBeLessThan(100);
    expect(a).toBe(255);
    expect(g).toBeGreaterThanOrEqual(100);
  });

  it('Cool takes away red and adds blue', () => {
    const [r, , b] = applyFilter(pixel(100, 100, 100), 'cool', 100);
    expect(r).toBeLessThan(100);
    expect(b).toBeGreaterThan(100);
  });

  it('Mono makes every pixel gray', () => {
    const [r, g, b] = applyFilter(pixel(200, 40, 40), 'mono', 100);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it('strength sets how far the look goes', () => {
    const full = applyFilter(pixel(100, 100, 100), 'golden', 100)[0];
    const half = applyFilter(pixel(100, 100, 100), 'golden', 50)[0];
    expect(half).toBeGreaterThan(100);
    expect(half).toBeLessThan(full);
    expect(half).toBeCloseTo(100 + (full - 100) / 2, 0);
  });

  it('never touches transparency', () => {
    expect(applyFilter(pixel(10, 20, 30, 40), 'mono', 100)[3]).toBe(40);
  });
});

describe('filters inside the settings', () => {
  it('a chosen filter counts as a change', () => {
    expect(isDefaultSettings({ ...DEFAULT_SETTINGS, filter: 'golden' })).toBe(false);
    expect(isDefaultSettings({ ...DEFAULT_SETTINGS, strength: 20 })).toBe(true);
  });

  it('applyAdjustments applies the filter after the sliders', () => {
    const plain = applyAdjustments(pixel(100, 100, 100), { ...DEFAULT_SETTINGS });
    const warm = applyAdjustments(pixel(100, 100, 100), { ...DEFAULT_SETTINGS, filter: 'golden', strength: 100 });
    expect(warm[0]).toBeGreaterThan(plain[0]);
  });
});

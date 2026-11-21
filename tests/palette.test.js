import { describe, it, expect } from 'vitest';
import { samplePixels, extractPalette, gradientStops, gradientCss } from '../src/core/palette.js';

/** Build RGBA data from a list of [color, how many pixels]. */
function makePixels(groups) {
  const out = [];
  for (const [[r, g, b, a = 255], n] of groups) {
    for (let i = 0; i < n; i += 1) out.push(r, g, b, a);
  }
  return new Uint8ClampedArray(out);
}

describe('samplePixels', () => {
  it('returns every pixel of a small photo', () => {
    const data = makePixels([[[10, 20, 30], 4]]);
    expect(samplePixels(data)).toHaveLength(4);
  });

  it('skips transparent pixels', () => {
    const data = makePixels([
      [[10, 20, 30], 2],
      [[200, 0, 0, 0], 3],
    ]);
    expect(samplePixels(data)).toEqual([
      [10, 20, 30],
      [10, 20, 30],
    ]);
  });

  it('keeps the sample size down on big photos', () => {
    const data = makePixels([[[1, 2, 3], 100000]]);
    expect(samplePixels(data, 5000).length).toBeLessThanOrEqual(10000);
  });
});

describe('extractPalette', () => {
  it('finds two flat colors exactly', () => {
    const data = makePixels([
      [[255, 0, 0], 50],
      [[0, 0, 255], 50],
    ]);
    const palette = extractPalette(data);
    expect(palette).toHaveLength(2);
    expect(palette.map((s) => s.hex).sort()).toEqual(['#0000FF', '#FF0000']);
    expect(palette[0].share).toBeCloseTo(0.5);
  });

  it('orders colors by how much of the photo they cover', () => {
    const data = makePixels([
      [[255, 0, 0], 50],
      [[0, 255, 0], 30],
      [[0, 0, 255], 20],
    ]);
    const palette = extractPalette(data);
    expect(palette.map((s) => s.hex)).toEqual(['#FF0000', '#00FF00', '#0000FF']);
    expect(palette.map((s) => Math.round(s.share * 100))).toEqual([50, 30, 20]);
  });

  it('returns one swatch for a single-color photo', () => {
    const palette = extractPalette(makePixels([[[12, 34, 56], 25]]));
    expect(palette).toHaveLength(1);
    expect(palette[0]).toMatchObject({ hex: '#0C2238', rgb: [12, 34, 56], share: 1 });
  });

  it('never returns more colors than asked for', () => {
    const groups = [];
    for (let i = 0; i < 20; i += 1) groups.push([[i * 12, 255 - i * 12, (i * 40) % 256], 10]);
    expect(extractPalette(makePixels(groups), { count: 4 }).length).toBeLessThanOrEqual(4);
  });

  it('gives the same result every time for the same photo', () => {
    const groups = [];
    for (let i = 0; i < 30; i += 1) groups.push([[(i * 37) % 256, (i * 91) % 256, (i * 53) % 256], 7]);
    const data = makePixels(groups);
    expect(extractPalette(data)).toEqual(extractPalette(data));
  });

  it('returns nothing for an empty or fully transparent photo', () => {
    expect(extractPalette(new Uint8ClampedArray(0))).toEqual([]);
    expect(extractPalette(makePixels([[[255, 0, 0, 0], 10]]))).toEqual([]);
  });
});

describe('gradient helpers', () => {
  const palette = [
    { hex: '#FFFFFF', rgb: [255, 255, 255], share: 0.4 },
    { hex: '#000000', rgb: [0, 0, 0], share: 0.3 },
    { hex: '#808080', rgb: [128, 128, 128], share: 0.3 },
  ];

  it('orders stops from dark to light', () => {
    expect(gradientStops(palette)).toEqual(['#000000', '#808080', '#FFFFFF']);
  });

  it('builds a CSS gradient', () => {
    expect(gradientCss(['#000000', '#FFFFFF'])).toBe('linear-gradient(90deg, #000000, #FFFFFF)');
    expect(gradientCss(['#123456'])).toBe('linear-gradient(90deg, #123456, #123456)');
    expect(gradientCss([])).toBe('none');
  });
});

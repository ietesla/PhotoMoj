import { describe, it, expect } from 'vitest';
import { rgbToHsl, hslToRgb, rgbToHex, hexToRgb, relativeLuminance } from '../src/core/colorUtils.js';

describe('rgbToHsl', () => {
  it('finds the hue of pure colors', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 1, l: 0.5 });
    expect(rgbToHsl(0, 255, 0).h).toBe(120);
    expect(rgbToHsl(0, 0, 255).h).toBe(240);
  });

  it('gives grays no hue and no saturation', () => {
    expect(rgbToHsl(128, 128, 128)).toMatchObject({ h: 0, s: 0 });
    expect(rgbToHsl(0, 0, 0).l).toBe(0);
    expect(rgbToHsl(255, 255, 255).l).toBe(1);
  });
});

describe('hslToRgb', () => {
  it('converts pure hues back to RGB', () => {
    expect(hslToRgb(0, 1, 0.5)).toEqual([255, 0, 0]);
    expect(hslToRgb(120, 1, 0.5)).toEqual([0, 255, 0]);
    expect(hslToRgb(240, 1, 0.5)).toEqual([0, 0, 255]);
  });

  it('wraps hue past 360 and below 0', () => {
    expect(hslToRgb(480, 1, 0.5)).toEqual(hslToRgb(120, 1, 0.5));
    expect(hslToRgb(-120, 1, 0.5)).toEqual(hslToRgb(240, 1, 0.5));
  });
});

describe('round trip', () => {
  it('returns the same color after RGB to HSL and back', () => {
    for (let r = 0; r <= 255; r += 17) {
      for (let g = 0; g <= 255; g += 17) {
        for (let b = 0; b <= 255; b += 17) {
          const { h, s, l } = rgbToHsl(r, g, b);
          expect(hslToRgb(h, s, l)).toEqual([r, g, b]);
        }
      }
    }
  });
});

describe('hex helpers', () => {
  it('turns RGB into an uppercase hex code', () => {
    expect(rgbToHex(232, 80, 63)).toBe('#E8503F');
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
    expect(rgbToHex(300, -5, 15.4)).toBe('#FF000F');
  });

  it('reads hex codes back, with or without the #', () => {
    expect(hexToRgb('#E8503F')).toEqual([232, 80, 63]);
    expect(hexToRgb('e8503f')).toEqual([232, 80, 63]);
    expect(hexToRgb('#12345')).toBeNull();
    expect(hexToRgb('nope')).toBeNull();
  });

  it('round trips every gray level', () => {
    for (let v = 0; v <= 255; v += 5) {
      expect(hexToRgb(rgbToHex(v, v, v))).toEqual([v, v, v]);
    }
  });

  it('scores white brighter than a dark color', () => {
    expect(relativeLuminance(255, 255, 255)).toBeGreaterThan(relativeLuminance(30, 30, 60));
    expect(relativeLuminance(0, 0, 0)).toBe(0);
  });
});

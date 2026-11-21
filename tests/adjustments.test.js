import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SETTINGS,
  normalizeHue,
  formatHue,
  formatAmount,
  isDefaultSettings,
  SLIDERS,
  applyHue,
  applyBrightness,
  applyContrast,
  applySaturation,
  applyAdjustments,
} from '../src/core/adjustments.js';
import { rgbToHsl } from '../src/core/colorUtils.js';

const pixel = (r, g, b, a = 255) => new Uint8ClampedArray([r, g, b, a]);

describe('normalizeHue', () => {
  it('keeps values inside 0 to 359', () => {
    expect(normalizeHue(0)).toBe(0);
    expect(normalizeHue(360)).toBe(0);
    expect(normalizeHue(-90)).toBe(270);
    expect(normalizeHue(450)).toBe(90);
  });
});

describe('formatHue', () => {
  it('shows a sign and a degree mark', () => {
    expect(formatHue(0)).toBe('0°');
    expect(formatHue(45)).toBe('+45°');
    expect(formatHue(-45)).toBe('-45°');
  });
});

describe('applyHue', () => {
  it('turns red into green at +120 and blue at +240', () => {
    expect(Array.from(applyHue(pixel(255, 0, 0), 120))).toEqual([0, 255, 0, 255]);
    expect(Array.from(applyHue(pixel(255, 0, 0), 240))).toEqual([0, 0, 255, 255]);
  });

  it('turns red into blue at -120', () => {
    expect(Array.from(applyHue(pixel(255, 0, 0), -120))).toEqual([0, 0, 255, 255]);
  });

  it('changes nothing at 0 or 360', () => {
    expect(Array.from(applyHue(pixel(200, 100, 50), 0))).toEqual([200, 100, 50, 255]);
    expect(Array.from(applyHue(pixel(200, 100, 50), 360))).toEqual([200, 100, 50, 255]);
  });

  it('leaves gray pixels alone', () => {
    expect(Array.from(applyHue(pixel(128, 128, 128), 90))).toEqual([128, 128, 128, 255]);
  });

  it('keeps the alpha channel', () => {
    expect(applyHue(pixel(255, 0, 0, 128), 120)[3]).toBe(128);
  });

  it('works on every pixel and edits the array in place', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]);
    const result = applyHue(data, 120);
    expect(result).toBe(data);
    expect(Array.from(data)).toEqual([0, 255, 0, 255, 255, 0, 0, 255]);
  });
});

describe('applyAdjustments', () => {
  it('uses the hue from the settings', () => {
    expect(Array.from(applyAdjustments(pixel(255, 0, 0), { hue: 120 }))).toEqual([0, 255, 0, 255]);
  });

  it('does nothing with the default settings', () => {
    expect(Array.from(applyAdjustments(pixel(10, 20, 30), DEFAULT_SETTINGS))).toEqual([10, 20, 30, 255]);
  });
});

describe('formatAmount', () => {
  it('shows a sign for non-zero values', () => {
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount(20)).toBe('+20');
    expect(formatAmount(-20)).toBe('-20');
  });
});

describe('applyBrightness', () => {
  it('lightens and darkens', () => {
    expect(Array.from(applyBrightness(pixel(100, 100, 100), 50))).toEqual([164, 164, 164, 255]);
    expect(Array.from(applyBrightness(pixel(100, 100, 100), -50))).toEqual([36, 36, 36, 255]);
  });

  it('stays inside 0 to 255', () => {
    expect(Array.from(applyBrightness(pixel(250, 5, 128), 100))).toEqual([255, 133, 255, 255]);
    expect(Array.from(applyBrightness(pixel(250, 5, 128), -100))).toEqual([122, 0, 0, 255]);
  });

  it('keeps alpha and changes nothing at 0', () => {
    expect(applyBrightness(pixel(10, 20, 30, 77), 40)[3]).toBe(77);
    expect(Array.from(applyBrightness(pixel(10, 20, 30), 0))).toEqual([10, 20, 30, 255]);
  });
});

describe('applyContrast', () => {
  it('pushes colors away from middle gray', () => {
    // factor 2 at +50: (100 - 128) * 2 + 128 = 72
    expect(Array.from(applyContrast(pixel(100, 156, 128), 50))).toEqual([72, 184, 128, 255]);
  });

  it('flattens the photo to gray at -100', () => {
    expect(Array.from(applyContrast(pixel(10, 200, 90), -100))).toEqual([128, 128, 128, 255]);
  });

  it('changes nothing at 0 and keeps alpha', () => {
    expect(Array.from(applyContrast(pixel(10, 20, 30, 90), 0))).toEqual([10, 20, 30, 90]);
    expect(applyContrast(pixel(10, 20, 30, 90), 60)[3]).toBe(90);
  });
});

describe('applySaturation', () => {
  it('turns the photo gray at -100', () => {
    const [r, g, b] = applySaturation(pixel(200, 100, 50), -100);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it('makes colors stronger when raised and weaker when lowered', () => {
    const start = rgbToHsl(180, 120, 100).s;
    const [ur, ug, ub] = applySaturation(pixel(180, 120, 100), 50);
    const [dr, dg, db] = applySaturation(pixel(180, 120, 100), -50);
    expect(rgbToHsl(ur, ug, ub).s).toBeGreaterThan(start);
    expect(rgbToHsl(dr, dg, db).s).toBeLessThan(start);
  });

  it('leaves gray pixels alone', () => {
    expect(Array.from(applySaturation(pixel(90, 90, 90), 100))).toEqual([90, 90, 90, 255]);
  });
});

describe('applyAdjustments with every slider', () => {
  it('treats missing settings as 0', () => {
    expect(Array.from(applyAdjustments(pixel(100, 100, 100), { brightness: 50 }))).toEqual([164, 164, 164, 255]);
  });

  it('applies brightness, then contrast, then color', () => {
    const together = applyAdjustments(pixel(120, 80, 60), { brightness: 20, contrast: 30, saturation: -40, hue: 60 });
    const stepped = applySaturation(applyHue(applyContrast(applyBrightness(pixel(120, 80, 60), 20), 30), 60), -40);
    // Hue and saturation share one pass, so allow a rounding step of 1.
    together.forEach((value, i) => expect(Math.abs(value - stepped[i])).toBeLessThanOrEqual(1));
  });
});

describe('isDefaultSettings and SLIDERS', () => {
  it('knows when nothing has been changed', () => {
    expect(isDefaultSettings(DEFAULT_SETTINGS)).toBe(true);
    expect(isDefaultSettings({ hue: 360 })).toBe(true);
    expect(isDefaultSettings({ ...DEFAULT_SETTINGS, contrast: 1 })).toBe(false);
  });

  it('lists a slider for every setting', () => {
    expect(SLIDERS.map((s) => s.key).sort()).toEqual(['brightness', 'contrast', 'hue', 'saturation']);
    for (const slider of SLIDERS) expect(DEFAULT_SETTINGS).toHaveProperty(slider.key, 0);
    for (const slider of SLIDERS) {
      expect(slider.min).toBeLessThan(0);
      expect(slider.max).toBeGreaterThan(0);
      expect(typeof slider.format(0)).toBe('string');
    }
  });
});

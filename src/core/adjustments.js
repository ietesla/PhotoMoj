// Photo adjustments. Works on raw RGBA pixel arrays, so no DOM code here.
// Edits are always applied to a copy. The original photo is never changed.

import { rgbToHsl, hslToRgb } from './colorUtils.js';
import { applyFilter } from './filters.js';

/**
 * Starting values. Every slider sits at 0 and no filter is chosen when nothing
 * has been changed. Strength is how much of a chosen filter is applied.
 */
export const DEFAULT_SETTINGS = Object.freeze({
  hue: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  filter: 'original',
  strength: 60,
});

/** Keep a hue shift inside 0 to 359 degrees. */
export function normalizeHue(degrees) {
  return ((degrees % 360) + 360) % 360;
}

/** Text for the hue readout, for example "+45°", "-45°", or "0°". */
export function formatHue(degrees) {
  const rounded = Math.round(degrees);
  if (rounded === 0) return '0°';
  return `${rounded > 0 ? '+' : ''}${rounded}°`;
}

/** Text for the other readouts, for example "+20", "-20", or "0". */
export function formatAmount(value) {
  const rounded = Math.round(value);
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

/** The sliders in the editor, in the order they appear. */
export const SLIDERS = Object.freeze([
  { key: 'hue', label: 'Hue', min: -180, max: 180, format: formatHue },
  { key: 'brightness', label: 'Brightness', min: -100, max: 100, format: formatAmount },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100, format: formatAmount },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100, format: formatAmount },
]);

/** True when no slider has been moved and no filter is chosen. */
export function isDefaultSettings(settings) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  return (
    normalizeHue(s.hue) === 0 &&
    s.brightness === 0 &&
    s.contrast === 0 &&
    s.saturation === 0 &&
    s.filter === 'original'
  );
}

/**
 * Make every pixel lighter or darker. The amount runs from -100 to 100
 * and moves each color channel by up to 128 levels. Changes the array in place.
 */
export function applyBrightness(data, amount) {
  if (amount === 0) return data;
  const delta = amount * 1.28;
  for (let i = 0; i < data.length; i += 4) {
    data[i] += delta;
    data[i + 1] += delta;
    data[i + 2] += delta;
  }
  return data;
}

/**
 * Push colors away from middle gray (positive) or toward it (negative).
 * At -100 the photo is flat gray. At +100 the contrast is three times stronger.
 * Changes the array in place.
 */
export function applyContrast(data, amount) {
  if (amount === 0) return data;
  const factor = amount >= 0 ? 1 + (amount / 100) * 2 : 1 + amount / 100;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (data[i] - 128) * factor + 128;
    data[i + 1] = (data[i + 1] - 128) * factor + 128;
    data[i + 2] = (data[i + 2] - 128) * factor + 128;
  }
  return data;
}

/**
 * Rotate the hue and scale the saturation of every pixel in one pass, which
 * keeps large exports fast. Saturation runs from -100 (gray) to 100 (twice as
 * colorful). Gray pixels and the alpha channel are left alone.
 */
export function applyColor(data, hueDegrees, saturationAmount) {
  const shift = normalizeHue(hueDegrees);
  if (shift === 0 && saturationAmount === 0) return data;
  const factor = 1 + saturationAmount / 100;

  for (let i = 0; i < data.length; i += 4) {
    const { h, s, l } = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (s === 0) continue;
    const [r, g, b] = hslToRgb(h + shift, Math.min(1, Math.max(0, s * factor)), l);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  return data;
}

/** Rotate the hue of every pixel by the given number of degrees. */
export function applyHue(data, degrees) {
  return applyColor(data, degrees, 0);
}

/** Make every pixel more or less colorful. */
export function applySaturation(data, amount) {
  return applyColor(data, 0, amount);
}

/** Apply every setting to a pixel array, in place. Missing settings count as 0. */
export function applyAdjustments(data, settings) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  applyBrightness(data, s.brightness);
  applyContrast(data, s.contrast);
  applyColor(data, s.hue, s.saturation);
  applyFilter(data, s.filter, s.strength);
  return data;
}

// Photo filters. Each one pushes every pixel toward a look, and the strength
// (0 to 100) says how far. Works on raw RGBA pixel arrays, so no DOM code here.

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/** The filters in the editor, in the order they appear. "original" does nothing. */
export const FILTERS = Object.freeze([
  { id: 'original', label: 'Original' },
  { id: 'golden', label: 'Golden' },
  { id: 'cool', label: 'Cool' },
  { id: 'mono', label: 'Mono' },
]);

/** Name for a filter id, for example "Golden". Unknown ids read as "Original". */
export function filterLabel(id) {
  const match = FILTERS.find((filter) => filter.id === id);
  return match ? match.label : 'Original';
}

// What each filter turns one pixel into at full strength.
const LOOKS = {
  // Warm: more red, a touch more green, much less blue.
  golden: (r, g, b) => [r * 1.08 + 10, g * 1.02 + 4, b * 0.8],
  // Cool: less red, a little more blue.
  cool: (r, g, b) => [r * 0.86, g * 0.98 + 2, b * 1.1 + 12],
  // Mono: brightness only, with a little extra contrast.
  mono: (r, g, b) => {
    const y = (0.2126 * r + 0.7152 * g + 0.0722 * b - 128) * 1.1 + 128;
    return [y, y, y];
  },
};

/**
 * Apply a filter to a pixel array, in place. Strength 0 leaves the photo
 * alone and 100 is the full look. The alpha channel is never touched.
 */
export function applyFilter(data, id, strength = 100) {
  const look = LOOKS[id];
  const amount = clamp01(strength / 100);
  if (!look || amount === 0) return data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const [fr, fg, fb] = look(r, g, b);
    data[i] = r + (fr - r) * amount;
    data[i + 1] = g + (fg - g) * amount;
    data[i + 2] = b + (fb - b) * amount;
  }
  return data;
}

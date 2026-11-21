// Palette extraction with k-means clustering. No DOM code, so it can be tested in Node.
//
// k-means groups the photo's pixels into k clusters of similar colors. The
// average color of each cluster becomes one swatch. To stay fast on big
// photos, only a sample of the pixels is used.

import { rgbToHex, relativeLuminance } from './colorUtils.js';

/** A small seeded random number generator, so the same photo gives the same palette every time. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Collect up to about maxSamples pixels as [r, g, b], spread evenly across the
 * photo. Mostly transparent pixels are skipped.
 */
export function samplePixels(data, maxSamples = 6000) {
  const total = Math.floor(data.length / 4);
  const step = Math.max(1, Math.floor(total / maxSamples));
  const samples = [];
  for (let p = 0; p < total; p += step) {
    const i = p * 4;
    if (data[i + 3] < 128) continue;
    samples.push([data[i], data[i + 1], data[i + 2]]);
  }
  return samples;
}

function distanceSquared(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/**
 * Pick starting centers that are spread out (the k-means++ method). Stops early
 * when the photo has fewer distinct colors than k.
 */
function chooseCenters(points, k, random) {
  const centers = [points[Math.floor(random() * points.length)]];
  const nearest = points.map((p) => distanceSquared(p, centers[0]));

  while (centers.length < k) {
    const sum = nearest.reduce((total, value) => total + value, 0);
    if (sum === 0) break;
    let target = random() * sum;
    let pick = 0;
    for (let i = 0; i < points.length; i += 1) {
      target -= nearest[i];
      if (target <= 0) {
        pick = i;
        break;
      }
    }
    centers.push(points[pick]);
    for (let i = 0; i < points.length; i += 1) {
      nearest[i] = Math.min(nearest[i], distanceSquared(points[i], points[pick]));
    }
  }
  return centers.map((c) => [...c]);
}

/**
 * Find the main colors in a photo.
 * Returns up to `count` swatches, biggest group first:
 * { hex: "#E8503F", rgb: [232, 80, 63], share: 0.42 }
 * where share is the fraction of sampled pixels in that group.
 */
export function extractPalette(data, { count = 5, maxSamples = 6000, iterations = 12, seed = 1 } = {}) {
  const points = samplePixels(data, maxSamples);
  if (points.length === 0 || count < 1) return [];

  const random = seededRandom(seed);
  let centers = chooseCenters(points, count, random);
  let assignment = new Array(points.length).fill(0);

  for (let round = 0; round < iterations; round += 1) {
    // Step 1: give every pixel to its nearest center.
    let changed = false;
    for (let i = 0; i < points.length; i += 1) {
      let best = 0;
      let bestDistance = Infinity;
      for (let c = 0; c < centers.length; c += 1) {
        const d = distanceSquared(points[i], centers[c]);
        if (d < bestDistance) {
          bestDistance = d;
          best = c;
        }
      }
      if (assignment[i] !== best) {
        assignment[i] = best;
        changed = true;
      }
    }
    if (!changed && round > 0) break;

    // Step 2: move each center to the average of its pixels.
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < points.length; i += 1) {
      const s = sums[assignment[i]];
      s[0] += points[i][0];
      s[1] += points[i][1];
      s[2] += points[i][2];
      s[3] += 1;
    }
    centers = centers.map((center, c) => {
      const s = sums[c];
      return s[3] === 0 ? center : [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
    });
  }

  const counts = centers.map(() => 0);
  for (let i = 0; i < points.length; i += 1) counts[assignment[i]] += 1;

  return centers
    .map((center, c) => {
      const rgb = center.map((v) => Math.round(v));
      return { hex: rgbToHex(...rgb), rgb, share: counts[c] / points.length };
    })
    .filter((swatch) => swatch.share > 0)
    .sort((a, b) => b.share - a.share);
}

/** The palette's hex codes ordered dark to light, which makes a smooth gradient. */
export function gradientStops(palette) {
  return [...palette]
    .sort((a, b) => relativeLuminance(...a.rgb) - relativeLuminance(...b.rgb))
    .map((swatch) => swatch.hex);
}

/** A CSS background for the gradient bar, or "none" when there are no colors. */
export function gradientCss(hexCodes) {
  if (hexCodes.length === 0) return 'none';
  if (hexCodes.length === 1) return `linear-gradient(90deg, ${hexCodes[0]}, ${hexCodes[0]})`;
  return `linear-gradient(90deg, ${hexCodes.join(', ')})`;
}

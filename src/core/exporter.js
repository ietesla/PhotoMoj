// Export: turns the full-size original plus the current settings into a file.
// The on-screen canvas is a small preview, so export draws the original again.

import { applyAdjustments, isDefaultSettings } from './adjustments.js';

const FORMATS = {
  jpg: { mime: 'image/jpeg', ext: 'jpg', quality: 0.92 },
  png: { mime: 'image/png', ext: 'png', quality: undefined },
};

/** Look up a format by key ("jpg" or "png"). */
export function getFormat(key) {
  const format = FORMATS[key];
  if (!format) throw new Error(`Unknown export format: ${key}`);
  return format;
}

/** Build a safe download name, for example "My-Trip-photomoj.jpg". */
export function exportFileName(originalName, formatKey) {
  const base =
    String(originalName || '')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^\w\- ]+/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'photo';
  return `${base}-photomoj.${getFormat(formatKey).ext}`;
}

/** A readable name for the photo, for example "alpine_morning.jpg" becomes "alpine morning". */
export function displayName(originalName) {
  const name = String(originalName || '')
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return name || 'Your photo';
}

/**
 * Render the original photo at full size with the settings applied and
 * return it as a Blob. Runs in the browser only.
 */
export async function renderToBlob(bitmap, settings, formatKey) {
  const format = getFormat(formatKey);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('This browser could not prepare the photo.');

  // JPG has no transparency, so put the photo on white instead of black.
  if (format.mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);

  if (!isDefaultSettings(settings)) {
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyAdjustments(image.data, settings);
    ctx.putImageData(image, 0, 0);
  }

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, format.mime, format.quality);
  });

  // Free the big canvas memory right away.
  canvas.width = 0;
  canvas.height = 0;

  if (!blob) {
    throw new Error('Could not make the file. The photo may be too large for this device.');
  }
  return blob;
}

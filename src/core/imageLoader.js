// Loads a photo file into memory and works out how to fit it on screen.
// The original bitmap is never changed. Every later edit renders from it.

const ACCEPTED_PREFIX = 'image/';

/**
 * Work out the size to draw an image so it fits inside a box without
 * stretching and without scaling up past its real size.
 */
export function fitSize(imageWidth, imageHeight, maxWidth, maxHeight) {
  if (imageWidth <= 0 || imageHeight <= 0 || maxWidth <= 0 || maxHeight <= 0) {
    return { width: 0, height: 0 };
  }
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight, 1);
  return {
    width: Math.round(imageWidth * scale),
    height: Math.round(imageHeight * scale),
  };
}

/** True when the file looks like an image the browser can open. */
export function isImageFile(file) {
  return Boolean(file && typeof file.type === 'string' && file.type.startsWith(ACCEPTED_PREFIX));
}

/**
 * Decode a File into an ImageBitmap. The "from-image" option applies the
 * rotation stored in phone photos, so they do not appear sideways.
 */
export async function loadImageFromFile(file) {
  if (!isImageFile(file)) {
    throw new Error('That file is not a photo. Try a JPG or PNG.');
  }
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('That photo could not be opened. Try a different one.');
  }
}

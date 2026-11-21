// Zoom and pan math for the preview. Nothing here touches the screen, so it is
// easy to test. The view is described by a zoom level (1 = whole photo fits
// the box) and a center point (cx, cy) as fractions of the photo, 0 to 1.
// Zooming only changes what the preview shows. It never changes the photo
// or the exported file.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function clampZoom(zoom) {
  if (!Number.isFinite(zoom)) return MIN_ZOOM;
  return clamp(zoom, MIN_ZOOM, MAX_ZOOM);
}

/** Scale that fits the whole photo in the box. maxScale stops tiny photos from being blown up. */
export function fitScale(imgW, imgH, boxW, boxH, maxScale = 1) {
  if (imgW <= 0 || imgH <= 0 || boxW <= 0 || boxH <= 0) return 0;
  return Math.min(boxW / imgW, boxH / imgH, maxScale);
}

/**
 * Work out which part of the photo to show and how big to draw it.
 * geom: { imgW, imgH, boxW, boxH, maxScale? }   state: { zoom, cx, cy }
 * Returns the source rectangle (sx, sy, sw, sh) in photo pixels, the drawing
 * size (dw, dh), and the zoom and center after being kept inside the photo.
 */
export function computeView(geom, state = {}) {
  const { imgW, imgH, boxW, boxH, maxScale = 1 } = geom;
  const base = fitScale(imgW, imgH, boxW, boxH, maxScale);
  if (base === 0) return { sx: 0, sy: 0, sw: 0, sh: 0, dw: 0, dh: 0, scale: 0, zoom: MIN_ZOOM, cx: 0.5, cy: 0.5 };

  const zoom = clampZoom(state.zoom ?? 1);
  const scale = base * zoom;
  const sw = Math.min(imgW, boxW / scale);
  const sh = Math.min(imgH, boxH / scale);
  const sx = clamp((state.cx ?? 0.5) * imgW - sw / 2, 0, imgW - sw);
  const sy = clamp((state.cy ?? 0.5) * imgH - sh / 2, 0, imgH - sh);
  return {
    sx,
    sy,
    sw,
    sh,
    dw: Math.max(1, Math.round(sw * scale)),
    dh: Math.max(1, Math.round(sh * scale)),
    scale,
    zoom,
    cx: (sx + sw / 2) / imgW,
    cy: (sy + sh / 2) / imgH,
  };
}

/** Move the view by a drag of dx, dy screen pixels. Dragging right shows more of the left side. */
export function panBy(geom, state, dx, dy) {
  const view = computeView(geom, state);
  if (view.scale === 0) return view;
  return computeView(geom, {
    zoom: view.zoom,
    cx: view.cx - dx / (view.scale * geom.imgW),
    cy: view.cy - dy / (view.scale * geom.imgH),
  });
}

/**
 * Change the zoom while keeping the point under the finger or cursor still.
 * (ax, ay) is that point in screen pixels measured from the middle of the box.
 */
export function zoomAround(geom, state, newZoom, ax = 0, ay = 0) {
  const view = computeView(geom, state);
  if (view.scale === 0) return view;
  const pointX = view.sx + view.sw / 2 + ax / view.scale;
  const pointY = view.sy + view.sh / 2 + ay / view.scale;
  const zoom = clampZoom(newZoom);
  const scale = (view.scale / view.zoom) * zoom;
  return computeView(geom, {
    zoom,
    cx: (pointX - ax / scale) / geom.imgW,
    cy: (pointY - ay / scale) / geom.imgH,
  });
}

/** Text for the zoom readout, such as "1x" or "2.5x". */
export function formatZoom(zoom) {
  return `${Math.round(zoom * 10) / 10}x`;
}

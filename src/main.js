import { fitSize, loadImageFromFile } from './core/imageLoader.js';
import { DEFAULT_SETTINGS, SLIDERS, applyAdjustments, isDefaultSettings } from './core/adjustments.js';
import { createHistory } from './core/history.js';
import { FILTERS, applyFilter, filterLabel } from './core/filters.js';
import { MAX_ZOOM, MIN_ZOOM, computeView, formatZoom, panBy, zoomAround } from './core/viewport.js';
import { extractPalette, gradientStops, gradientCss } from './core/palette.js';
import { displayName, exportFileName, renderToBlob } from './core/exporter.js';
import { downloadBlob } from './platform/download.js';
import { copyText } from './platform/clipboard.js';
import {
  cameraErrorMessage,
  cameraSupported,
  captureFrame,
  otherFacing,
  startCamera,
  stopStream,
} from './platform/camera.js';
import { canShareFile, shareFile } from './platform/share.js';
import { IOS_INSTALL_HINT, createInstaller, isIos, isStandalone } from './platform/install.js';

const screens = {
  import: document.getElementById('import-screen'),
  editor: document.getElementById('editor-screen'),
  export: document.getElementById('export-screen'),
  camera: document.getElementById('camera-screen'),
};
const fileInput = document.getElementById('file-input');
const importError = document.getElementById('import-error');
const canvas = document.getElementById('photo-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const photoInfo = document.getElementById('photo-info');
const photoName = document.getElementById('photo-name');
const previewCaption = document.getElementById('preview-caption');
const stage = canvas.parentElement;
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const zoomFitBtn = document.getElementById('zoom-fit-btn');
const zoomReadout = document.getElementById('zoom-readout');
const zoomBar = document.querySelector('.zoom-bar');
const slidersBox = document.getElementById('sliders');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const resetBtn = document.getElementById('reset-btn');
const tabs = {
  adjust: { tab: document.getElementById('tab-adjust'), panel: document.getElementById('adjust-panel') },
  filters: { tab: document.getElementById('tab-filters'), panel: document.getElementById('filters-panel') },
  palette: { tab: document.getElementById('tab-palette'), panel: document.getElementById('palette-panel') },
};
const filterGrid = document.getElementById('filter-grid');
const strengthBox = document.getElementById('strength-block');
const panelActions = document.getElementById('panel-actions');
const cancelBtn = document.getElementById('cancel-btn');
const confirmBtn = document.getElementById('confirm-btn');
const backImportBtn = document.getElementById('back-import-btn');
const gradientBar = document.getElementById('gradient-bar');
const swatchBox = document.getElementById('swatches');
const copyStatus = document.getElementById('copy-status');
const exportBtn = document.getElementById('export-btn');
const saveBtn = document.getElementById('save-btn');
const backBtn = document.getElementById('back-btn');
const exportStatus = document.getElementById('export-status');
const cameraBtn = document.getElementById('camera-btn');
const installBtn = document.getElementById('install-btn');
const installHint = document.getElementById('install-hint');
const video = document.getElementById('camera-video');
const cameraStatus = document.getElementById('camera-status');
const shutterBtn = document.getElementById('shutter-btn');
const flipBtn = document.getElementById('flip-btn');
const cameraCancelBtn = document.getElementById('camera-cancel-btn');
const shareBtn = document.getElementById('share-btn');

// The untouched original. Edits are drawn from it and never written over it.
let originalBitmap = null;
let originalName = '';
// The original shrunk to fit the screen, as pixels. This is the live preview source.
let previewBase = null;
// A small copy of the whole photo. The palette is read from it, so zooming never changes the palette.
let paletteBase = null;
// What part of the photo the preview shows. Zoom 1 shows all of it.
let view = { zoom: 1, cx: 0.5, cy: 0.5 };
let drawQueued = false;
// Current edits. Export uses the same object, so the file matches the preview.
let settings = { ...DEFAULT_SETTINGS };
// Snapshots of the settings for undo and redo.
let history = createHistory(settings);
let renderQueued = false;
let paletteDirty = true;
let copyTimer = null;

/* ---------- Screens and tabs ---------- */

function showScreen(name) {
  for (const [key, element] of Object.entries(screens)) {
    element.hidden = key !== name;
  }
}

function showImport(message = '') {
  showScreen('import');
  importError.hidden = !message;
  importError.textContent = message;
}

function showTab(name) {
  for (const [key, { tab, panel }] of Object.entries(tabs)) {
    const active = key === name;
    tab.setAttribute('aria-selected', String(active));
    panel.hidden = !active;
  }
  panelActions.hidden = name === 'palette';
  if (name === 'palette') refreshPalette();
}

/* ---------- Sliders ---------- */

const sliderControls = new Map();

// How strongly a chosen filter is applied. Only the filter panel uses it.
const STRENGTH_SPEC = {
  key: 'strength',
  label: 'Strength',
  min: 0,
  max: 100,
  format: (value) => `${Math.round(value)}%`,
};

function buildSlider(spec, container) {
  const id = `${spec.key}-slider`;
  const row = document.createElement('div');
  row.className = `slider-block slider-${spec.key}`;

  const header = document.createElement('div');
  header.className = 'slider-row';
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = spec.label;
  const output = document.createElement('output');
  output.htmlFor = id;
  header.append(label, output);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = String(spec.min);
  input.max = String(spec.max);
  input.step = '1';
  input.value = String(DEFAULT_SETTINGS[spec.key]);

  // Moving a slider only changes the preview. Confirm records it as one undo step.
  input.addEventListener('input', () => {
    settings[spec.key] = Number(input.value);
    settingsChanged();
    schedulePreview();
  });

  row.append(header, input);
  container.append(row);
  sliderControls.set(spec.key, { spec, input, output });
}

function buildSliders() {
  for (const spec of SLIDERS) buildSlider(spec, slidersBox);
  buildSlider(STRENGTH_SPEC, strengthBox);
}

/** Make every control show the current settings. */
function updateReadouts() {
  for (const { spec, input, output } of sliderControls.values()) {
    input.value = String(settings[spec.key]);
    const text = spec.format(settings[spec.key]);
    output.textContent = text;
    input.setAttribute('aria-valuetext', text);
    const percent = ((settings[spec.key] - spec.min) / (spec.max - spec.min)) * 100;
    input.style.setProperty('--pct', `${percent}%`);
  }
  sliderControls.get('strength').input.disabled = settings.filter === 'original';
  for (const option of filterGrid.children) {
    option.setAttribute('aria-checked', String(option.dataset.filter === settings.filter));
  }
  previewCaption.textContent = `Preview · ${filterLabel(settings.filter)}`;
}

/** Something about the edit changed: refresh the readouts, buttons, and palette. */
function settingsChanged() {
  paletteDirty = true;
  updateReadouts();
  updateHistoryButtons();
  if (!tabs.palette.panel.hidden) refreshPalette();
}

/* ---------- Filters ---------- */

const THUMB_W = 240;
const THUMB_H = 160;

/** Draw the small whole-photo copy with one filter on it, cropped to a 3 by 2 tile. */
function filterThumb(id) {
  const pixels = new ImageData(new Uint8ClampedArray(paletteBase.data), paletteBase.width, paletteBase.height);
  applyFilter(pixels.data, id, 100);
  const full = document.createElement('canvas');
  full.width = pixels.width;
  full.height = pixels.height;
  full.getContext('2d').putImageData(pixels, 0, 0);

  const tile = document.createElement('canvas');
  tile.width = THUMB_W;
  tile.height = THUMB_H;
  const wide = full.width / full.height > THUMB_W / THUMB_H;
  const sw = wide ? full.height * (THUMB_W / THUMB_H) : full.width;
  const sh = wide ? full.height : full.width / (THUMB_W / THUMB_H);
  const tileCtx = tile.getContext('2d');
  tileCtx.imageSmoothingQuality = 'high';
  tileCtx.drawImage(full, (full.width - sw) / 2, (full.height - sh) / 2, sw, sh, 0, 0, THUMB_W, THUMB_H);
  return tile;
}

/** One tile per filter, each showing the user's own photo. Built once per photo. */
function buildFilterGrid() {
  filterGrid.replaceChildren();
  for (const filter of FILTERS) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'filter-option';
    option.dataset.filter = filter.id;
    option.setAttribute('role', 'radio');
    const label = document.createElement('span');
    label.textContent = filter.label;
    option.append(filterThumb(filter.id), label);
    option.addEventListener('click', () => chooseFilter(filter.id));
    filterGrid.append(option);
  }
}

function chooseFilter(id) {
  settings.filter = id;
  // Going back to Original also puts the strength back, so the edit counts as unchanged.
  if (id === 'original') settings.strength = DEFAULT_SETTINGS.strength;
  settingsChanged();
  schedulePreview();
}

/* ---------- Preview ---------- */

/** The preview pixels with the current settings applied. */
function editedFrame() {
  if (isDefaultSettings(settings)) return previewBase;
  const frame = new ImageData(
    new Uint8ClampedArray(previewBase.data),
    previewBase.width,
    previewBase.height,
  );
  applyAdjustments(frame.data, settings);
  return frame;
}

/** Redraw the preview from the untouched working copy plus the current settings. */
function renderPreview() {
  renderQueued = false;
  if (!previewBase) return;
  ctx.putImageData(editedFrame(), 0, 0);
}

// Slider events can fire faster than the screen refreshes, so draw at most once per frame.
function schedulePreview() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(renderPreview);
}

/** Box size and photo size the zoom math works from. Sizes are in device pixels so zoomed photos stay sharp. */
function viewGeometry() {
  const rect = stage.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  return {
    imgW: originalBitmap.width,
    imgH: originalBitmap.height,
    boxW: rect.width * ratio,
    boxH: rect.height * ratio,
    maxScale: ratio,
    ratio,
  };
}

/**
 * Draw the visible part of the original at screen resolution and keep a clean
 * copy of those pixels. Zooming draws from the original, not from a shrunken
 * copy, so detail appears as you zoom in.
 */
function drawPhoto() {
  drawQueued = false;
  if (!originalBitmap) return;
  const geom = viewGeometry();
  const v = computeView(geom, view);
  if (v.dw === 0 || v.dh === 0) return;
  view = { zoom: v.zoom, cx: v.cx, cy: v.cy };
  canvas.width = v.dw;
  canvas.height = v.dh;
  canvas.style.width = `${v.dw / geom.ratio}px`;
  canvas.style.height = `${v.dh / geom.ratio}px`;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(originalBitmap, v.sx, v.sy, v.sw, v.sh, 0, 0, v.dw, v.dh);
  previewBase = ctx.getImageData(0, 0, v.dw, v.dh);
  renderPreview();
  updateZoomControls();
}

// Gestures can fire faster than the screen refreshes, so redraw at most once per frame.
function scheduleDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(drawPhoto);
}

/* ---------- Zoom and pan ---------- */

function updateZoomControls() {
  zoomReadout.textContent = formatZoom(view.zoom);
  zoomOutBtn.disabled = view.zoom <= MIN_ZOOM;
  zoomFitBtn.disabled = view.zoom <= MIN_ZOOM;
  zoomInBtn.disabled = view.zoom >= MAX_ZOOM;
  stage.classList.toggle('zoomed', view.zoom > MIN_ZOOM);
  placeZoomBar();
}

/** Keep the zoom controls inside the bottom right corner of the photo, wherever the photo sits. */
function placeZoomBar() {
  const wrap = zoomBar.parentElement.getBoundingClientRect();
  const photo = canvas.getBoundingClientRect();
  if (wrap.width === 0 || photo.width === 0) return;
  zoomBar.style.right = `${Math.max(8, wrap.right - photo.right + 12)}px`;
  zoomBar.style.bottom = `${Math.max(8, wrap.bottom - photo.bottom + 12)}px`;
}

/** Where a pointer is, in pixels from the middle of the stage, in device pixels. */
function fromStageCenter(clientX, clientY, geom) {
  const rect = stage.getBoundingClientRect();
  return {
    x: (clientX - (rect.left + rect.width / 2)) * geom.ratio,
    y: (clientY - (rect.top + rect.height / 2)) * geom.ratio,
  };
}

function zoomTo(newZoom, clientX, clientY) {
  if (!originalBitmap) return;
  const geom = viewGeometry();
  const rect = stage.getBoundingClientRect();
  const anchor = fromStageCenter(
    clientX ?? rect.left + rect.width / 2,
    clientY ?? rect.top + rect.height / 2,
    geom,
  );
  const next = zoomAround(geom, view, newZoom, anchor.x, anchor.y);
  view = { zoom: next.zoom, cx: next.cx, cy: next.cy };
  drawPhoto();
}

const ZOOM_STEP = 1.5;
zoomInBtn.addEventListener('click', () => zoomTo(view.zoom * ZOOM_STEP));
zoomOutBtn.addEventListener('click', () => zoomTo(view.zoom / ZOOM_STEP));
zoomFitBtn.addEventListener('click', () => zoomTo(MIN_ZOOM));

stage.addEventListener(
  'wheel',
  (event) => {
    if (!originalBitmap) return;
    event.preventDefault();
    zoomTo(view.zoom * Math.exp(-event.deltaY * 0.002), event.clientX, event.clientY);
  },
  { passive: false },
);

stage.addEventListener('dblclick', (event) => {
  zoomTo(view.zoom > MIN_ZOOM ? MIN_ZOOM : 2.5, event.clientX, event.clientY);
});

// One pointer drags the photo. Two pointers pinch to zoom.
const pointers = new Map();
let pinchDistance = 0;

function pinchInfo() {
  const [a, b] = [...pointers.values()];
  return { distance: Math.hypot(a.x - b.x, a.y - b.y), midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2 };
}

stage.addEventListener('pointerdown', (event) => {
  if (!originalBitmap) return;
  stage.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2) pinchDistance = pinchInfo().distance;
  if (pointers.size === 1) stage.classList.add('dragging');
});

stage.addEventListener('pointermove', (event) => {
  const last = pointers.get(event.pointerId);
  if (!last || !originalBitmap) return;
  const geom = viewGeometry();
  if (pointers.size === 1) {
    if (view.zoom > MIN_ZOOM) {
      const next = panBy(geom, view, (event.clientX - last.x) * geom.ratio, (event.clientY - last.y) * geom.ratio);
      view = { zoom: next.zoom, cx: next.cx, cy: next.cy };
      scheduleDraw();
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    return;
  }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2 && pinchDistance > 0) {
    const { distance, midX, midY } = pinchInfo();
    const anchor = fromStageCenter(midX, midY, geom);
    const next = zoomAround(geom, view, view.zoom * (distance / pinchDistance), anchor.x, anchor.y);
    view = { zoom: next.zoom, cx: next.cx, cy: next.cy };
    pinchDistance = distance;
    scheduleDraw();
  }
});

function endPointer(event) {
  pointers.delete(event.pointerId);
  pinchDistance = 0;
  if (pointers.size === 0) stage.classList.remove('dragging');
}
stage.addEventListener('pointerup', endPointer);
stage.addEventListener('pointercancel', endPointer);

/** Build the small whole-photo copy the palette reads from. */
function buildPaletteBase() {
  const size = 200;
  const scale = Math.min(1, size / Math.max(originalBitmap.width, originalBitmap.height));
  const w = Math.max(1, Math.round(originalBitmap.width * scale));
  const h = Math.max(1, Math.round(originalBitmap.height * scale));
  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const smallCtx = small.getContext('2d', { willReadFrequently: true });
  smallCtx.imageSmoothingQuality = 'high';
  smallCtx.drawImage(originalBitmap, 0, 0, w, h);
  paletteBase = smallCtx.getImageData(0, 0, w, h);
}

/** The whole photo, small, with the current edits applied. */
function paletteFrame() {
  if (isDefaultSettings(settings)) return paletteBase;
  const frame = new ImageData(new Uint8ClampedArray(paletteBase.data), paletteBase.width, paletteBase.height);
  applyAdjustments(frame.data, settings);
  return frame;
}

/* ---------- Undo, redo, reset, cancel, confirm ---------- */

/** True when the controls differ from the last confirmed edit. */
function hasPendingChanges() {
  return !history.isCurrent(settings);
}

function updateHistoryButtons() {
  const pending = hasPendingChanges();
  undoBtn.disabled = !(pending || history.canUndo());
  redoBtn.disabled = pending || !history.canRedo();
  resetBtn.disabled = isDefaultSettings(settings) && !pending;
  cancelBtn.disabled = !pending;
  confirmBtn.disabled = !pending;
}

/** Jump to settings from history, or reset, and redraw everything. */
function restoreSettings(next) {
  settings = { ...next };
  renderPreview();
  settingsChanged();
}

/** Keep the pending changes as one undo step. */
function confirmChanges() {
  history.push(settings);
  updateHistoryButtons();
}

/* ---------- Palette ---------- */

let copiedHex = '';

function markCopied(hex) {
  copiedHex = hex;
  for (const row of swatchBox.children) {
    row.querySelector('.swatch-action').textContent = row.dataset.hex === hex ? 'Copied' : 'Copy';
  }
}

function refreshPalette() {
  if (!paletteBase || !paletteDirty) return;
  paletteDirty = false;
  // The palette is taken from the edited photo, so it matches what the user sees.
  const palette = extractPalette(paletteFrame().data, { count: 5 });

  gradientBar.style.background = gradientCss(gradientStops(palette));
  swatchBox.replaceChildren();
  for (const { hex } of palette) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'swatch-row';
    row.dataset.hex = hex;
    row.setAttribute('aria-label', `Copy color ${hex}`);

    const chip = document.createElement('span');
    chip.className = 'swatch-chip';
    chip.style.background = hex;
    const code = document.createElement('span');
    code.className = 'swatch-hex';
    code.textContent = hex;
    const action = document.createElement('span');
    action.className = 'swatch-action';
    action.textContent = hex === copiedHex ? 'Copied' : 'Copy';

    row.append(chip, code, action);
    row.addEventListener('click', () => copyColor(hex));
    swatchBox.append(row);
  }
}

async function copyColor(hex) {
  const ok = await copyText(hex);
  copyStatus.textContent = ok
    ? `Copied ${hex}`
    : `Could not copy. The code is ${hex}.`;
  if (ok) markCopied(hex);
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copyStatus.textContent = '';
    markCopied('');
  }, 2500);
}

/* ---------- Photo import and export ---------- */

async function handleFile(file) {
  try {
    const bitmap = await loadImageFromFile(file);
    if (originalBitmap) originalBitmap.close();
    originalBitmap = bitmap;
    originalName = file.name;
    view = { zoom: 1, cx: 0.5, cy: 0.5 };
    buildPaletteBase();
    settings = { ...DEFAULT_SETTINGS };
    history = createHistory(settings);
    copiedHex = '';
    copyStatus.textContent = '';
    buildFilterGrid();
    photoName.textContent = displayName(file.name);
    photoName.title = photoName.textContent;
    photoInfo.textContent = `${bitmap.width} × ${bitmap.height}`;
    settingsChanged();
    showScreen('editor');
    showTab('adjust');
    drawPhoto();
  } catch (err) {
    showImport(err.message);
  }
}

/** Render the full-size photo with the current edits as a File. */
async function renderExportFile() {
  const format = document.querySelector('input[name="format"]:checked').value;
  const blob = await renderToBlob(originalBitmap, settings, format);
  return new File([blob], exportFileName(originalName, format), { type: blob.type });
}

async function handleExport() {
  saveBtn.disabled = true;
  exportStatus.textContent = 'Preparing your photo...';
  try {
    const file = await renderExportFile();
    downloadBlob(file, file.name);
    exportStatus.textContent = `Saved as ${file.name}`;
  } catch (err) {
    exportStatus.textContent = err.message;
  } finally {
    saveBtn.disabled = false;
  }
}

// Sharing needs a tap that is only a few seconds old. A big photo can take
// longer than that to render, so the finished file is kept. If the browser
// refuses the first share, the second tap is instant.
let shareCache = { key: '', file: null };

async function handleShare() {
  shareBtn.disabled = true;
  exportStatus.textContent = 'Preparing your photo...';
  try {
    const format = document.querySelector('input[name="format"]:checked').value;
    const key = JSON.stringify([settings, format, originalName, originalBitmap.width]);
    if (shareCache.key !== key) shareCache = { key, file: await renderExportFile() };
    const result = await shareFile(shareCache.file);
    exportStatus.textContent =
      result === 'shared' ? 'Shared.' : result === 'cancelled' ? '' : 'Sharing is not available here. Use Export instead.';
  } catch (err) {
    exportStatus.textContent =
      err && err.name === 'NotAllowedError' ? 'Tap Share once more to open the share sheet.' : 'Sharing failed. Use Export instead.';
  } finally {
    shareBtn.disabled = false;
  }
}

/* ---------- Camera ---------- */

let cameraStream = null;
let cameraFacing = 'environment';
let cameraRun = 0; // bumped on every open, switch, and close so a late answer from an old request is ignored

async function beginCamera(facing) {
  const run = ++cameraRun;
  stopStream(cameraStream);
  cameraStream = null;
  shutterBtn.disabled = true;
  cameraStatus.textContent = 'Starting the camera...';
  try {
    const stream = await startCamera(facing);
    if (run !== cameraRun) {
      stopStream(stream);
      return;
    }
    cameraStream = stream;
    cameraFacing = facing;
    const reported = stream.getVideoTracks()[0]?.getSettings?.().facingMode;
    video.classList.toggle('mirrored', reported === 'user');
    video.srcObject = stream;
    await video.play().catch(() => {});
    if (run !== cameraRun) return;
    cameraStatus.textContent = '';
    shutterBtn.disabled = false;
  } catch (err) {
    if (run !== cameraRun) return;
    closeCamera();
    showImport(cameraErrorMessage(err));
  }
}

function closeCamera() {
  cameraRun++;
  stopStream(cameraStream);
  cameraStream = null;
  video.srcObject = null;
}

async function openCamera() {
  if (!cameraSupported()) {
    showImport('This browser cannot use the camera here. Choose a photo instead.');
    return;
  }
  importError.hidden = true;
  showScreen('camera');
  await beginCamera(cameraFacing);
}

async function takePhoto() {
  shutterBtn.disabled = true;
  try {
    const file = await captureFrame(video);
    closeCamera();
    await handleFile(file);
  } catch (err) {
    cameraStatus.textContent = err.message;
    shutterBtn.disabled = false;
  }
}

/* ---------- Install ---------- */

const installer = createInstaller(window, (canInstall) => {
  installBtn.hidden = !canInstall;
});

async function handleInstall() {
  const result = await installer.prompt();
  installHint.hidden = false;
  installHint.textContent = result === 'accepted' ? 'Installing PhotoMoj...' : '';
  installHint.hidden = !installHint.textContent;
}

function setupInstallHint() {
  if (isStandalone()) return;
  if (isIos()) {
    installHint.textContent = IOS_INSTALL_HINT;
    installHint.hidden = false;
  }
}

/* ---------- Wiring ---------- */

buildSliders();
updateReadouts();

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  fileInput.value = ''; // lets the same photo be chosen again
  if (file) handleFile(file);
});

backImportBtn.addEventListener('click', () => {
  const hasEdits = !isDefaultSettings(settings) || history.canUndo();
  if (hasEdits && !window.confirm('Go back to import? Your edits to this photo will be lost.')) return;
  showImport();
});

// With unconfirmed changes, Undo throws them away. Otherwise it steps back one confirmed edit.
undoBtn.addEventListener('click', () => restoreSettings(hasPendingChanges() ? history.current() : history.undo()));
redoBtn.addEventListener('click', () => restoreSettings(history.redo()));
cancelBtn.addEventListener('click', () => restoreSettings(history.current()));
confirmBtn.addEventListener('click', confirmChanges);
resetBtn.addEventListener('click', () => {
  history.push({ ...DEFAULT_SETTINGS });
  restoreSettings(DEFAULT_SETTINGS);
});

tabs.adjust.tab.addEventListener('click', () => showTab('adjust'));
tabs.filters.tab.addEventListener('click', () => showTab('filters'));
tabs.palette.tab.addEventListener('click', () => showTab('palette'));

exportBtn.addEventListener('click', () => {
  exportStatus.textContent = '';
  showScreen('export');
});

backBtn.addEventListener('click', () => {
  showScreen('editor');
  drawPhoto();
});

saveBtn.addEventListener('click', handleExport);

cameraBtn.addEventListener('click', openCamera);
shutterBtn.addEventListener('click', takePhoto);
flipBtn.addEventListener('click', () => beginCamera(otherFacing(cameraFacing)));
cameraCancelBtn.addEventListener('click', () => {
  closeCamera();
  showImport();
});
window.addEventListener('pagehide', closeCamera);

installBtn.addEventListener('click', handleInstall);
setupInstallHint();

shareBtn.hidden = !canShareFile(new File([''], 'photo.jpg', { type: 'image/jpeg' }));
shareBtn.addEventListener('click', handleShare);

window.addEventListener('resize', scheduleDraw);

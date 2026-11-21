import { describe, it, expect } from 'vitest';
import { MAX_ZOOM, clampZoom, computeView, fitScale, formatZoom, panBy, zoomAround } from '../src/core/viewport.js';

const geom = { imgW: 2000, imgH: 1000, boxW: 400, boxH: 400 };

describe('clampZoom and fitScale', () => {
  it('keeps zoom between 1 and the maximum', () => {
    expect(clampZoom(0.2)).toBe(1);
    expect(clampZoom(50)).toBe(MAX_ZOOM);
    expect(clampZoom(NaN)).toBe(1);
    expect(clampZoom(2.5)).toBe(2.5);
  });

  it('fits a photo in the box and does not enlarge past maxScale', () => {
    expect(fitScale(2000, 1000, 400, 400)).toBeCloseTo(0.2);
    expect(fitScale(100, 100, 400, 400)).toBe(1);
    expect(fitScale(100, 100, 400, 400, 2)).toBe(2);
    expect(fitScale(0, 100, 400, 400)).toBe(0);
  });
});

describe('computeView', () => {
  it('shows the whole photo at zoom 1', () => {
    const v = computeView(geom, { zoom: 1 });
    expect(v).toMatchObject({ sx: 0, sy: 0, sw: 2000, sh: 1000, dw: 400, dh: 200, cx: 0.5, cy: 0.5 });
  });

  it('shows a smaller part of the photo when zoomed in, filling the box', () => {
    const v = computeView(geom, { zoom: 4 });
    expect(v.sw).toBeCloseTo(500);
    expect(v.sh).toBeCloseTo(500);
    expect(v.dw).toBe(400);
    expect(v.dh).toBe(400);
  });

  it('keeps the view inside the photo', () => {
    const v = computeView(geom, { zoom: 4, cx: 5, cy: -3 });
    expect(v.sx + v.sw).toBeCloseTo(2000);
    expect(v.sy).toBe(0);
  });

  it('returns an empty view for an empty box', () => {
    expect(computeView({ ...geom, boxW: 0 }, { zoom: 2 }).dw).toBe(0);
  });
});

describe('panBy', () => {
  it('dragging right reveals the left side', () => {
    const start = computeView(geom, { zoom: 4, cx: 0.5, cy: 0.5 });
    const moved = panBy(geom, start, 100, 0);
    expect(moved.cx).toBeLessThan(start.cx);
    expect(moved.cy).toBeCloseTo(start.cy);
  });

  it('cannot drag past the edge', () => {
    const moved = panBy(geom, { zoom: 4, cx: 0.5, cy: 0.5 }, 100000, 100000);
    expect(moved.sx).toBe(0);
    expect(moved.sy).toBe(0);
  });
});

describe('zoomAround', () => {
  it('zooming at the middle keeps the center', () => {
    const v = zoomAround(geom, { zoom: 1 }, 2, 0, 0);
    expect(v.zoom).toBe(2);
    expect(v.cx).toBeCloseTo(0.5);
  });

  it('keeps the photo point under the cursor in place', () => {
    const before = computeView(geom, { zoom: 2, cx: 0.5, cy: 0.5 });
    const ax = 100;
    const ay = -50;
    const pointX = before.sx + before.sw / 2 + ax / before.scale;
    const pointY = before.sy + before.sh / 2 + ay / before.scale;
    const after = zoomAround(geom, before, 4, ax, ay);
    expect(after.sx + after.sw / 2 + ax / after.scale).toBeCloseTo(pointX);
    expect(after.sy + after.sh / 2 + ay / after.scale).toBeCloseTo(pointY);
  });

  it('zooming out to 1 recenters the photo', () => {
    const v = zoomAround(geom, { zoom: 4, cx: 0.9, cy: 0.1 }, 1, 50, 50);
    expect(v.zoom).toBe(1);
    expect(v.cx).toBeCloseTo(0.5);
  });
});

describe('formatZoom', () => {
  it('writes zoom as a multiplier', () => {
    expect(formatZoom(1)).toBe('1x');
    expect(formatZoom(2.54)).toBe('2.5x');
  });
});

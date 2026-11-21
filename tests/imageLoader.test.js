import { describe, it, expect } from 'vitest';
import { fitSize, isImageFile } from '../src/core/imageLoader.js';

describe('fitSize', () => {
  it('shrinks a wide photo to fit the box width', () => {
    expect(fitSize(2000, 1000, 500, 500)).toEqual({ width: 500, height: 250 });
  });

  it('shrinks a tall photo to fit the box height', () => {
    expect(fitSize(1000, 2000, 500, 500)).toEqual({ width: 250, height: 500 });
  });

  it('never scales a small photo up', () => {
    expect(fitSize(100, 50, 500, 500)).toEqual({ width: 100, height: 50 });
  });

  it('keeps the aspect ratio', () => {
    const { width, height } = fitSize(4000, 3000, 390, 600);
    expect(width / height).toBeCloseTo(4 / 3, 1);
  });

  it('returns zero size for empty input', () => {
    expect(fitSize(0, 100, 500, 500)).toEqual({ width: 0, height: 0 });
    expect(fitSize(100, 100, 0, 500)).toEqual({ width: 0, height: 0 });
  });
});

describe('isImageFile', () => {
  it('accepts image types', () => {
    expect(isImageFile({ type: 'image/jpeg' })).toBe(true);
    expect(isImageFile({ type: 'image/png' })).toBe(true);
  });

  it('rejects other files and missing input', () => {
    expect(isImageFile({ type: 'application/pdf' })).toBe(false);
    expect(isImageFile(null)).toBe(false);
  });
});

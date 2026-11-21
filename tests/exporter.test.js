import { describe, it, expect } from 'vitest';
import { getFormat, exportFileName, displayName } from '../src/core/exporter.js';

describe('getFormat', () => {
  it('returns the right type for JPG and PNG', () => {
    expect(getFormat('png')).toMatchObject({ mime: 'image/png', ext: 'png' });
    expect(getFormat('jpg')).toMatchObject({ mime: 'image/jpeg', ext: 'jpg', quality: 0.92 });
  });

  it('rejects an unknown format', () => {
    expect(() => getFormat('gif')).toThrow();
  });
});

describe('exportFileName', () => {
  it('swaps the extension and adds photomoj', () => {
    expect(exportFileName('IMG_001.JPG', 'png')).toBe('IMG_001-photomoj.png');
  });

  it('cleans spaces and symbols', () => {
    expect(exportFileName('My Trip (1).jpeg', 'jpg')).toBe('My-Trip-1-photomoj.jpg');
  });

  it('falls back to "photo" when there is no usable name', () => {
    expect(exportFileName('', 'png')).toBe('photo-photomoj.png');
    expect(exportFileName(undefined, 'jpg')).toBe('photo-photomoj.jpg');
  });
});

describe('displayName', () => {
  it('turns a file name into a readable title', () => {
    expect(displayName('alpine_morning.jpg')).toBe('alpine morning');
    expect(displayName('IMG-2041.HEIC')).toBe('IMG 2041');
    expect(displayName('My Trip.final.png')).toBe('My Trip.final');
  });

  it('falls back when there is no usable name', () => {
    expect(displayName('')).toBe('Your photo');
    expect(displayName(undefined)).toBe('Your photo');
    expect(displayName('.png')).toBe('Your photo');
  });
});

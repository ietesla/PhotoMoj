import { describe, it, expect, vi } from 'vitest';
import { canShareFile, shareFile } from '../src/platform/share.js';

const file = { name: 'a.jpg' };

describe('canShareFile', () => {
  it('needs share and canShare', () => {
    expect(canShareFile(file, { navigator: {} })).toBe(false);
    expect(canShareFile(file, { navigator: { share() {} } })).toBe(false);
    expect(canShareFile(file, { navigator: { share() {}, canShare: () => true } })).toBe(true);
    expect(canShareFile(file, { navigator: { share() {}, canShare: () => false } })).toBe(false);
  });
  it('treats a throwing canShare as no', () => {
    const canShare = () => {
      throw new Error('x');
    };
    expect(canShareFile(file, { navigator: { share() {}, canShare } })).toBe(false);
  });
});

describe('shareFile', () => {
  it('shares the file', async () => {
    const share = vi.fn().mockResolvedValue();
    const env = { navigator: { share, canShare: () => true } };
    expect(await shareFile(file, env)).toBe('shared');
    expect(share.mock.calls[0][0].files).toEqual([file]);
  });
  it('reports unsupported', async () => {
    expect(await shareFile(file, { navigator: {} })).toBe('unsupported');
  });
  it('treats closing the sheet as cancelled', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    expect(await shareFile(file, { navigator: { share, canShare: () => true } })).toBe('cancelled');
  });
  it('passes other errors up', async () => {
    const share = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(shareFile(file, { navigator: { share, canShare: () => true } })).rejects.toThrow('boom');
  });
});

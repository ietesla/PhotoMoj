import { describe, it, expect, vi } from 'vitest';
import { copyText } from '../src/platform/clipboard.js';

function fakeDocument(copyResult = true) {
  const added = [];
  const field = { style: {}, setAttribute() {}, select: vi.fn() };
  return {
    added,
    field,
    createElement: () => field,
    body: {
      appendChild: (el) => added.push(el),
      removeChild: (el) => added.splice(added.indexOf(el), 1),
    },
    execCommand: vi.fn(() => copyResult),
  };
}

describe('copyText', () => {
  it('uses the Clipboard API on a secure page', async () => {
    const writeText = vi.fn().mockResolvedValue();
    const env = { isSecureContext: true, navigator: { clipboard: { writeText } }, document: fakeDocument() };
    expect(await copyText('#E8503F', env)).toBe(true);
    expect(writeText).toHaveBeenCalledWith('#E8503F');
    expect(env.document.execCommand).not.toHaveBeenCalled();
  });

  it('falls back to the copy command when the page is not secure', async () => {
    const writeText = vi.fn();
    const doc = fakeDocument();
    const env = { isSecureContext: false, navigator: { clipboard: { writeText } }, document: doc };
    expect(await copyText('#123456', env)).toBe(true);
    expect(writeText).not.toHaveBeenCalled();
    expect(doc.execCommand).toHaveBeenCalledWith('copy');
    expect(doc.field.value).toBe('#123456');
    expect(doc.added).toHaveLength(0); // temporary field was removed
  });

  it('falls back when the Clipboard API refuses', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    const doc = fakeDocument();
    const env = { isSecureContext: true, navigator: { clipboard: { writeText } }, document: doc };
    expect(await copyText('#ABCDEF', env)).toBe(true);
    expect(doc.execCommand).toHaveBeenCalled();
  });

  it('reports failure when nothing can copy', async () => {
    const doc = fakeDocument(false);
    expect(await copyText('x', { isSecureContext: false, navigator: {}, document: doc })).toBe(false);
    expect(await copyText('x', { navigator: {} })).toBe(false);
  });
});

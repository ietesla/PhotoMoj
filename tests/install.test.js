import { describe, it, expect, vi } from 'vitest';
import { createInstaller, isIos, isStandalone } from '../src/platform/install.js';

function fakeWindow() {
  const handlers = {};
  return {
    handlers,
    addEventListener: (name, fn) => {
      handlers[name] = fn;
    },
  };
}

describe('isStandalone', () => {
  it('detects display-mode standalone', () => {
    expect(isStandalone({ matchMedia: () => ({ matches: true }), navigator: {} })).toBe(true);
    expect(isStandalone({ matchMedia: () => ({ matches: false }), navigator: {} })).toBe(false);
  });
  it('detects iOS standalone', () => {
    expect(isStandalone({ navigator: { standalone: true } })).toBe(true);
    expect(isStandalone({ navigator: {} })).toBe(false);
  });
});

describe('isIos', () => {
  it('detects iPhone and iPad on Mac mode', () => {
    expect(isIos({ navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' } })).toBe(true);
    expect(isIos({ navigator: { userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5 } })).toBe(true);
    expect(isIos({ navigator: { userAgent: 'Windows NT 10.0', platform: 'Win32', maxTouchPoints: 0 } })).toBe(false);
  });
});

describe('createInstaller', () => {
  it('keeps the prompt and reports it can install', () => {
    const win = fakeWindow();
    const onChange = vi.fn();
    const installer = createInstaller(win, onChange);
    expect(installer.canPrompt()).toBe(false);
    const preventDefault = vi.fn();
    win.handlers.beforeinstallprompt({ preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(installer.canPrompt()).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  it('shows the dialog and reports the choice', async () => {
    const win = fakeWindow();
    const installer = createInstaller(win);
    const prompt = vi.fn().mockResolvedValue();
    win.handlers.beforeinstallprompt({ preventDefault() {}, prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) });
    expect(await installer.prompt()).toBe('accepted');
    expect(prompt).toHaveBeenCalled();
    expect(installer.canPrompt()).toBe(false);
  });

  it('reports dismissed and unavailable', async () => {
    const win = fakeWindow();
    const installer = createInstaller(win);
    expect(await installer.prompt()).toBe('unavailable');
    win.handlers.beforeinstallprompt({
      preventDefault() {},
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    });
    expect(await installer.prompt()).toBe('dismissed');
  });

  it('hides the button after the app is installed', () => {
    const win = fakeWindow();
    const onChange = vi.fn();
    const installer = createInstaller(win, onChange);
    win.handlers.beforeinstallprompt({ preventDefault() {} });
    win.handlers.appinstalled();
    expect(installer.canPrompt()).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});

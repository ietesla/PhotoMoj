// "Install as an app" support. Chrome and Edge send an install prompt event
// that the app keeps and shows on a button. iPhone Safari has no such event,
// so there the app shows the manual steps instead.

/** True when the app is already running as an installed app. */
export function isStandalone(env = globalThis) {
  const media = typeof env.matchMedia === 'function' ? env.matchMedia('(display-mode: standalone)') : null;
  return Boolean((media && media.matches) || (env.navigator && env.navigator.standalone === true));
}

/** True on iPhone and iPad, where installing is a manual step in Safari. */
export function isIos(env = globalThis) {
  const nav = env.navigator || {};
  const ua = String(nav.userAgent || '');
  const iPadOnMac = nav.platform === 'MacIntel' && nav.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadOnMac;
}

export const IOS_INSTALL_HINT = 'To install on iPhone: tap the Share button in Safari, then Add to Home Screen.';

/**
 * Keep the browser's install prompt until the person taps the button.
 * Calls onChange with true when installing is possible and false when it is
 * done or no longer possible.
 */
export function createInstaller(env = globalThis, onChange = () => {}) {
  let deferred = null;

  env.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    onChange(true);
  });
  env.addEventListener('appinstalled', () => {
    deferred = null;
    onChange(false);
  });

  return {
    canPrompt: () => deferred !== null,
    /** Show the browser's install dialog. Returns "accepted", "dismissed" or "unavailable". */
    async prompt() {
      if (!deferred) return 'unavailable';
      const event = deferred;
      deferred = null;
      onChange(false);
      await event.prompt();
      const choice = await event.userChoice;
      return choice && choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
    },
  };
}

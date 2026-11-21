// Share a finished photo with other apps (messages, mail, social apps) using
// the phone's share sheet. Browsers without it fall back to a normal download.

/** True when this browser can share a file of the given type. */
export function canShareFile(file, env = globalThis) {
  const nav = env.navigator;
  if (!nav || typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return false;
  try {
    return Boolean(nav.canShare({ files: [file] }));
  } catch {
    return false;
  }
}

/**
 * Open the share sheet for a file. Returns "shared", "cancelled" (the person
 * closed the sheet, which is not an error), or "unsupported".
 */
export async function shareFile(file, env = globalThis) {
  if (!canShareFile(file, env)) return 'unsupported';
  try {
    await env.navigator.share({ files: [file], title: 'PhotoMoj photo' });
    return 'shared';
  } catch (err) {
    if (err && err.name === 'AbortError') return 'cancelled';
    throw err;
  }
}

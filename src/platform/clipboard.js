// Copies text to the system clipboard.
// The Clipboard API only works on secure pages (https or localhost). When it is
// not available, fall back to the older copy command so copying still works,
// for example when the page is opened from a plain address.

function legacyCopy(text, doc) {
  const field = doc.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  doc.body.appendChild(field);
  field.select();
  let ok = false;
  try {
    ok = Boolean(doc.execCommand('copy'));
  } catch {
    ok = false;
  }
  doc.body.removeChild(field);
  return ok;
}

/**
 * Copy text and report whether it worked. The second argument lets tests
 * pass in a fake browser; the app uses the real one.
 */
export async function copyText(text, env = globalThis) {
  const clipboard = env.navigator && env.navigator.clipboard;
  if (clipboard && env.isSecureContext) {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      // Permission was refused or the page lost focus. Try the older way.
    }
  }
  if (env.document) return legacyCopy(text, env.document);
  return false;
}

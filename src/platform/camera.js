// Camera access. Turns a live camera stream into a still photo that goes
// through the same path as a chosen file, so nothing else in the app changes.
// Every function takes the browser as an optional last argument so tests can
// pass in a fake one.

/** True when this browser and page can ask for a camera. */
export function cameraSupported(env = globalThis) {
  return Boolean(
    env.navigator && env.navigator.mediaDevices && typeof env.navigator.mediaDevices.getUserMedia === 'function',
  );
}

/** Turn a camera error into a sentence a person can act on. */
export function cameraErrorMessage(err) {
  const name = err && err.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access was blocked. Allow the camera in your browser settings, or choose a photo instead.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found on this device. Choose a photo instead.';
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return 'The camera is busy in another app. Close it there and try again.';
  }
  return 'The camera could not start. Choose a photo instead.';
}

/**
 * Open a camera. "environment" is the back camera on a phone and falls back
 * to whatever camera exists on a laptop. Asks for a high resolution; the
 * browser gives the closest it has.
 */
export async function startCamera(facingMode = 'environment', env = globalThis) {
  if (!cameraSupported(env)) {
    const err = new Error('unsupported');
    err.name = 'NotFoundError';
    throw err;
  }
  return env.navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: facingMode }, width: { ideal: 4096 }, height: { ideal: 3072 } },
  });
}

/** Release the camera so the browser's recording light turns off. */
export function stopStream(stream) {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
}

/** The other camera: front becomes back and back becomes front. */
export function otherFacing(facingMode) {
  return facingMode === 'user' ? 'environment' : 'user';
}

/** A file name like PhotoMoj-camera-20261121-141530.jpg */
export function cameraFileName(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`;
  const time = `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
  return `PhotoMoj-camera-${day}-${time}.jpg`;
}

/**
 * Freeze the current video frame into a JPG File at the camera's real
 * resolution. The front camera preview is mirrored on screen only; the saved
 * photo is not mirrored, like a normal phone camera.
 */
export function captureFrame(video, doc = globalThis.document, now = new Date()) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return Promise.reject(new Error('The camera is not ready yet. Try again in a second.'));
  const canvas = doc.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(video, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('The photo could not be saved. Try again.'));
        const FileCtor = globalThis.File;
        resolve(new FileCtor([blob], cameraFileName(now), { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.95,
    );
  });
}

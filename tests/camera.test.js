import { describe, it, expect, vi } from 'vitest';
import {
  cameraSupported,
  cameraErrorMessage,
  startCamera,
  stopStream,
  otherFacing,
  cameraFileName,
  captureFrame,
} from '../src/platform/camera.js';

describe('cameraSupported', () => {
  it('is true only when getUserMedia exists', () => {
    expect(cameraSupported({ navigator: { mediaDevices: { getUserMedia() {} } } })).toBe(true);
    expect(cameraSupported({ navigator: { mediaDevices: {} } })).toBe(false);
    expect(cameraSupported({ navigator: {} })).toBe(false);
    expect(cameraSupported({})).toBe(false);
  });
});

describe('cameraErrorMessage', () => {
  it('explains a blocked camera', () => {
    expect(cameraErrorMessage({ name: 'NotAllowedError' })).toMatch(/blocked/i);
  });
  it('explains a missing camera', () => {
    expect(cameraErrorMessage({ name: 'NotFoundError' })).toMatch(/No camera/);
  });
  it('explains a busy camera', () => {
    expect(cameraErrorMessage({ name: 'NotReadableError' })).toMatch(/busy/i);
  });
  it('has a safe default', () => {
    expect(cameraErrorMessage(new Error('x'))).toMatch(/could not start/);
    expect(cameraErrorMessage(undefined)).toMatch(/could not start/);
  });
});

describe('startCamera', () => {
  it('asks for the back camera, no audio, by default', async () => {
    const getUserMedia = vi.fn().mockResolvedValue('stream');
    const env = { navigator: { mediaDevices: { getUserMedia } } };
    expect(await startCamera(undefined, env)).toBe('stream');
    const arg = getUserMedia.mock.calls[0][0];
    expect(arg.audio).toBe(false);
    expect(arg.video.facingMode).toEqual({ ideal: 'environment' });
  });
  it('rejects with a not-found error when unsupported', async () => {
    await expect(startCamera('user', {})).rejects.toMatchObject({ name: 'NotFoundError' });
  });
});

describe('stopStream and otherFacing', () => {
  it('stops every track', () => {
    const a = { stop: vi.fn() };
    const b = { stop: vi.fn() };
    stopStream({ getTracks: () => [a, b] });
    expect(a.stop).toHaveBeenCalled();
    expect(b.stop).toHaveBeenCalled();
    expect(() => stopStream(null)).not.toThrow();
  });
  it('flips between cameras', () => {
    expect(otherFacing('user')).toBe('environment');
    expect(otherFacing('environment')).toBe('user');
  });
});

describe('cameraFileName', () => {
  it('uses the date and time', () => {
    expect(cameraFileName(new Date(2026, 10, 21, 14, 5, 9))).toBe('PhotoMoj-camera-20261121-140509.jpg');
  });
});

describe('captureFrame', () => {
  function fakeDoc(blob) {
    const draw = vi.fn();
    const canvas = {
      getContext: () => ({ drawImage: draw }),
      toBlob: (cb) => cb(blob),
    };
    return { draw, canvas, doc: { createElement: () => canvas } };
  }

  it('captures at the full video size', async () => {
    const { draw, canvas, doc } = fakeDoc(new Blob(['x'], { type: 'image/jpeg' }));
    const video = { videoWidth: 1920, videoHeight: 1080 };
    const file = await captureFrame(video, doc, new Date(2026, 10, 21, 1, 2, 3));
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
    expect(draw).toHaveBeenCalledWith(video, 0, 0, 1920, 1080);
    expect(file.name).toBe('PhotoMoj-camera-20261121-010203.jpg');
    expect(file.type).toBe('image/jpeg');
  });

  it('refuses before the camera has a picture', async () => {
    const { doc } = fakeDoc(null);
    await expect(captureFrame({ videoWidth: 0, videoHeight: 0 }, doc)).rejects.toThrow(/not ready/);
  });

  it('reports a failed encode', async () => {
    const { doc } = fakeDoc(null);
    await expect(captureFrame({ videoWidth: 10, videoHeight: 10 }, doc)).rejects.toThrow(/could not be saved/);
  });
});

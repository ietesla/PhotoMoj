# PhotoMoj

**A little edit. A lot of you.**

PhotoMoj is a simple photo editor that runs in your browser, on a computer or a phone. Pick a photo or take one, adjust it, give it a mood with a filter, and pull a color palette out of it. No account, no ads, no uploads. Your photos never leave your device.

This is the proof of concept for Project & Portfolio IV.

## What it does

**Get a photo in**
- Choose a photo from your device, or take one with the camera (front or back).
- Phone photos are rotated the right way on import.

**Adjust**
- Four sliders: hue, brightness, contrast, and saturation.
- The preview changes live as you drag.

**Filters**
- Original, Golden, Cool, and Mono. Each tile shows a preview made from your own photo.
- A strength slider sets how much of the filter is applied.

**Palette**
- Five main colors pulled from the photo, with a gradient built from them.
- Tap a color to copy its hex code, for example `#E6B992`.
- The palette follows your edits, so it always matches what you see.

**Stay in control**
- Edits are staged. **Confirm changes** keeps them as one step, and **Cancel changes** throws them away.
- Undo, redo, and reset. Reset can be undone too.
- Zoom the preview up to 8x with the buttons, the mouse wheel, pinch, or double tap, and drag to move around. Zoom only changes the view, never the photo.

**Save and share**
- Export as JPG or PNG at the photo's full size, with your edits included.
- Share through the device's share sheet, on browsers that support it.
- Install it as an app. After the first visit it also works with no connection.

## Run it on your computer (Windows)

1. On GitHub, click the green **Code** button, then **Download ZIP**.
2. Right-click the ZIP file and choose **Extract All**. Do not run it from inside the ZIP.
3. Install the LTS version of Node.js from https://nodejs.org if you do not have it.
4. Open the extracted folder and double-click `start-photomoj.bat`.
5. The first run installs packages, which can take a minute. Then PhotoMoj opens in your browser at http://localhost:3000.
6. Keep the black window open while you use PhotoMoj. Close it to stop the app.

On Mac or Linux the batch file will not work. Use the terminal steps below.

### Run it from a terminal

Needs Node.js 20 or newer. This works on Windows, Mac, and Linux.

```
npm install
npm run dev        # development server with hot reload
npm test           # unit tests
npm start          # build, then serve dist/ with Express at http://localhost:3000
```

### If something looks wrong

- **The old version shows up.** Another PhotoMoj window may still be open and using port 3000. The launcher now says so and stops. Close the other window and start again. The app also saves a copy in the browser so it can work offline, so you may need to clear it: press F12, open **Application**, then **Storage**, and choose **Clear site data**.
- **A build error mentions a missing package.** Run `npm install` once in the project folder.

## Run it online

The workflow in `.github/workflows/deploy.yml` tests and builds the app on every push to `main`, then publishes it to GitHub Pages.

1. On GitHub open **Settings**, then **Pages**, and set **Source** to **GitHub Actions**.
2. Push to `main`. The **Actions** tab shows the run, and the link appears there when it finishes.
3. The app lives at `https://<your-user>.github.io/<repo-name>/`.

Pages uses https, which phones need for the camera and for installing the app. Locally, `BASE_PATH` sets the folder the app is served from. It defaults to `/`.

## How it works

- **The original is never edited.** The photo stays in memory untouched. The screen shows a preview, and every edit is applied to a fresh copy of it. That one rule makes undo, zoom, and export simple.
- **Order of edits.** Brightness, then contrast, then hue and saturation together, then the filter. Hue and saturation share one RGB to HSL pass. Gray pixels and transparency are left alone.
- **Filters** push each pixel toward a look (warm, cool, or gray) and the strength slider sets how far, from 0 to 100.
- **Export** draws the full-size original again with the same settings, so the saved file matches the preview at the photo's real resolution. JPG is placed on a white background because it has no transparency.
- **Zoom** redraws the visible part of the original at screen resolution, so detail appears as you zoom in. The palette reads its own small copy of the whole photo, so zooming does not change it.
- **Palette** is found with k-means clustering on about 6000 sampled pixels of the edited photo. Copying uses the Clipboard API, with a backup method for pages where it is blocked.
- **Undo and redo** store small snapshots of the settings, not pixels.
- **Camera** uses `getUserMedia`. A shutter press copies the current video frame to a canvas at the camera's full resolution and hands it to the same loader as a chosen file, so everything after that is identical. The camera stops as soon as the photo is taken.
- **Share** uses the Web Share API with a file and only appears where the browser can share files, mostly on phones. Export always works.
- **Install and offline use** come from a web app manifest and a service worker made by `vite-plugin-pwa`. Chrome and Edge show an Install button. On iPhone, Safari needs Share, then Add to Home Screen, and the app says so.
- **Express** only serves the built files from `dist/`. The built app is plain static files, so any static host can serve it.

## Privacy

Everything happens in your browser. The code makes no network requests of its own, uses no cookies or browser storage for your data, and has no accounts, ads, or tracking. The camera and clipboard are only used when you tap the matching button.

## Tech

Vanilla JavaScript, HTML5 Canvas, Vite, `vite-plugin-pwa`, Node.js with Express for the local launcher, and Vitest for tests.

## Project layout

```
server/index.js            Express launcher
src/main.js                App entry, connects the screens
src/style.css              Styles and layout
src/core/adjustments.js    Brightness, contrast, saturation, hue, settings
src/core/filters.js        Golden, Cool, Mono and strength
src/core/palette.js        k-means palette and gradient
src/core/history.js        Undo and redo snapshots
src/core/viewport.js       Zoom and pan math
src/core/colorUtils.js     RGB, HSL, and hex conversion
src/core/imageLoader.js    Load a photo, fix rotation, fit it to the screen
src/core/exporter.js       Render the full-size file for download
src/platform/camera.js     Camera stream and capture a frame
src/platform/clipboard.js  Copy text with a backup method
src/platform/share.js      Web Share with a file
src/platform/install.js    Install prompt and iPhone hint
src/platform/download.js   Save a file to the device
tests/                     Vitest unit tests (118)
public/                    App icons
.github/workflows/         Pages deploy
```

## Status

Built and working: import, camera, four adjust sliders, filters with strength, palette with tap to copy, undo, redo, reset, confirm and cancel, zoom and pan, export, share, install, offline use, and automatic publishing to GitHub Pages.

Tested in a desktop browser with 118 unit tests and an automated browser run. Camera, share, and install still need a check on a real phone.

Planned next: crop and a hold-to-compare button for before and after. See the Trello roadmap for the full plan.

## License

MIT. See `LICENSE`.

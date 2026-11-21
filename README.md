# PhotoMoj

A simple photo editor for web and phone. This is the proof of concept for Project & Portfolio IV.

Two pillars: adjust a photo, and pull a color palette from it. No accounts, no ads, no cloud storage.

## Quick start (Windows)

1. On GitHub, click the green **Code** button, then **Download ZIP**.
2. Right-click the ZIP file and choose **Extract All**. Do not run it from inside the ZIP.
3. Install the LTS version of Node.js from https://nodejs.org if it is not installed yet.
4. Open the extracted folder and double-click `start-photomoj.bat`.
5. The first run installs packages, which can take a minute. Then PhotoMoj opens in your browser at http://localhost:3000.
6. Keep the black window open while you use PhotoMoj. Close it to stop the app.

This runs PhotoMoj on your own computer. Once the app is published (see Publish online below), you can skip all of this and open the link instead.

On Mac or Linux, the batch file will not work. Use the terminal steps below instead.

## Current status

| Step | What | Status |
| --- | --- | --- |
| 0 | Project setup (Vite, Express, Vitest) | Done |
| 1 | Import a photo and draw it on a canvas | Done |
| 2 | Hue slider with live preview | Done |
| 3 | Export as JPG or PNG at full size | Done |
| 4 | Brightness, contrast, saturation sliders | Done |
| 5 | Palette tool (k-means swatches, gradient, tap to copy hex) | Done |
| 6 | Undo, redo, reset | Done |
| 7 | Preview zoom and pan (buttons, wheel, pinch, drag, double tap) | Done |
| 8 | Camera (getUserMedia), front and back, goes into the same editor | Done |
| 9 | Share (Web Share API), shown only where the browser supports it | Done |
| 10 | Install as an app (manifest, service worker, works offline) | Done |
| 11 | Publish to GitHub Pages with an automatic workflow | Done, needs one setting (below) |
| 12 | Redesigned editor: header, tool rail, Cancel and Confirm, photo name and size caption | Done |
| 13 | Filters (Original, Golden, Cool, Mono) with a strength slider and previews of your own photo | Done |

Not built yet: crop and compare. See the Trello roadmap for the plan.

## Publish online

The workflow in `.github/workflows/deploy.yml` tests and builds the app on every push to `main`, then publishes it to GitHub Pages.

1. On GitHub open **Settings**, then **Pages**, and set **Source** to **GitHub Actions**.
2. Push to `main`. The **Actions** tab shows the run. The link appears there when it finishes.
3. The app lives at `https://<your-user>.github.io/<repo-name>/`.

Pages uses https, which phones need for the camera and for installing the app. Locally, `BASE_PATH` sets the folder the app is served from. It defaults to `/`.

## Run from a terminal

Needs Node.js 20 or newer. This works on Windows, Mac, and Linux.

```
npm install
npm run dev        # development server with hot reload
npm test           # unit tests
npm start          # build, then serve dist/ with Express at http://localhost:3000
```

## How it works

- The original photo stays in memory and is never edited. The screen shows a small preview copy, and every edit is applied to a fresh copy of it.
- Brightness, contrast, saturation, and hue are applied in that order. Saturation and hue share one RGB to HSL pass. Hue is shifted by converting each pixel from RGB to HSL, rotating the hue, and converting back. Gray pixels and transparency are left alone.
- Export draws the full-size original again with the same settings, so the saved file matches the preview at the photo's real resolution. JPG is placed on a white background because it has no transparency.
- The palette is found with k-means clustering on about 6000 sampled pixels of the edited preview, so it follows the edits. Tapping a swatch copies its hex code with the Clipboard API, with a fallback for pages that are not secure.
- Edits are staged. Sliders and filters change the preview right away, and **Confirm changes** records them as one undo step. **Cancel changes** throws them away. Undo with unconfirmed changes drops those changes first. Undo and redo store small settings snapshots, not pixels.
- A filter pushes every pixel toward a look (warm, cool, or gray) and the strength slider sets how far, from 0 to 100. It is applied after the sliders, in the same pass used for the preview, the palette, and the export. The filter tiles are made from a small copy of your own photo.
- Zoom only changes the preview. The visible part of the original is redrawn at screen resolution, so detail appears as you zoom in (up to 8x). Zooming never changes the photo, the palette, or the exported file. On narrow screens the preview stays pinned at the top while the tools scroll.
- The camera uses `getUserMedia`. A shutter press copies the current video frame to a canvas at the camera's full resolution and hands it to the same loader as a chosen file, so everything after that is identical. The camera stops as soon as the photo is taken. Browsers only allow the camera on https pages or localhost.
- Share uses the Web Share API with a file. It renders the same full-size file as Export. The Share button only appears in browsers that can share files, which is mostly phones. Export always works.
- Install and offline use come from a web app manifest and a service worker generated by `vite-plugin-pwa`. After the first visit the app loads with no connection. Chrome and Edge show an Install button. On iPhone, Safari needs Share, then Add to Home Screen, and the app says so.
- Phone photo rotation is applied on import, so photos are not sideways.
- The Express server only serves the built files from `dist/`. The built app is plain static files.

## Project layout

```
server/index.js            Express launcher
src/main.js                App entry, connects the screens
src/core/colorUtils.js     RGB, HSL, and hex conversion
src/core/adjustments.js    Brightness, contrast, saturation, hue, settings
src/core/palette.js        k-means palette and gradient
src/core/filters.js        Golden, Cool, Mono and strength
src/core/history.js        Undo and redo snapshots
src/core/viewport.js       Zoom and pan math
src/platform/clipboard.js  Copy text with fallback
src/platform/camera.js     Camera stream and capture a frame
src/platform/share.js      Web Share with file
src/platform/install.js    Install prompt and iPhone hint
src/core/imageLoader.js    Load a photo, fit it to the screen
src/core/exporter.js       Render the full-size file for download
src/platform/download.js   Save a file to the device
src/style.css              Styles
tests/                     Vitest unit tests (118)
public/                    App icons
.github/workflows/         Pages deploy
```

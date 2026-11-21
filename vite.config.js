import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH is "/" for local use. The GitHub Pages workflow sets it to "/<REPO>/".
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  server: { host: true },
  test: { environment: 'node' },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.png'],
      manifest: {
        name: 'PhotoMoj',
        short_name: 'PhotoMoj',
        description: 'Fix a photo. Grab its colors.',
        theme_color: '#1b1f2a',
        background_color: '#1b1f2a',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the app needs is in these files, so it works with no connection.
        globPatterns: ['**/*.{js,css,html,png}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
});

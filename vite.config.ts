import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// base is '/' for local dev/preview and root hosts; the GitHub Pages workflow
// sets PAGES_BASE='/ResusIQ/' so assets resolve under the project subpath.
export default defineConfig({
  base: process.env.PAGES_BASE || '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'pwa-192x192.svg',
        'pwa-512x512.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'apple-touch-icon-180x180.png'
      ],
      manifest: {
        name: 'ResusIQ - Dental Emergency Guide',
        short_name: 'ResusIQ',
        description: 'Voice-guided medical emergency protocols for UK dental practices',
        // Must equal --bg in src/design-system/tokens/colors.css and the
        // theme-color meta in index.html — drift shows as a seam behind the
        // status bar on an installed PWA. Pinned by layoutInvariants.test.ts.
        theme_color: '#0C1118',
        background_color: '#0C1118',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        categories: ['medical', 'health'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'pwa-192x192.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        // Precache everything EXCEPT the network-only lazy chunks below.
        // Keeping the emergency shell, protocols, drugs, dashboard and runner
        // precached preserves full offline use of the emergency path.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // genai (Gemini Live SDK) and AIAssistant both require network to do
        // anything (Live API), so precaching them only bloats the offline
        // cache. They are cached at runtime instead, StaleWhileRevalidate so a
        // returning user gets the cached chunk IMMEDIATELY (no network round-
        // trip) — important because when a Gemini key is present speak() always
        // routes to Gemini (sync isAvailable check, no browser-TTS fast path),
        // so NetworkFirst would delay first narration on flaky wifi mid-resus.
        // Keep network-only voice chunks AND non-English IBM Plex subsets out of
        // the offline precache (UK app — latin only; halves the font payload).
        globIgnores: [
          '**/genai-*.js',
          '**/AIAssistant-*.js',
          '**/*cyrillic*',
          '**/*greek*',
          '**/*vietnamese*',
          '**/*latin-ext*',
        ],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(genai|AIAssistant)-[^/]*\.js$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'resusiq-lazy-chunks',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    // Vite 8 minifies CSS with Lightning CSS, and Lightning CSS rewrites
    // `@media (max-height: 520px)` to the range syntax `(height <= 520px)` as
    // soon as every target supports it. Range syntax is Safari 16.4+, so on an
    // iPhone still on iOS 16.0-16.3 the whole at-rule is invalid and dropped —
    // which is exactly the CPR landscape floor release in index.css. Vite does
    // NOT read the `browserslist` field in package.json (that field records the
    // support floor for the humans and for tools that do read it); `cssTarget`
    // is the knob that actually reaches Lightning CSS, so the floor is pinned
    // here too. Keep the two in step.
    cssTarget: ['safari16', 'ios16', 'chrome111', 'firefox128'],
    rolldownOptions: {
      output: {
        // Force the Gemini SDK into a stably-named chunk so the service worker
        // can reliably exclude it from the offline precache (see globIgnores).
        manualChunks: (id: string) =>
          id.includes('node_modules/@google/genai') ? 'genai' : undefined
      }
    }
  },
  server: {
    watch: {
      usePolling: true
    }
  }
})

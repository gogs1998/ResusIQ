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
        theme_color: '#08090B',
        background_color: '#08090B',
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
        globIgnores: ['**/genai-*.js', '**/AIAssistant-*.js'],
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

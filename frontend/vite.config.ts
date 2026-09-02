import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(async () => {
  const plugins = [
    react(),
    VitePWA({
      // injectManifest (a hand-written service worker at src/sw.ts, with
      // Vite substituting the precache list into it) instead of the
      // plugin's auto-generated worker — needed for the push/
      // notificationclick handlers in sw.ts, which a generated worker
      // can't have.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo-mark.png'],
      manifest: {
        name: 'GoalFlow — AI Execution OS',
        short_name: 'GoalFlow',
        description: 'AI-powered daily execution, planning, and accountability.',
        theme_color: '#0b0b0e',
        background_color: '#0b0b0e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/dashboard',
        scope: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      devOptions: {
        // Off in dev — a service worker intercepting fetches makes local
        // debugging confusing (stale responses, HMR fighting the SW cache).
        enabled: false,
        type: 'module',
      },
    }),
  ];
  return { plugins };
})

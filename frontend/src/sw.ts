/// <reference lib="webworker" />
// Custom service worker source — vite-plugin-pwa's `injectManifest` strategy
// builds this into dist/sw.js, substituting self.__WB_MANIFEST for the real
// precache list. Switched here from the plugin's auto-generated worker
// (`generateSW`) specifically to add the push/notificationclick handlers
// below — that isn't possible with a generated worker.
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
cleanupOutdatedCaches();

// App shell precache (JS/CSS/HTML/icons) — instant, offline-capable open.
precacheAndRoute(self.__WB_MANIFEST);

// API calls: never precached, never served stale-by-default — this is
// goals/tasks/daily-state data. NetworkFirst tries the network, and only
// falls back to a cached response (if one exists) when there's truly no
// connection, with a hard timeout so a slow network doesn't hang the UI.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'goalflow-api',
    // Render's free tier sleeps the backend after ~15min idle — the first
    // request after that takes 30-60s to wake it (observed directly this
    // session). 8s was tuned for an always-warm backend and would fall
    // back to an empty cache (first visit = nothing cached yet) well
    // before a cold Render instance ever responds, silently failing a
    // request the network was actually about to succeed on a few seconds
    // later. 45s covers the realistic cold-start window without leaving a
    // genuinely dead connection hanging forever.
    networkTimeoutSeconds: 45,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  }),
);

// ── Push notifications ──────────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'GoalFlow', body: event.data?.text() || '' };
  }

  const title = data.title || 'GoalFlow';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag,
      data: { url: data.url || '/dashboard' },
    }),
  );
});

// Clicking a notification focuses an already-open GoalFlow tab if there is
// one, instead of always opening a fresh one.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string) || '/dashboard';

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clientsList.find(c => new URL(c.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        if ('navigate' in existing) await (existing as WindowClient).navigate(targetUrl);
      } else {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

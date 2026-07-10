// ============================================================
// JunkHaul Crew Portal — Service Worker
//
// Handles:
//   • Push notifications (display)
//   • Notification click (focus / open app)
//   • Offline shell cache
//
// Served from /sw.js (lives in /public).
// ============================================================

// --- Push event — display notification ----------------------
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() || '' };
  }

  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/portal/schedule' },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Junk Haul Crew', options)
  );
});

// --- Notification click — focus existing window or open new -
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/portal/schedule';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes('junkhaul.ca') && 'focus' in client) {
          client.focus();
          // Navigate to the target URL if possible
          if (client.navigate) return client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// --- Basic cache for offline shell --------------------------
const CACHE = 'junkhaul-portal-v3';
const ASSETS = ['/portal', '/portal/schedule', '/portal/clock', '/portal/onboard', '/manifest.json', '/favicon-32.png', '/crew-logo.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Only handle same-origin GET requests
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((response) => {
          // Cache a copy of successful responses
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});

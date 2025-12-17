const CACHE_NAME = 'rain-cache-v1';
const ASSETS = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Skip Next.js internals, RSC flight requests and API
  if (url.pathname.startsWith('/_next/') || url.search.includes('_rsc=') || url.pathname.startsWith('/api/')) {
    return; // let network handle
  }

  // Only cache static resources; don't cache navigations/documents
  const staticDest = ['style', 'script', 'image', 'font', 'audio'];
  if (!staticDest.includes(request.destination)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => { });
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// ==================== Push Notifications ====================

self.addEventListener('push', (event) => {
  const defaultData = {
    title: '🧘 该冥想了',
    body: '来一场心灵放松吧',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'meditation-reminder',
    data: { url: '/meditate' }
  };

  let data = defaultData;
  try {
    if (event.data) {
      data = { ...defaultData, ...event.data.json() };
    }
  } catch (e) {
    // Use default data
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      vibrate: [200, 100, 200],
      requireInteraction: true
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/meditate';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(urlToOpen));
        }
      }
      // Otherwise open new window
      return clients.openWindow(urlToOpen);
    })
  );
});

const CACHE_NAME = 'beatzy-offline-cache-v2';

const URLS_TO_CACHE = [
  '/',
  '/white.png',
  '/black.png',
  '/app-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Simple network-first, fallback to cache for offline support without breaking Next.js hot-reloading
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

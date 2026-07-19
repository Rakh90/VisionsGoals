const CACHE_VERSION = 'visions-tracking-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/main.js',
  './js/storage.js',
  './js/utils.js',
  './js/router.js',
  './js/components/modal.js',
  './js/components/toast.js',
  './js/views/houses.js',
  './js/views/client.js',
  './js/views/calendar.js',
  './js/views/summary.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin (fonts) pass through normally

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => cached || caches.match('./index.html'));
      return cached || fetchPromise;
    })
  );
});

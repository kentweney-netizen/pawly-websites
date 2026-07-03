// service-worker.js
const CACHE_NAME = 'pawly-pwa-v3';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pawly-token-helps.png',
  '/OvKdJ2.png'
  '/pawly-token-helps.webp'
];

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const dest = event.request.destination;

  if (dest === 'image' || dest === 'style' || dest === 'script' || dest === 'font') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;

        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  } else {
    event.respondWith(fetch(event.request));
  }
});

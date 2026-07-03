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

self.addEventListener('install', (event) => {
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
  const request = event.request;

  // 只缓存静态资源（JS、CSS、图片、字体、manifest）
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.url.endsWith('manifest.json')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 其他所有请求（包括 HTML 页面）直接走网络
  event.respondWith(fetch(request));
});

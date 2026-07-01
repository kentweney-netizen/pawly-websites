// service-worker.js
const CACHE_NAME = 'pawly-pets-v3';
const urlsToCache = [
  '/',
  '/index.html'
  // 如果以后有其他静态资源（如图片、CSS），可以在这里添加
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting(); // 强制立即激活新版本
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // 删除旧缓存
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 有缓存就用缓存，没有就去网络请求
      return response || fetch(event.request);
    })
  );
});

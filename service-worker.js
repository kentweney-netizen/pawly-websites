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
  console.log('[SW] Install - 开始缓存核心资源');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();   // 立即激活新版本
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate - 清理旧缓存');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();   // 立即接管所有页面
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;   // 缓存命中，直接返回
      }

      return fetch(event.request).then((fetchResponse) => {
        if (!fetchResponse || fetchResponse.status !== 200 || event.request.method !== 'GET') {
          return fetchResponse;
        }

        const responseToCache = fetchResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return fetchResponse;
      }).catch(() => {
        // 离线时返回首页（降级体验）
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

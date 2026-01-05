// Rain Meditation App - Service Worker
// 缓存静态资源，实现快速加载

const CACHE_NAME = 'rain-meditation-v2';
const STATIC_ASSETS = [
  '/',
  '/practice',
  '/meditate',
  '/stats',
  '/tts-studio',
];

// 🔥 开发模式检测：localhost 或 127.0.0.1 下禁用缓存
const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// 安装时预缓存核心页面（开发模式跳过）
self.addEventListener('install', (event) => {
  if (isDev) {
    console.log('[SW] 开发模式：跳过缓存安装');
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  // 🔥 开发模式：所有请求直接走网络，不缓存
  if (isDev) {
    return;
  }

  const url = new URL(event.request.url);

  // 🚫 只缓存 GET 请求，POST/PUT 等无法被 Cache API 缓存
  if (event.request.method !== 'GET') {
    return;
  }

  // API 请求不缓存，直接走网络
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 静态资源使用 Cache First 策略
  if (url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // 页面使用 Network First 策略
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Rain Meditation App - Service Worker
// PWA 离线缓存 + 秒开策略

const CACHE_VERSION = 'rain-v3';
const APP_SHELL_CACHE = 'rain-shell-v3';

// 🏠 App Shell：预缓存的核心资源（安装时下载）
const APP_SHELL = [
  '/',
  '/practice',
  '/meditate',
  '/stats',
  '/tts-studio',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// 🔥 开发模式检测
const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// ─── 安装：预缓存 App Shell ───
self.addEventListener('install', (event) => {
  if (isDev) {
    console.log('[SW] 开发模式：跳过缓存');
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      console.log('[SW] 预缓存 App Shell...');
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// ─── 激活：清理旧版本缓存 ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_VERSION && name !== APP_SHELL_CACHE)
          .map((name) => {
            console.log('[SW] 清理旧缓存:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ─── 拦截请求 ───
self.addEventListener('fetch', (event) => {
  if (isDev) return;

  const url = new URL(event.request.url);

  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // API 请求直接走网络（数据由 IndexedDB 管理）
  if (url.pathname.startsWith('/api/')) return;

  // ⚡ Next.js 静态资源（JS/CSS chunks）：Cache First
  // 这些文件名自带 hash，内容不可变，缓存命中就用
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ⚡ 静态资源（图片/字体等）：Cache First
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|webp|mp3|wav|mp4)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 🚀 页面导航（HTML）：Stale-While-Revalidate
  // 关键优化：先从缓存秒出页面，同时后台更新缓存
  // 这就是为什么 iOS PWA 冷启动不再白屏的原因
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        // 后台更新缓存（无论是否命中）
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(APP_SHELL_CACHE).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            // 网络失败时什么都不做，已经有缓存了
          });

        // 如果缓存命中：立即返回缓存（毫秒级）
        if (cached) {
          return cached;
        }

        // 缓存未命中（首次访问）：等待网络
        return networkFetch.then((response) => response || new Response('Offline', { status: 503 }));
      })
    );
    return;
  }

  // 其他请求：Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || fetchPromise;
    })
  );
});

// ─── 推送通知 ───
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Rain Meditation';
  const options = {
    body: data.body || '该做冥想练习了',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'rain-reminder',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// YouMe 坐席系统 Service Worker
// 版本号 - 更新时修改此值以触发缓存刷新
const CACHE_VERSION = 'agent-v2';
const CACHE_NAME = `youme-agent-${CACHE_VERSION}`;

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/agent',
  '/agent-manifest.json',
  '/img/logok.png',
];

// ── 安装事件：预缓存静态资源 ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // 部分资源缓存失败不阻断安装
      });
    })
  );
  self.skipWaiting();
});

// ── 激活事件：清理旧缓存 ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('youme-agent-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ── Fetch 事件：网络优先，失败时回退缓存 ──
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;
  // 跳过 API 请求
  if (event.request.url.includes('/api/')) return;
  // 只处理 http/https 请求，跳过 chrome-extension:// 等非标准协议
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 缓存成功的响应
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            try {
              cache.put(event.request, responseClone);
            } catch (e) {
              // 忽略缓存写入错误
            }
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败时从缓存返回
        return caches.match(event.request).then((cached) => {
          return cached || new Response('离线模式：请检查网络连接', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        });
      })
  );
});

// ── Push 事件：收到推送通知 ──
self.addEventListener('push', (event) => {
  let data = {
    title: '新消息',
    body: '您有一条新的客服消息',
    icon: '/img/logok.png',
    badge: '/img/logok.png',
    tag: 'cs-new-message',
    data: { url: '/agent' },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      vibrate: [200, 100, 200],
      requireInteraction: true,
    })
  );
});

// ── 通知点击事件：打开或聚焦坐席工作台 ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/agent';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 如果已有坐席页面打开，聚焦它
      for (const client of clientList) {
        if (client.url.includes('/agent') && 'focus' in client) {
          return client.focus();
        }
      }
      // 否则打开新窗口
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

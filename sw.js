'use strict';
const CACHE = 'bk-cache-v3';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'core.js',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(ASSETS.map(a => {
        const url = new URL(a, self.location.origin).href;
        return fetch(url).then(resp => {
          if (!resp.ok) throw new Error(a + ' -> ' + resp.status);
          return c.put(a, resp);
        });
      })).then(results => {
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length) console.warn('[SW] 预缓存部分失败:', failed.map(f => String(f.reason)));
        return self.skipWaiting();
      })
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  const cacheable = ASSETS.some(a => {
    const clean = a === './' ? 'index.html' : a;
    return url.pathname === new URL(clean, self.location.origin).pathname;
  });
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || fetch(e.request).then(resp => {
        if (resp.ok && cacheable) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => caches.match('index.html'))
    )
  );
});

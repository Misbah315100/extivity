const CACHE = 'calai-v5';
const ASSETS = ['/'];

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // never cache — always network first for now
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

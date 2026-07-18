const CACHE = 'lexis-v4';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const isPage = req.mode === 'navigate' ||
    (req.destination === 'document') ||
    req.url.endsWith('/index.html') || req.url.endsWith('/olive-pronounce/');

  if (isPage) {
    // NETWORK-FIRST for the app page itself: always get the newest version
    // when online; fall back to the cached copy only when offline.
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // CACHE-FIRST for everything else (icons, fonts): fast and offline-safe.
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.status === 200 && (req.url.startsWith(self.location.origin) || req.url.includes('gstatic') || req.url.includes('googleapis'))) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      });
    })
  );
});

const CACHE_NAME = 'tag-support-v1';
const urlsToCache = [
  '/',
  '/runner',
  '/chaser',
  '/gamemaster',
  '/manifest.json',
  '/marker-icon.png',
  '/marker-icon-2x.png',
  '/marker-shadow.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
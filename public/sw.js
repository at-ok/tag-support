const CACHE_NAME = 'tag-support-v1';
const urlsToCache = [
  '/',
  '/runner',
  '/chaser',
  '/gamemaster',
  '/manifest.json',
  '/marker-icon.png',
  '/marker-icon-2x.png',
  '/marker-shadow.png',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
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
  // Take control immediately
  return self.clients.claim();
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((response) => {
        // Cache new resources on the fly
        if (event.request.method === 'GET' && !event.request.url.includes('/api/')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const options = {
    body: 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.icon = data.icon || options.icon;
      options.badge = data.badge || options.badge;
      options.vibrate = data.vibrate || options.vibrate;
      options.data = data.data || options.data;

      event.waitUntil(self.registration.showNotification(data.title || 'Tag Support', options));
    } catch (err) {
      console.error('Error parsing push notification data:', err);
      event.waitUntil(self.registration.showNotification('Tag Support', options));
    }
  } else {
    event.waitUntil(self.registration.showNotification('Tag Support', options));
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        // Check if there is already a window open
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync event (for future use)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-location') {
    event.waitUntil(syncLocation());
  }
});

// Helper function for background sync
async function syncLocation() {
  // This will be implemented when needed for offline location sync
  console.log('Background sync triggered');
}

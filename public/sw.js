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
  console.log('[Service Worker] Push received:', event);

  let notificationData = {
    title: 'Tag Support',
    body: 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      url: '/',
    },
  };

  // Parse push data
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[Service Worker] Push payload:', payload);

      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        vibrate: payload.vibrate || notificationData.vibrate,
        data: {
          ...notificationData.data,
          ...payload.data,
          type: payload.type,
        },
      };

      // Set URL based on notification type
      if (payload.type) {
        switch (payload.type) {
          case 'game_start':
          case 'game_end':
            // Will be set based on user role in notification data
            notificationData.data.url = payload.data?.url || '/';
            break;
          case 'mission_assigned':
          case 'mission_completed':
            notificationData.data.url = payload.data?.url || '/';
            break;
          case 'capture':
          case 'rescue':
            notificationData.data.url = payload.data?.url || '/';
            break;
          case 'time_warning':
          case 'zone_alert':
            notificationData.data.url = payload.data?.url || '/';
            break;
          default:
            notificationData.data.url = '/';
        }
      }

      // Set requireInteraction for important notifications
      if (
        payload.type === 'game_start' ||
        payload.type === 'game_end' ||
        payload.type === 'capture'
      ) {
        notificationData.requireInteraction = true;
      }

      // Set tag to replace similar notifications
      if (payload.type) {
        notificationData.tag = payload.type;
      }
    } catch (err) {
      console.error('[Service Worker] Error parsing push data:', err);
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate,
      data: notificationData.data,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction || false,
      actions:
        notificationData.data.type === 'mission_assigned'
          ? [
              { action: 'view', title: 'View Mission' },
              { action: 'close', title: 'Dismiss' },
            ]
          : undefined,
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  // Handle notification actions
  if (event.action === 'close') {
    return;
  }

  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        console.log('[Service Worker] Found window clients:', windowClients.length);

        // Check if there is already a window/tab open with the app
        for (const client of windowClients) {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen);

          // If the origin matches, focus the existing window and navigate
          if (clientUrl.origin === targetUrl.origin && 'focus' in client) {
            console.log('[Service Worker] Focusing existing client:', client.url);
            return client.focus().then((focusedClient) => {
              // Navigate to the target URL if needed
              if (focusedClient.navigate && clientUrl.href !== targetUrl.href) {
                return focusedClient.navigate(targetUrl.href);
              }
              return focusedClient;
            });
          }
        }

        // If no matching window is found, open a new one
        console.log('[Service Worker] Opening new window:', urlToOpen);
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((err) => {
        console.error('[Service Worker] Error handling notification click:', err);
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

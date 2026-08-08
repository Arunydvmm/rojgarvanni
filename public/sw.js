/* RozgarVaani Service Worker v1.0.0 */
/* Comprehensive offline support for Indian Government Job Notifications */

const STATIC_CACHE = 'rozgar-static-v1';
const API_CACHE = 'rozgar-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
];

// List of API paths to cache automatically
const CACHEABLE_API_ENDPOINTS = [
  '/api/jobs',
  '/api/results',
  '/api/admit-cards',
  '/api/answer-keys',
  '/api/search',
  '/api/site-settings',
];

// Install Event: Pre-cache core shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[ServiceWorker] Pre-caching static app shell');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Pre-cache partial warning:', err);
      });
    })
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log('[ServiceWorker] Removing stale cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Check if request is an API call
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

// Fetch Event: Network & Cache Strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. POST admin actions)
  if (request.method !== 'GET') {
    return;
  }

  // Strategy 1: API Requests -> Network First with Cache Fallback
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // If network fetch succeeds, cache a copy of valid JSON responses
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          console.log('[ServiceWorker] Network unreachable. Serving cached API response for:', url.pathname);
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            // Return cached API response
            return cachedResponse;
          }
          // Fallback response for un-cached API calls when offline
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              message: 'You are currently offline. Showing saved job listings.',
              data: [],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  // Strategy 2: Navigation Requests (HTML) -> Network First with Index.html Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        console.log('[ServiceWorker] Offline navigation fallback');
        const cachedShell = await caches.match('/index.html');
        return cachedShell || caches.match('/');
      })
    );
    return;
  }

  // Strategy 3: Static Assets (JS, CSS, Images) -> Stale While Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Ignore background fetch errors if cached asset exists
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Message Listener for Client Communication
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_API_CACHE') {
    event.waitUntil(
      caches.delete(API_CACHE).then(() => {
        console.log('[ServiceWorker] API Cache Cleared');
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      })
    );
  }

  if (event.data.type === 'PRECACHE_ALL_JOBS') {
    event.waitUntil(
      Promise.all(
        CACHEABLE_API_ENDPOINTS.map((endpoint) =>
          fetch(endpoint)
            .then((res) => {
              if (res.ok) {
                const clone = res.clone();
                return caches.open(API_CACHE).then((cache) => cache.put(endpoint, clone));
              }
            })
            .catch(() => {})
        )
      ).then(() => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true, count: CACHEABLE_API_ENDPOINTS.length });
        }
      })
    );
  }
});

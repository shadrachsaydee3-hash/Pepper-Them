/* PEPPER THEM - OFFLINE SERVICE WORKER */

const CACHE_NAME = 'pepper-them-cache-v1';
const ASSETS_TO_CACHE = [
  'index.html',
  'shop.html',
  'music.html',
  'contact.html',
  'assets/css/main.css',
  'assets/css/animations.css',
  'assets/js/app.js',
  'assets/js/gallery.js',
  'assets/js/player.js',
  'assets/data/products.json',
  'assets/data/tracks.json'
];

// Install Event - Pre-cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching site shells and resources');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Cache-first with Network Fallback
self.addEventListener('fetch', (event) => {
  // Avoid caching browser extension schemes or foreign API endpoints
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Clone fetch request to use and put in cache if successful
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // Offline fallback triggers if connection fails
          console.log('[Service Worker] Fetch failed, network offline.');
        });
      })
  );
});

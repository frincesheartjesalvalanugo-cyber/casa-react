// Casa Gracia's Hotel PWA Service Worker
const CACHE_NAME = 'casa-gracia-hotel-v1.0.0';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/home.html',
  '/reservation.html',
  '/login.html',
  '/user-login.html',
  '/admin-login.html',
  '/signup.html',
  '/admin-dashboard.html',
  '/manifest.json',
  '/casa_gracias_hotel_192x192.png',
  '/casa_gracias_hotel_512x512.png',
  '/Casa-Gracias-logo.jpg',
  '/Casa-Gracias-hero.jpg',
  '/villa-1.jpg',
  '/kubo-1.jpg',
  '/favicon.svg',
  '/favicon.png'
];

// Install Event: cache essential assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Casa Gracia SW: Pre-cache asset warning:', err);
      });
    })
  );
});

// Activate Event: clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: network first for navigations, stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // For HTML page navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('/index.html') || caches.match('/home.html');
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // Never intercept or cache backend API calls or Vite dev internals
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('/@') ||
    event.request.url.includes('node_modules') ||
    event.request.url.includes('?v=')
  ) {
    return;
  }

  // Network-First strategy: Ensures updated scripts and UI always run directly
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/home.html');
          }
          return null;
        });
      })
  );
});

// BPGT Terminal System - Service Worker
// Enables offline access and app-like behavior
// Version: 4.5

const CACHE_NAME = 'bpgt-terminal-v4.5';
const OFFLINE_URL = '/BPGT-Terminal-System/offline.html';

// Files to cache for offline use
const CACHE_FILES = [
  '/BPGT-Terminal-System/',
  '/BPGT-Terminal-System/index.html',
  '/BPGT-Terminal-System/app.html',
  '/BPGT-Terminal-System/app-logic.js',
  '/BPGT-Terminal-System/auth.js',
  '/BPGT-Terminal-System/config.js',
  '/BPGT-Terminal-System/style.css',
  '/BPGT-Terminal-System/manifest.json',
  '/BPGT-Terminal-System/icons/icon-192.png',
  '/BPGT-Terminal-System/icons/icon-512.png',
];

// Install: cache all essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache when offline
self.addEventListener('fetch', event => {
  // Skip non-GET requests and API calls (always need fresh data)
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('script.google.com')) return;
  if (event.request.url.includes('googleapis.com')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: serve from cache
        return caches.match(event.request)
          .then(cached => cached || caches.match('/BPGT-Terminal-System/'));
      })
  );
});

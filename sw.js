/**
 * Service Worker for Root Scope (GitHub Pages & Root Redirect)
 */

const ROOT_CACHE_NAME = 'study-planner-root-v1';

const ROOT_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './frontend/',
  './frontend/index.html',
  './frontend/manifest.json',
  './frontend/css/main.css',
  './frontend/css/variables.css',
  './frontend/css/base.css',
  './frontend/css/layout.css',
  './frontend/css/components.css',
  './frontend/js/app.js',
  './frontend/js/state.js',
  './frontend/js/router.js',
  './frontend/js/events.js',
  './frontend/js/utils/helpers.js',
  './frontend/js/views/dashboardView.js',
  './frontend/js/views/subjectView.js',
  './frontend/js/views/assignmentView.js',
  './frontend/js/views/sidebarView.js',
  './frontend/js/views/pageView.js',
  './frontend/js/views/modalView.js',
  './frontend/assets/icon.svg',
  './frontend/assets/icon-192.png',
  './frontend/assets/icon-512.png',
  './frontend/assets/icon-maskable-512.png',
  './frontend/assets/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(ROOT_CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ROOT_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== ROOT_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(ROOT_CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          if (req.mode === 'navigate') {
            return caches.match('./frontend/index.html') || caches.match('./index.html');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});

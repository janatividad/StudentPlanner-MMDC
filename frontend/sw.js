/**
 * Service Worker for Frontend Scope
 * Hardened Cache: Uses planner-specific prefix, only caches allowed static assets,
 * safely deletes only old planner caches, and strictly excludes auth callbacks and API data.
 */

const CACHE_PREFIX = 'student-planner-mmdc-';
const CACHE_NAME = `${CACHE_PREFIX}frontend-v2`;

const KNOWN_LEGACY_CACHES = new Set([
  'study-planner-root-v1',
  'study-planner-frontend-v1',
  'study-planner-mmdc-v1',
  'study-planner-mmdc-v2',
  'study-planner-mmdc-v3'
]);

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './js/app.js',
  './js/state.js',
  './js/router.js',
  './js/events.js',
  './js/utils/helpers.js',
  './js/views/dashboardView.js',
  './js/views/subjectView.js',
  './js/views/assignmentView.js',
  './js/views/sidebarView.js',
  './js/views/pageView.js',
  './js/views/modalView.js',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png'
];

function isPlannerCache(name) {
  return typeof name === 'string' && (
    name.startsWith(CACHE_PREFIX) ||
    name.startsWith('study-planner-') ||
    KNOWN_LEGACY_CACHES.has(name)
  );
}

function isCacheable(request, url) {
  if (request.method !== 'GET') return false;

  // Cache only same-origin assets within the planner's scope
  if (url.origin !== self.location.origin) return false;

  // Never cache authentication callbacks, tokens, or sessions
  const search = url.search.toLowerCase();
  const hash = url.hash.toLowerCase();
  if (
    search.includes('access_token') ||
    search.includes('refresh_token') ||
    search.includes('code=') ||
    search.includes('token=') ||
    search.includes('error_description') ||
    hash.includes('access_token') ||
    hash.includes('refresh_token')
  ) {
    return false;
  }

  // Never cache API or auth endpoints
  const pathname = url.pathname.toLowerCase();
  if (
    pathname.includes('/auth/') ||
    pathname.includes('/api/') ||
    pathname.includes('/rest/') ||
    pathname.includes('/v1/')
  ) {
    return false;
  }

  // Ensure request is within planner scope
  const scopePath = new URL(self.registration.scope).pathname;
  if (!pathname.startsWith(scopePath)) {
    return false;
  }

  // Only cache explicitly allowed static file extensions or entry points
  const isStaticExt = /\.(html|css|js|json|webmanifest|svg|png|jpg|jpeg|ico|woff2?)$/i.test(pathname);
  const isEntry = pathname === scopePath || pathname === scopePath + 'index.html';

  return isStaticExt || isEntry;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Delete only old planner caches, preserving any unrelated origin caches
          if (key !== CACHE_NAME && isPlannerCache(key)) {
            console.log('[SW] Pruning old planner cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // If request is not cacheable (API, auth, external), pass through directly
  if (!isCacheable(req, url)) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && isCacheable(req, url)) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});

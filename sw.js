/**
 * Service Worker for Root Scope (GitHub Pages & Root Redirect)
 * Hardened Cache: Uses planner-specific prefix, only caches allowed static assets,
 * safely deletes only old planner caches, and strictly excludes auth callbacks and API data.
 */

const CACHE_PREFIX = 'student-planner-mmdc-';
const ROOT_CACHE_NAME = `${CACHE_PREFIX}root-v2`;

const KNOWN_LEGACY_CACHES = new Set([
  'study-planner-root-v1',
  'study-planner-frontend-v1',
  'study-planner-mmdc-v1',
  'study-planner-mmdc-v2',
  'study-planner-mmdc-v3'
]);

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
  const isEntry = pathname === scopePath ||
                  pathname === scopePath + 'index.html' ||
                  pathname === scopePath + 'frontend/' ||
                  pathname === scopePath + 'frontend/index.html';

  return isStaticExt || isEntry;
}

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
          if (key !== ROOT_CACHE_NAME && isPlannerCache(key)) {
            console.log('[SW] Pruning old root planner cache:', key);
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

  if (!isCacheable(req, url)) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && isCacheable(req, url)) {
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

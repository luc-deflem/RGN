// --- Grocery App Service Worker (offline-first) ---
// Bump this to force an update after each deploy
const CACHE_VERSION = 'v3.7.16-fixed-html-refresh-timing';
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const PRECACHE = `precache-${CACHE_VERSION}`;

// Core app shell to precache (must exist at site root)
const CORE_ASSETS = [
  '/',                 // index.html
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  // Core scripts
  '/firebase-secure.js',
  '/setup-secure-environment.js',
  '/auth.js',
  '/smart-image-system.js',
  '/app.js',
  '/enhanced-recipe-renderer.js',
  '/version-manager.js',
  // Optional production tools
  '/firebase-simulator.js'
];

// Helper: is this request for an image?
const isImageRequest = (req) => {
  const url = typeof req === 'string' ? req : req.url;
  return /\.(png|jpg|jpeg|gif|webp|svg|ico)(\?|$)/i.test(url);
};

// Helper: is this a Firebase Storage URL?
const isFirebaseStorage = (req) => {
  const url = typeof req === 'string' ? req : req.url;
  return /(\.firebasestorage\.app|firebasestorage\.googleapis\.com)/i.test(url);
};

// ----- Install: pre-cache core shell -----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// ----- Activate: clean up old caches -----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== PRECACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((resp) => {
      // Only cache good responses
      if (resp && resp.status === 200 && (resp.type === 'basic' || resp.type === 'cors')) {
        cache.put(request, resp.clone());
      }
      return resp;
    })
    .catch(() => cached); // if offline, return cached

  return cached || fetchPromise;
}

// Cache-first for images (with network update in background)
async function imageHandler(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    // Kick off a background refresh
    fetch(request).then((resp) => {
      if (resp && resp.status === 200) cache.put(request, resp.clone());
    }).catch(() => {});
    return cached;
  }
  // Not cached yet → fetch and cache
  try {
    const resp = await fetch(request);
    if (resp && resp.status === 200) cache.put(request, resp.clone());
    return resp;
  } catch (e) {
    // As a last resort, return a tiny placeholder SVG
    const fallback = new Response(
      'data:image/svg+xml;base64,' +
        btoa('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="#eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="#888">offline</text></svg>')
    );
    return fallback;
  }
}

// ----- Fetch: routing -----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GETs
  if (request.method !== 'GET') return;

  // 1) Images (local OR Firebase Storage) → cache-first
  if (isImageRequest(request) || isFirebaseStorage(request)) {
    event.respondWith(imageHandler(request));
    return;
  }

  // 2) HTML navigations → try network, fall back to cached shell (app works offline)
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const resp = await fetch(request);
          // Update the cached index for future
          const cache = await caches.open(PRECACHE);
          cache.put('/', resp.clone());
          return resp;
        } catch {
          // Offline fallback to cached shell
          const cached = await caches.match(request);
          return cached || caches.match('/index.html');
        }
      })()
    );
    return;
  }

  // 3) Everything else (JS/CSS/json) → stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

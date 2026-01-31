const CACHE_NAME = 'torserve-v3-fix';

// Install event - force activation
self.addEventListener('install', (event) => {
    console.log('[SW] Installing new fix version...');
    self.skipWaiting();
});

// Activate event - take control and clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating & Cleaning old caches...');
    event.waitUntil(
        Promise.all([
            clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

// Fetch event - FIX for "Request method 'POST' is unsupported"
self.addEventListener('fetch', (event) => {
    // Ignore non-GET requests (like POST search queries)
    if (event.request.method !== 'GET') {
        return;
    }

    // For now, use Network First strategy for safety
    // keeping it simple to ensure stability
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Optional: Cache successful GET requests if needed
                // For now, avoiding aggressive caching to prevent "stale UI" issues
                return response;
            })
            .catch(() => {
                // Fallback or offline logic could go here
                return caches.match(event.request);
            })
    );
});

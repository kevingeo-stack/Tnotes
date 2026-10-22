const CACHE_NAME = 'tnotes-pwa-v3';

// Install: activar de inmediato sin esperar a que se cierren pestañas
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: purgar cachés antiguos y tomar el control inmediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Purgando caché obsoleta:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first con guardado dinámico en caché y respaldo offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignorar peticiones internas de desarrollo (Vite, HMR) o extensiones de navegador
  if (url.pathname.includes('/@vite/') || url.pathname.includes('/src/') || !url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Guardar copia fresca en caché para uso sin conexión
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Respaldo sin conexión: buscar recurso exacto en caché
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }

        // Si es navegación HTML y no hay red, servir index.html en caché
        if (event.request.mode === 'navigate') {
          const cachedIndex = (await caches.match('./index.html')) || (await caches.match('./')) || (await caches.match('/'));
          if (cachedIndex) return cachedIndex;
        }

        return new Response('Sin conexión a internet.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

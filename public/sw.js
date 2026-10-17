const CACHE_NAME = 'trumpet-notes-v2-' + Date.now();

self.addEventListener('install', (event) => {
  // Forzar a este service worker a activarse inmediatamente sin esperar
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Eliminar todos los cachés viejos del celular
          return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET o que sean de extensiones/HMR de Vite
  if (event.request.method !== 'GET' || event.request.url.includes('/@vite/') || event.request.url.includes('/src/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta de red es válida, devolverla
        if (response && response.status === 200) {
          return response;
        }
        return caches.match(event.request).then((cached) => cached || response);
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || new Response('Network error', { status: 408, headers: { 'Content-Type': 'text/plain' } });
        });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


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
  // Network-first para asegurar que el celular siempre descargue los cambios nuevos
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


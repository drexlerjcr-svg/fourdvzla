const CACHE_NAME = 'cartelera-images-v1';

// Se instala el Service Worker
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Se activa y limpia cachés viejos si los hubiera
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Intercepta las peticiones de red
self.addEventListener('fetch', event => {
  // Solo interceptamos peticiones GET (como las de las imágenes)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. Si la imagen ya está en caché local, devuélvela (Funciona Offline)
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // 2. Si no está en caché, ve a internet a buscarla
      return fetch(event.request).then(networkResponse => {
        // Asegurarse de que la respuesta sea válida (incluyendo respuestas opacas de Google Drive)
        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
          return networkResponse;
        }

        // 3. Clona la imagen y guárdala en el caché para la próxima vez
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Si no hay internet y no está en caché, simplemente no hace nada y deja el fallback natural
      });
    })
  );
});

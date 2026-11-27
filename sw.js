// sw.js — Service Worker para Push y PWA
const SW_VERSION = '1.1.1';

self.addEventListener('install', (event) => {
  console.log('[SW] install', SW_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] activate', SW_VERSION);
  event.waitUntil(self.clients.claim());
});

// Interceptar peticiones básicas para que sea una PWA válida
self.addEventListener('fetch', (event) => {
  // Dejamos que las peticiones pasen normalmente a la red
  event.respondWith(fetch(event.request).catch(() => {
    // Aquí podrías agregar un return caches.match(event.request) si hicieras caché offline
  }));
});

self.addEventListener('push', (event) => {
  console.log('[SW] push recibido');
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : 'Nueva asignación' };
  }

  const title = data.title || 'Asignación teocrática';
  const options = {
    body: data.body || 'Tienes una asignación pendiente',
    icon: data.icon || './icon.png',   // ✅ Corregido: coincidir con manifest y HTML
    badge: data.badge || './icon.png', // ✅ Corregido
    tag: data.tag || 'asg-' + Date.now(),
    data: data.data || { url: './' },
    requireInteraction: false
    // ⚠️ Se eliminó 'vibrate' porque algunos navegadores de PC fallan silenciosamente con esa opción
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('✅ Notificación mostrada con éxito'))
      .catch(err => console.error('❌ ERROR al mostrar notificación:', err))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Obtiene la URL base de tu app (https://jwasistem.github.io/jwasistem/)
  const baseUrl = self.registration.scope;
  
  // Obtiene la URL enviada desde la notificación
  let urlToOpen = event.notification.data?.url;
  
  // Si la URL es "/" o está vacía, usamos la URL base para evitar ir a la raíz de GitHub Pages
  if (!urlToOpen || urlToOpen === '/' || urlToOpen === location.origin) {
      urlToOpen = baseUrl;
  } else if (!urlToOpen.startsWith('http')) {
      // Si es una ruta relativa, la unimos a la URL base
      urlToOpen = new URL(urlToOpen, baseUrl).href;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Si la app ya está abierta en alguna pestaña, solo la enfocamos
      for (const client of windowClients) {
        if (client.url.startsWith(baseUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // 2. Si no está abierta, abrimos una nueva pestaña con la URL correcta
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

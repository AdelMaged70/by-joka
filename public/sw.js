self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // ────── SEARCH FOR ANY ADMIN WINDOW ──────
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname.startsWith('/admin')) {
            client.postMessage({ type: 'NOTIFICATION_CLICKED' });
            return client.focus();
          }
        } catch (e) {
          if (client.url.includes('/admin')) {
            client.postMessage({ type: 'NOTIFICATION_CLICKED' });
            return client.focus();
          }
        }
      }
      
      // If no dashboard window found, open a new one
      return clients.openWindow('/admin/dashboard');
    })
  );
});

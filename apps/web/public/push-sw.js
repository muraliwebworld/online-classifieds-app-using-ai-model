// >>> VIDEXPULSE PUSH SDK START
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', {
      body: data.body || '',
      icon: data.imageUrl || undefined,
      data
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.clickUrl || '/';
  event.waitUntil(self.clients.openWindow(targetUrl));
});
// <<< VIDEXPULSE PUSH SDK END

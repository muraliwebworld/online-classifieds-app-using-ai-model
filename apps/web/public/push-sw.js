// >>> VIDEXPULSE PUSH SDK START
self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const notif = payload.notification || payload;
  const title = notif.title || payload.title || 'Notification';
  const body = notif.body || payload.body || '';
  const icon = notif.icon || notif.image || payload.imageUrl || undefined;
  const clickUrl = payload.fcmOptions?.link || notif.click_action || payload.data?.clickUrl || payload.clickUrl || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      data: { ...payload, clickUrl }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification?.data || {};
  const extra = data.data && typeof data.data === 'object' ? data.data : data;
  const targetUrl = data.clickUrl || extra.clickUrl || '/';
  const trackingClickUrl = extra.trackingClickUrl || data.trackingClickUrl || '';
  const notificationId = extra.notificationId || data.notificationId || '';
  const appId = extra.appId || data.appId || '';
  const deviceId = extra.deviceId || data.deviceId || '';

  const tasks = [];
  if (trackingClickUrl && notificationId) {
    tasks.push(
      fetch(trackingClickUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId,
          notificationId,
          deviceId,
          platform: 'web',
          clickUrl: targetUrl
        }),
        keepalive: true
      }).catch(() => {})
    );
  }
  tasks.push(self.clients.openWindow(targetUrl));
  event.waitUntil(Promise.all(tasks));
});
// <<< VIDEXPULSE PUSH SDK END

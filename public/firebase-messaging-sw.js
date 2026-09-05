// Firebase Cloud Messaging Service Worker for alejo.st (Firebase v12 Compat)
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: 'AIzaSyClG-y7seb17rhGIa3hN4QCLn_8Ren4SRw',
  authDomain: 'alejost848-afea9.firebaseapp.com',
  databaseURL: 'https://alejost848-afea9.firebaseio.com',
  projectId: 'alejost848-afea9',
  storageBucket: 'alejost848-afea9.appspot.com',
  messagingSenderId: '776617594441'
});

const messaging = firebase.messaging();

// Handle background push messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const notification = payload.notification || {};
  const notificationTitle = notification.title || 'New update on alejo.st';
  const notificationOptions = {
    body: notification.body || '',
    icon: notification.icon || '/images/manifest/icon-192x192.png',
    badge: '/images/manifest/icon-72x72.png',
    data: {
      url: notification.click_action || payload.data?.click_action || '/'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Focus or open URL when notification is clicked
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

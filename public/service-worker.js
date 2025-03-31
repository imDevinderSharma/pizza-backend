// Service Worker for Pizza Host Notifications

self.addEventListener('install', event => {
  console.log('Service Worker installed');
  self.skipWaiting(); // Activate service worker immediately
});

self.addEventListener('activate', event => {
  console.log('Service Worker activated');
  return self.clients.claim(); // Take control of all clients
});

// Handle push notification events
self.addEventListener('push', event => {
  console.log('Push notification received', event);
  
  let notificationData = {
    title: 'New Order!',
    body: 'A new pizza order has been placed.',
    icon: '/pizza-icon.png',
    badge: '/badge-icon.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    tag: 'new-order',
    data: {
      url: '/notifications'
    }
  };
  
  // If there's data in the push event, use it
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (e) {
      console.error('Error parsing push notification data:', e);
    }
  }
  
  // Show the notification
  const showNotification = self.registration.showNotification(
    notificationData.title,
    notificationData
  );
  
  // Ensure the service worker stays active until the notification is shown
  event.waitUntil(showNotification);
});

// Handle notification click events
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked', event);
  
  // Close the notification
  event.notification.close();
  
  // Get the URL to open (default to /notifications)
  const urlToOpen = event.notification.data?.url || '/notifications';
  
  // Open or focus the window with the notifications
  const openClient = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  })
  .then(clientList => {
    // Check if there's already a window open
    for (const client of clientList) {
      // If the URL matches or contains our url path
      if (client.url.includes(urlToOpen) && 'focus' in client) {
        // Focus the existing tab
        return client.focus();
      }
    }
    
    // If no window is open, open a new one
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  });
  
  // Ensure the service worker stays active until the window is opened/focused
  event.waitUntil(openClient);
});

// Network fallback strategy
self.addEventListener('fetch', event => {
  // For simplicity, just fetch from network
  event.respondWith(fetch(event.request));
}); 
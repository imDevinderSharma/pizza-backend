const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();

// Middleware
app.use(cors({
  origin: ['https://pizza-frontend-jet.vercel.app', 'https://pizza-frontend-jet.vercel.app/', 'https://pizza-backend-coral.vercel.app', 'https://pizza-backend-coral.vercel.app/'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/pizzas', require('./routes/pizzaRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Simple order notification viewer (no authentication for simplicity)
app.get('/notifications', (req, res) => {
  const notificationsDir = path.join(__dirname, '../notifications');
  let notifications = [];
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(notificationsDir)) {
    fs.mkdirSync(notificationsDir, { recursive: true });
  } else {
    // Read all notification files
    try {
      const files = fs.readdirSync(notificationsDir)
        .filter(file => file.startsWith('order_') && file.endsWith('.json'));
      
      // Parse each file
      for (const file of files) {
        try {
          const data = fs.readFileSync(path.join(notificationsDir, file), 'utf8');
          const notification = JSON.parse(data);
          notifications.push(notification);
        } catch (err) {
          console.error(`Error parsing notification file ${file}:`, err);
        }
      }
      
      // Sort by timestamp (newest first)
      notifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
      console.error('Error reading notifications directory:', err);
    }
  }
  
  // Generate HTML output
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pizza Host Notifications</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        h1 {
          color: #d32f2f;
          text-align: center;
          margin-bottom: 30px;
        }
        .notification {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          padding: 20px;
          margin-bottom: 20px;
        }
        .notification.unread {
          border-left: 5px solid #d32f2f;
        }
        .notification-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .notification-id {
          font-size: 0.9em;
          color: #666;
        }
        .notification-timestamp {
          font-size: 0.9em;
          color: #666;
        }
        .customer-info {
          margin-bottom: 15px;
        }
        .address-info {
          margin-bottom: 15px;
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 5px;
        }
        .items-list {
          margin-bottom: 15px;
        }
        .item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .total-price {
          font-weight: bold;
          text-align: right;
          margin-top: 10px;
          font-size: 1.1em;
        }
        .no-notifications {
          text-align: center;
          padding: 50px;
          color: #666;
        }
        .refresh-button {
          display: block;
          margin: 20px auto;
          padding: 10px 20px;
          background-color: #d32f2f;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1em;
        }
        .refresh-button:hover {
          background-color: #b71c1c;
        }
        .push-controls {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          padding: 20px;
          margin-bottom: 20px;
          text-align: center;
        }
        .push-button {
          padding: 10px 20px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1em;
          margin: 10px;
        }
        .push-button:hover {
          background-color: #45a049;
        }
        .push-status {
          margin-top: 10px;
          font-style: italic;
          color: #666;
        }
        .push-button.disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
      </style>
    </head>
    <body>
      <h1>Pizza Host Order Notifications</h1>
      
      <div class="push-controls">
        <h3>Get Push Notifications for New Orders</h3>
        <button id="enableNotifications" class="push-button">Enable Push Notifications</button>
        <button id="disableNotifications" class="push-button" style="display:none;">Disable Notifications</button>
        <p class="push-status" id="notificationStatus">Allow notifications to receive alerts when new orders arrive</p>
      </div>
      
      <button class="refresh-button" onclick="window.location.reload()">Refresh Notifications</button>
      
      ${notifications.length === 0 ? 
        `<div class="no-notifications">No order notifications found.</div>` : 
        notifications.map(notification => `
          <div class="notification ${notification.read ? '' : 'unread'}">
            <div class="notification-header">
              <div class="notification-id">Order #${notification.id}</div>
              <div class="notification-timestamp">${new Date(notification.timestamp).toLocaleString()}</div>
            </div>
            
            <div class="customer-info">
              <div><strong>Customer:</strong> ${notification.customer.name}</div>
              <div><strong>Email:</strong> ${notification.customer.email}</div>
              <div><strong>Phone:</strong> ${notification.customer.phone}</div>
            </div>
            
            <div class="address-info">
              <div><strong>Delivery Address:</strong></div>
              <div>
                ${notification.deliveryAddress?.street || ''},
                ${notification.deliveryAddress?.city || ''},
                ${notification.deliveryAddress?.state || ''},
                ${notification.deliveryAddress?.zipCode || ''}
              </div>
            </div>
            
            <div class="items-list">
              <div><strong>Order Items:</strong></div>
              ${notification.items.map(item => `
                <div class="item">
                  <div>${item.quantity}x ${item.size} ${item.name}</div>
                  <div>₹${item.price.toFixed(2)} each</div>
                </div>
              `).join('')}
              
              <div class="total-price">
                Total: ₹${notification.totalPrice.toFixed(2)}
              </div>
            </div>
            
            <div>
              <div><strong>Payment Method:</strong> ${notification.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card Payment'}</div>
              ${notification.instructions ? `<div><strong>Instructions:</strong> ${notification.instructions}</div>` : ''}
            </div>
          </div>
        `).join('')}
        
      <button class="refresh-button" onclick="window.location.reload()">Refresh Notifications</button>
      
      <script>
        // Check if push notifications are supported
        const pushNotificationsSupported = 'PushManager' in window && 'serviceWorker' in navigator;
        
        // DOM elements
        const enableBtn = document.getElementById('enableNotifications');
        const disableBtn = document.getElementById('disableNotifications');
        const statusEl = document.getElementById('notificationStatus');
        
        // If push notifications aren't supported, disable the button
        if (!pushNotificationsSupported) {
          enableBtn.disabled = true;
          enableBtn.classList.add('disabled');
          statusEl.textContent = 'Push notifications are not supported in your browser';
        } else {
          // Check if we already have permission
          if (Notification.permission === 'granted') {
            enableBtn.style.display = 'none';
            disableBtn.style.display = 'inline-block';
            statusEl.textContent = 'Push notifications are enabled';
          } else if (Notification.permission === 'denied') {
            enableBtn.disabled = true;
            enableBtn.classList.add('disabled');
            statusEl.textContent = 'Push notifications were blocked. Please enable them in your browser settings.';
          }
        }
        
        // Enable notifications
        enableBtn.addEventListener('click', async () => {
          try {
            // Request notification permission
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
              // Register service worker
              const registration = await navigator.serviceWorker.register('/service-worker.js');
              console.log('Service Worker registered with scope:', registration.scope);
              
              // Subscribe to push notifications
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array('${process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'}')
              });
              
              // Send subscription to server
              await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription),
              });
              
              enableBtn.style.display = 'none';
              disableBtn.style.display = 'inline-block';
              statusEl.textContent = 'Push notifications enabled! You will receive alerts for new orders.';
              
              // Send a test notification
              new Notification('Pizza Host Notifications Enabled', {
                body: 'You will now receive notifications when new orders are placed.',
                icon: '/pizza-icon.png'
              });
            }
          } catch (error) {
            console.error('Error enabling notifications:', error);
            statusEl.textContent = 'Failed to enable notifications: ' + error.message;
          }
        });
        
        // Disable notifications
        disableBtn.addEventListener('click', async () => {
          try {
            const registration = await navigator.serviceWorker.getRegistration();
            const subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
              // Unsubscribe from push notifications
              await subscription.unsubscribe();
              
              // Tell server to remove subscription
              await fetch('/api/unsubscribe', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ endpoint: subscription.endpoint }),
              });
            }
            
            enableBtn.style.display = 'inline-block';
            disableBtn.style.display = 'none';
            statusEl.textContent = 'Push notifications disabled';
          } catch (error) {
            console.error('Error disabling notifications:', error);
            statusEl.textContent = 'Failed to disable notifications: ' + error.message;
          }
        });
        
        // Helper function to convert base64 to Uint8Array
        function urlBase64ToUint8Array(base64String) {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        }
        
        // Set up auto refresh for the page (every 60 seconds)
        setInterval(() => {
          window.location.reload();
        }, 60000);
      </script>
    </body>
    </html>
  `;
  
  // Send the HTML response
  res.send(html);
});

// API endpoint to handle push notification subscriptions
app.post('/api/subscribe', (req, res) => {
  const subscription = req.body;
  
  // Store subscription in a file
  try {
    const subscriptionsDir = path.join(__dirname, '../subscriptions');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(subscriptionsDir)) {
      fs.mkdirSync(subscriptionsDir, { recursive: true });
    }
    
    // Create a unique filename based on the endpoint
    const endpoint = subscription.endpoint;
    const hash = require('crypto').createHash('md5').update(endpoint).digest('hex');
    const filename = path.join(subscriptionsDir, `subscription_${hash}.json`);
    
    // Save subscription to file
    fs.writeFileSync(filename, JSON.stringify(subscription, null, 2));
    
    res.status(201).json({ message: 'Subscription saved successfully' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ message: 'Failed to save subscription' });
  }
});

// API endpoint to remove push notification subscriptions
app.post('/api/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  
  try {
    const subscriptionsDir = path.join(__dirname, '../subscriptions');
    
    if (fs.existsSync(subscriptionsDir)) {
      // Create a hash from the endpoint
      const hash = require('crypto').createHash('md5').update(endpoint).digest('hex');
      const filename = path.join(subscriptionsDir, `subscription_${hash}.json`);
      
      // Delete the subscription file if it exists
      if (fs.existsSync(filename)) {
        fs.unlinkSync(filename);
      }
    }
    
    res.status(200).json({ message: 'Subscription removed successfully' });
  } catch (error) {
    console.error('Error removing subscription:', error);
    res.status(500).json({ message: 'Failed to remove subscription' });
  }
});

// Home route
app.get('/', (req, res) => {
  res.send('PizzaHost API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  }); 
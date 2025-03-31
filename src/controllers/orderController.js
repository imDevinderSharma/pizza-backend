const Order = require('../models/Order');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

// Configure web push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'Dl048QjkP76dX58eV5Vpr_Tgiu9i50vV5H9JsUCFPPc';

webpush.setVapidDetails(
  'mailto:iamdevindersharma15122005@gmail.com',
  vapidPublicKey,
  vapidPrivateKey
);

// Send push notifications to all subscribers
const sendPushNotifications = async (order, user) => {
  try {
    const subscriptionsDir = path.join(__dirname, '../../subscriptions');
    
    // Skip if subscriptions directory doesn't exist
    if (!fs.existsSync(subscriptionsDir)) {
      console.log('No subscriptions directory found - skipping push notifications');
      return;
    }
    
    // Get all subscription files
    const files = fs.readdirSync(subscriptionsDir)
      .filter(file => file.startsWith('subscription_') && file.endsWith('.json'));
    
    if (files.length === 0) {
      console.log('No push subscribers found');
      return;
    }
    
    console.log(`Sending push notifications to ${files.length} subscribers`);
    
    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: '🍕 New Pizza Order!',
      body: `${user?.name || 'Someone'} placed a new order for ₹${order.totalPrice.toFixed(2)}`,
      icon: '/pizza-icon.png',
      badge: '/badge-icon.png',
      data: {
        url: '/notifications',
        orderId: order._id.toString(),
        timestamp: new Date().toISOString()
      }
    });
    
    // Send to each subscriber
    for (const file of files) {
      try {
        const subscriptionData = fs.readFileSync(path.join(subscriptionsDir, file), 'utf8');
        const subscription = JSON.parse(subscriptionData);
        
        await webpush.sendNotification(subscription, notificationPayload);
        console.log(`Push notification sent to subscription ${file}`);
      } catch (error) {
        // If subscription is invalid (e.g., expired), remove it
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log(`Removing invalid subscription: ${file}`);
          try {
            fs.unlinkSync(path.join(subscriptionsDir, file));
          } catch (err) {
            console.error(`Error removing invalid subscription file: ${err.message}`);
          }
        } else {
          console.error(`Error sending push notification to ${file}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
};

// Store order notification to disk (reliable alternative to email)
const storeOrderNotification = (order, user, orderDeliveryAddress, items) => {
  try {
    // Create notifications directory if it doesn't exist
    const notificationsDir = path.join(__dirname, '../../notifications');
    if (!fs.existsSync(notificationsDir)) {
      fs.mkdirSync(notificationsDir, { recursive: true });
    }

    // Format items for display
    const formattedItems = items.map(item => ({
      name: item.name || `Pizza #${item.pizza}`,
      size: item.size,
      quantity: item.quantity,
      price: item.price
    }));

    // Create notification object
    const notification = {
      id: order._id.toString(),
      timestamp: new Date().toISOString(),
      customer: {
        name: user?.name || 'Unknown',
        email: user?.email || 'Unknown',
        phone: order.contactPhone || 'Unknown'
      },
      deliveryAddress: orderDeliveryAddress,
      items: formattedItems,
      totalPrice: order.totalPrice,
      paymentMethod: order.paymentMethod,
      instructions: order.instructions || '',
      read: false
    };

    // Save notification to a timestamped file - use async write
    const filename = path.join(notificationsDir, `order_${Date.now()}_${order._id}.json`);
    
    // Use a promise to handle async file writing
    new Promise((resolve, reject) => {
      fs.writeFile(filename, JSON.stringify(notification, null, 2), (err) => {
        if (err) {
          console.error(`Failed to save notification file: ${err.message}`);
          reject(err);
        } else {
          console.log(`Order notification saved to: ${filename}`);
          resolve(filename);
        }
      });
    }).catch(err => {
      console.error('Async notification file write error:', err);
    });
    
    return { success: true, file: filename };
  } catch (error) {
    console.error('Failed to store order notification:', error);
    return { success: false, error: error.message };
  }
};

// Try to send email with fallback to file storage
const sendEmail = async (to, subject, htmlContent, order) => {
  console.log(`Preparing to send email for order: ${order?._id}`);
  console.log(`Recipient: ${to}`);
  
  // Get the user's email to include in notification if possible
  let userEmail = 'unknown';
  if (order && order.user && order.user.email) {
    userEmail = order.user.email;
  } else if (order && order.user && typeof order.user === 'object') {
    const user = await User.findById(order.user);
    if (user) userEmail = user.email;
  }
  
  // Email options
  const mailOptions = {
    from: `"Pizza Host" <${process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com'}>`,
    to,
    subject,
    html: htmlContent,
    // Disable unnecessary features that can slow down sending
    disableFileAccess: true,
    disableUrlAccess: true
  };

  console.log(`Attempting to send email with subject: ${subject}`);
  
  // Log email configuration for debugging
  const emailPass = process.env.EMAIL_PASSWORD;
  const emailUser = process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com';
  console.log(`Email configuration: User=${emailUser}, Password length=${emailPass ? emailPass.length : 'Not set'}`);

  try {
    // Use the same optimized configuration as the diagnostic endpoint
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false
      },
      // Shorter timeouts for Vercel environment
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    });
    
    // Use timeout promise to prevent hanging
    const emailSendPromise = transporter.sendMail(mailOptions);
    
    // Use 10-second timeout, same as diagnostic endpoint
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email sending timed out after 10 seconds')), 10000);
    });
    
    // Race the email sending against the timeout
    const info = await Promise.race([emailSendPromise, timeoutPromise]);
    
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error.message);
    
    // Save to file queue for both environments to ensure delivery
    try {
      const emailQueueDir = path.join(__dirname, '../../email_queue');
      if (!fs.existsSync(emailQueueDir)) {
        fs.mkdirSync(emailQueueDir, { recursive: true });
      }
      
      const filename = path.join(emailQueueDir, `email_${Date.now()}.json`);
      // Use writeFile instead of writeFileSync to be non-blocking
      fs.writeFile(filename, JSON.stringify({
        ...mailOptions,
        orderInfo: order ? { id: order._id, totalPrice: order.totalPrice } : 'No order info',
        errorDetail: error.message,
        timestamp: new Date().toISOString()
      }, null, 2), (err) => {
        if (err) {
          console.error('Failed to save email to file:', err.message);
        } else {
          console.log(`Email saved to file: ${filename}`);
        }
      });
    } catch (saveError) {
      console.error('Failed to save email to file:', saveError.message);
    }
    
    return { success: false, error: error.message };
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    // Log the incoming request
    console.log('Received order creation request from user ID:', req.user?._id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Check if authentication middleware is working
    if (!req.user) {
      console.error('Authentication error: User info missing in request');
      return res.status(401).json({ message: 'Not authenticated. User information missing.' });
    }
    
    const {
      items,
      totalPrice,
      deliveryAddress,
      contactPhone,
      paymentMethod,
      instructions,
    } = req.body;

    // Validate required fields
    if (!items || items.length === 0) {
      console.error('Validation error: No order items');
      return res.status(400).json({ message: 'No order items' });
    }
    
    if (!totalPrice) {
      console.error('Validation error: Total price missing');
      return res.status(400).json({ message: 'Total price is required' });
    }
    
    // If no delivery address is provided, get it from the user's profile
    let orderDeliveryAddress = deliveryAddress;
    
    if (!orderDeliveryAddress || Object.keys(orderDeliveryAddress).length === 0) {
      console.log('No delivery address provided, fetching from user profile');
      // Fetch current user to get their address information
      const user = await User.findById(req.user._id);
      
      if (user && user.address) {
        orderDeliveryAddress = user.address;
        console.log('Using address from user profile');
      } else {
        console.error('No address found in user profile');
        return res.status(400).json({ message: 'Delivery address is required' });
      }
    }
    
    // Prepare items with proper MongoDB IDs
    console.log('Processing order items...');
    const processedItems = items.map(item => {
      // Ensure pizza ID is a valid MongoDB ObjectId
      let pizzaId;
      try {
        // Try to convert to ObjectId if not already
        pizzaId = mongoose.Types.ObjectId.isValid(item.pizza) 
          ? new mongoose.Types.ObjectId(item.pizza) 
          : item.pizza;
        console.log(`Processed pizza ID: ${pizzaId}`);
      } catch (err) {
        console.error(`Error processing pizza ID: ${item.pizza}`, err);
        pizzaId = item.pizza;
      }
      
      return {
        pizza: pizzaId,
        quantity: item.quantity,
        size: item.size,
        price: item.price
      };
    });
    
    // Validate items data
    for (const item of processedItems) {
      if (!item.pizza) {
        console.error('Validation error: Missing pizza ID in items');
        return res.status(400).json({ message: 'Invalid order data: Pizza ID is required for all items' });
      }
    }
    
    console.log('Creating order in database...');
    // Create order in database
    const order = await Order.create({
      user: req.user._id,
      items: processedItems,
      totalPrice,
      deliveryAddress: orderDeliveryAddress,
      contactPhone: contactPhone || req.user.phone,
      paymentMethod,
      instructions,
    });

    if (order) {
      console.log('Order created successfully:', order._id);
      // Always store a direct notification to disk first (most reliable)
      const user = await User.findById(req.user._id);
      const notificationResult = storeOrderNotification(order, user, orderDeliveryAddress, items);
      
      if (notificationResult.success) {
        console.log('Order notification saved to disk successfully');
      }
      
      // Send push notifications if there are subscribers (don't await)
      sendPushNotifications(order, user).catch(err => {
        console.error('Error in push notification process:', err);
      });
      
      // Format items for email
      const itemsList = items.map(item => 
        `${item.quantity}x ${item.size} Pizza (₹${item.price.toFixed(2)} each)`
      ).join('<br>');
      
      // Format address for email
      const formattedAddress = `
        ${orderDeliveryAddress?.street || ''},
        ${orderDeliveryAddress?.city || ''},
        ${orderDeliveryAddress?.state || ''},
        ${orderDeliveryAddress?.zipCode || ''}
      `;
      
      // Email HTML content
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h1 style="color: #d32f2f; text-align: center;">New Order Placed!</h1>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="margin: 5px 0"><strong>Order ID:</strong> ${order._id}</p>
            <p style="margin: 5px 0"><strong>Customer:</strong> ${user?.name || 'Unknown'}</p>
            <p style="margin: 5px 0"><strong>Email:</strong> ${user?.email || 'Unknown'}</p>
            <p style="margin: 5px 0"><strong>Phone:</strong> ${order.contactPhone || 'Unknown'}</p>
          </div>
          
          <h2 style="color: #555; border-bottom: 1px solid #eee; padding-bottom: 10px;">Delivery Address:</h2>
          <p style="margin-bottom: 20px;">${formattedAddress}</p>
          
          <h2 style="color: #555; border-bottom: 1px solid #eee; padding-bottom: 10px;">Order Items:</h2>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            ${itemsList}
          </div>
          
          <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="margin: 5px 0"><strong>Total Amount:</strong> ₹${order.totalPrice.toFixed(2)}</p>
            <p style="margin: 5px 0"><strong>Payment Method:</strong> ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card Payment'}</p>
            <p style="margin: 5px 0"><strong>Instructions:</strong> ${order.instructions || 'None'}</p>
          </div>
          
          <p style="text-align: center; color: #888; font-size: 0.8em;">This is an automated email from Pizza Host ordering system.</p>
        </div>
      `;
      
      // Get admin email from environment variables or use default
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com';
      console.log(`Sending order notification to admin email: ${adminEmail}`);
      
      // Try to send email to the admin (don't wait for it)
      sendEmail(adminEmail, `New Pizza Order #${order._id}`, htmlContent, order)
        .then(result => {
          if (result.success) {
            console.log('Order email sent successfully to admin');
          } else {
            console.log('Admin order email failed but was saved to queue');
          }
        })
        .catch(err => {
          console.error('Error in admin email process:', err);
        });

      // Also send a confirmation email to the customer
      if (user && user.email) {
        console.log(`Sending order confirmation email to customer: ${user.email}`);
        const customerSubject = `Your Pizza Host Order Confirmation #${order._id}`;
        // You might want to slightly customize htmlContent for the customer later
        sendEmail(user.email, customerSubject, htmlContent, order)
          .then(result => {
            if (result.success) {
              console.log(`Order confirmation email sent successfully to ${user.email}`);
            } else {
              console.log(`Customer confirmation email for ${user.email} failed but was saved to queue`);
            }
          })
          .catch(err => {
            console.error(`Error sending confirmation email to ${user.email}:`, err);
          });
      } else {
        console.log('Could not send confirmation email: Customer email not found.');
      }

      // Return success response
      res.status(201).json({
        ...order.toObject(),
        emailInfo: "If you don't receive an order confirmation email, visit /api/email-diagnostic endpoint to trigger email delivery"
      });
    } else {
      res.status(400).json({ message: 'Invalid order data' });
    }
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      message: 'Server error while creating order',
      details: error.message
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.pizza', 'name image');

    if (order) {
      // Check if the order belongs to the logged-in user
      if (order.user._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this order' });
      }
      
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.pizza', 'name image')
      .sort({ createdAt: -1 });
      
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      // Check if the order belongs to the logged-in user
      if (order.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this order' });
      }
      
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.payer.email_address,
      };

      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    console.error('Error updating order to paid:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all order notifications
// @route   GET /api/orders/notifications
// @access  Private (admin only)
const getOrderNotifications = async (req, res) => {
  try {
    const notificationsDir = path.join(__dirname, '../../notifications');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(notificationsDir)) {
      fs.mkdirSync(notificationsDir, { recursive: true });
      return res.json([]);
    }
    
    // Read all notification files
    const files = fs.readdirSync(notificationsDir)
      .filter(file => file.startsWith('order_') && file.endsWith('.json'));
      
    // Parse each file and sort by timestamp (newest first)
    const notifications = [];
    
    for (const file of files) {
      try {
        const data = fs.readFileSync(path.join(notificationsDir, file), 'utf8');
        const notification = JSON.parse(data);
        notifications.push(notification);
      } catch (err) {
        console.error(`Error parsing notification file ${file}:`, err);
      }
    }
    
    // Sort by timestamp
    notifications.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching order notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/orders/notifications/:id
// @access  Private (admin only)
const markNotificationAsRead = async (req, res) => {
  try {
    const notificationsDir = path.join(__dirname, '../../notifications');
    const notificationId = req.params.id;
    
    // Find the notification file
    const files = fs.readdirSync(notificationsDir)
      .filter(file => file.includes(notificationId) && file.endsWith('.json'));
      
    if (files.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Update the notification
    const filePath = path.join(notificationsDir, files[0]);
    const data = fs.readFileSync(filePath, 'utf8');
    const notification = JSON.parse(data);
    
    notification.read = true;
    
    // Save the updated notification
    fs.writeFileSync(filePath, JSON.stringify(notification, null, 2));
    
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Cancel an order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the order belongs to the logged-in user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    // Check if the order is already delivered
    if (order.status === 'delivered') {
      return res.status(400).json({ message: 'Cannot cancel an order that has been delivered' });
    }

    // Check if the order is already cancelled
    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    // Update order status to cancelled
    order.status = 'cancelled';
    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getMyOrders,
  updateOrderToPaid,
  getOrderNotifications,
  markNotificationAsRead,
  cancelOrder
}; 
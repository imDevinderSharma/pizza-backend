# Pizza Booking Backend

This is the backend API for the Pizza Booking application, built with Node.js, Express, and MongoDB.

## Features

- RESTful API for a pizza ordering platform
- User authentication and authorization with JWT
- Order management and processing
- Email notifications via Nodemailer
- Web push notifications support
- Compatible with Vercel deployment

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Nodemailer** - Email functionality
- **Web-Push** - Push notifications

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   EMAIL_SERVICE=gmail
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_app_password
   VAPID_PUBLIC_KEY=your_vapid_public_key
   VAPID_PRIVATE_KEY=your_vapid_private_key
   ```

## Available Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with nodemon
- `npm run test-email` - Test email functionality
- `npm run test-vercel-email` - Test Vercel email functionality
- `npm run process-emails` - Process emails in the queue
- `npm run email-diagnostic` - Run email diagnostic
- `npm run ensure-vercel-email` - Ensure Vercel email setup
- `npm run generate-vapid` - Generate VAPID keys for web push
- `npm run safe-start` - Kill any process on the configured port and start server
- `npm run safe-dev` - Kill any process on the configured port and start dev server

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user

### Pizzas
- `GET /api/pizzas` - Get all pizzas
- `GET /api/pizzas/:id` - Get a specific pizza

### Orders
- `POST /api/orders` - Create a new order
- `GET /api/orders` - Get all orders (admin)
- `GET /api/orders/user` - Get current user's orders
- `GET /api/orders/:id` - Get a specific order
- `PUT /api/orders/:id` - Update an order status (admin)

### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password

## Email Functionality

The application includes email notification capabilities for order confirmations and status updates. Several utility scripts are included to test and configure email functionality:

- `testEmail.js` - Basic email testing
- `src/vercelEmailTest.js` - Testing email in Vercel environment
- `src/processEmailQueue.js` - Process queued emails (for reliability)
- `src/fixVercelEmail.js` - Diagnostic for Vercel email issues
- `src/ensureVercelEmail.js` - Setup for Vercel email

## Notification System

The server maintains a simple notification system for tracking orders. You can view these notifications by accessing the `/notifications` endpoint.

## Deployment

This application is configured for deployment on Vercel with the included `vercel.json` configuration file.
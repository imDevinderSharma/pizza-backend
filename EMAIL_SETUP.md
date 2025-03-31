# Pizza Host Email Functionality

This document explains how the email notification system works in the Pizza Host application.

## Overview

When a user places an order, an email is sent to the admin email address specified in the `.env` file. This email contains details about the order including customer info, delivery address, ordered items, and payment information.

## Configuration

Email is configured through the `.env` file with these variables:

```
EMAIL_USER=devindersharma15122005@gmail.com
EMAIL_PASSWORD=your_app_password
ADMIN_EMAIL=your_notification_email@example.com
```

If ADMIN_EMAIL is not specified, the system will use EMAIL_USER as the recipient for order notifications.

### Important: Gmail Configuration

If using Gmail (default), you must:

1. Enable 2-Step Verification on your Google account
2. Generate an App Password:
   - Go to your Google Account > Security > 2-Step Verification > App passwords
   - Select "Mail" as the app and "Other" as the device (name it "Pizza Host")
   - Copy the generated 16-character password
   - Paste it as the EMAIL_PASSWORD in your .env file
   - **IMPORTANT**: Remove any spaces from the password when adding to .env file

Regular Gmail passwords will not work due to Google's security measures.

## Testing Email Functionality

Run the email test script to verify your configuration works:

```
npm run test-email
```

This will try to send a test email and give you detailed results about success or failure.

## Fallback System

If email sending fails for any reason, the application will automatically:

1. Log the error in the console
2. Save the email as a JSON file in the `email_queue` directory

You can send these queued emails later using:

```
npm run process-emails
```

## Troubleshooting

If emails aren't being sent:

1. Check the logs for specific error messages
2. Verify your Gmail App Password is correctly set in .env
3. Make sure 2-Step Verification is enabled for your Google account
4. Try running the email test script to diagnose issues
5. Check if emails are being stored in the email_queue directory
6. If there are queued emails, try processing them with the provided script

## Common Issues

### "Invalid login" errors

This usually means:
- Your EMAIL_PASSWORD is not a valid App Password
- 2-Step Verification is not enabled on your Google account
- You're using a regular password instead of an App Password

### "Self-signed certificate" or TLS errors

This is handled by the `rejectUnauthorized: false` option, but you may try:
- Using a different email service provider
- Updating your Node.js version

### Network connectivity issues

- Make sure your server has internet access
- Check if port 587 (SMTP) is not blocked by a firewall 
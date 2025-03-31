# Pizza Host Email Issue Fix for Vercel

## Problem

Emails are not being sent after deploying the application to Vercel, even though they work correctly in the local development environment.

## Diagnosis

There are several potential causes for this issue:

1. **Missing environment variables**: Vercel environment might not have the email credentials.
2. **Serverless function timeout**: The default 10-second timeout may not be enough.
3. **Google security restrictions**: Gmail may block login attempts from serverless environments.
4. **Node.js DNS resolution issues**: Sometimes occurs in serverless environments.

## Solution Steps

### 1. Verify Environment Variables in Vercel

1. Log in to your Vercel dashboard
2. Select the pizza-backend project
3. Go to Settings → Environment Variables
4. Check that the following variables are set:
   - `EMAIL_USER` (your Gmail address)
   - `EMAIL_PASSWORD` (your Gmail app password - see Gmail setup below)
   - `ADMIN_EMAIL` (optional, recipient for notifications)

### 2. Setup Gmail App Password

App passwords are required when using Gmail:

1. Go to your Google Account (https://myaccount.google.com/)
2. Select Security
3. Under "Signing in to Google," select 2-Step Verification (must be enabled)
4. At the bottom of the page, select App passwords
5. Select "Mail" as the app and "Other" as the device (name it "Pizza Host")
6. Google will generate a 16-character password (without spaces)
7. Copy this password for the next step

### 3. Update Vercel Environment Variables

1. In Vercel dashboard, update the following:
   - Set `EMAIL_PASSWORD` to the 16-character App Password (no spaces)
   - Make sure `EMAIL_USER` is your Gmail address
   - Optional: Set `ADMIN_EMAIL` for notification recipient

### 4. Adjust Function Timeout

1. Confirm your vercel.json includes the following settings:
   ```json
   "functions": {
     "src/app.js": {
       "memory": 1024,
       "maxDuration": 10
     }
   }
   ```

### 5. Run Email Diagnostic

After deploying the updates to Vercel, run the diagnostic:

1. Visit: `https://pizza-backend-xi.vercel.app/api/email-diagnostic`
2. Check the JSON response for detailed diagnostic information
3. Review Vercel function logs for additional details

## Fallback Solutions

If emails still fail to send:

### Option 1: Process Email Queue Manually

The system automatically saves failed emails to a queue:

1. Add a scheduled task on a reliable server to:
   ```
   npm run process-emails
   ```

### Option 2: Switch to a Third-Party Email Service

Consider using a dedicated email service:

1. Create an account with SendGrid, Mailgun, or AWS SES
2. Update the email service configuration in the code
3. Update environment variables with the new service credentials

## Testing

After making these changes:

1. Run the diagnostic endpoint: `/api/email-diagnostic`
2. Create a test order and check if the email is received
3. Look at logs to see any errors
4. Verify if emails are being stored in the queue if sending fails

## Common Error Messages and Solutions

- **Invalid login**: Gmail credentials are incorrect or App Password is not set up properly.
- **Connection timeout**: Increase timeout values in the nodemailer configuration.
- **Failed to connect to SMTP**: Try using a third-party email service instead of Gmail.
- **Self-signed certificate**: Add `tls: { rejectUnauthorized: false }` to the transport configuration. 
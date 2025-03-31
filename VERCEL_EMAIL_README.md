# Pizza Host Email System on Vercel

This document explains issues and solutions for the email notification system when deployed to Vercel.

## Problem

Email notifications may not work properly in Vercel's serverless environment due to:

1. Timeouts - Vercel serverless functions have execution limits (10 seconds by default)
2. Cold starts - Functions may take longer to initialize on first run
3. SMTP connection issues - Direct SMTP can be problematic in serverless environments

## Solution

The following changes have been made to fix email functionality on Vercel:

1. Updated `orderController.js` to use Gmail service instead of direct SMTP configuration
2. Reduced timeout values to work better in serverless environment
3. Added better error logging to capture specific Vercel-related issues
4. Modified `vercel.json` to increase function timeout from default to 10 seconds
5. Created a `/api/test-email` endpoint to verify email functionality in production

## Testing Email on Vercel

After deploying to Vercel, you can test the email functionality by:

1. Visit your deployed API URL with the path `/api/test-email` 
   (e.g., https://your-vercel-app.vercel.app/api/test-email)
2. Check the Vercel function logs for any errors
3. Check your admin email inbox for the test email

## Troubleshooting Vercel Email Issues

If emails still don't work on Vercel:

1. Verify the following environment variables are set in Vercel dashboard:
   - `EMAIL_USER` (your Gmail address)
   - `EMAIL_PASSWORD` (your Gmail app password)
   - `ADMIN_EMAIL` (recipient for order notifications)

2. Check Vercel logs for specific error messages

3. Test locally first with:
   ```
   npm run test-email
   npm run test-vercel-email
   ```

4. If emails are being queued but not sent, you can manually process them:
   ```
   npm run process-emails
   ```

## Gmail Security Requirements

Remember that for Gmail to work:
1. Enable 2-Step Verification on your Google account
2. Generate an App Password (16 characters without spaces)
3. Use this App Password in your Vercel environment variables

## Alternative Solutions

If email still doesn't work reliably on Vercel:

1. Consider using a third-party email service like SendGrid, Mailgun, or AWS SES
2. Set up a dedicated email microservice on a non-serverless platform
3. Use a webhook to trigger emails from another system

## Current Implementation

The system currently:
1. Attempts to send email directly
2. If that fails, saves the email to a queue file
3. Provides a script to manually process the email queue 
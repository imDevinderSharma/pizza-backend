/**
 * This script is designed to help troubleshoot and fix email issues on Vercel
 * It verifies environment variables, tests connections, and provides detailed diagnostics
 */

const nodemailer = require('nodemailer');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Verify Vercel environment variables
const verifyEnvironmentVariables = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL;
  
  console.log('Environment variables check:');
  console.log(`EMAIL_USER: ${emailUser ? '✓ Present' : '✗ Missing'}`);
  console.log(`EMAIL_PASSWORD: ${emailPass ? `✓ Present (${emailPass.length} characters)` : '✗ Missing'}`);
  console.log(`ADMIN_EMAIL: ${adminEmail || '⚠️ Not set, will use EMAIL_USER'}`);
  
  return {
    hasEmailUser: !!emailUser,
    hasEmailPassword: !!emailPass,
    hasAdminEmail: !!adminEmail,
    isVercel: !!process.env.VERCEL
  };
};

// Create the most Vercel-friendly transporter configuration
const createVercelTransporter = async () => {
  try {
    // Minimal, efficient transporter for Vercel
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      },
      // Ultra-minimal timeout values for Vercel
      connectionTimeout: 3000,
      greetingTimeout: 3000,
      socketTimeout: 5000
    });
    
    return { success: true, transporter };
  } catch (error) {
    console.error('Failed to create transporter:', error.message);
    return { success: false, error: error.message };
  }
};

// Very fast SMTP connection verification
const verifySmtpConnection = async (transporter) => {
  try {
    // Set a shorter timeout for verification
    const verifyPromise = transporter.verify();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('SMTP verification timed out after 4 seconds')), 4000)
    );
    
    await Promise.race([verifyPromise, timeoutPromise]);
    console.log('✓ SMTP connection verified on Vercel!');
    return { success: true };
  } catch (error) {
    console.error('✗ SMTP verification failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Fast email sending optimized for Vercel
const sendVercelEmail = async (transporter, to, subject, html) => {
  try {
    // Minimal email options
    const mailOptions = {
      from: `"Pizza Host" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      // Disable unnecessary features
      disableFileAccess: true,
      disableUrlAccess: true
    };
    
    // Ultra-fast email sending with timeout
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email sending timed out after 5 seconds')), 5000)
    );
    
    const info = await Promise.race([sendPromise, timeoutPromise]);
    console.log('✓ Email sent successfully via Vercel!');
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('✗ Failed to send email via Vercel:', error.message);
    // Instead of saving to file here (which is slow), just log the error
    return { success: false, error: error.message };
  }
};

// Process the email queue (saved from failed attempts)
const processEmailQueue = async () => {
  const queueDir = path.join(__dirname, '../email_queue');
  
  if (!fs.existsSync(queueDir)) {
    console.log('No email queue directory found');
    return { processed: 0 };
  }
  
  const files = fs.readdirSync(queueDir)
    .filter(file => file.startsWith('email_') && file.endsWith('.json'));
    
  if (files.length === 0) {
    console.log('Email queue is empty');
    return { processed: 0 };
  }
  
  console.log(`Found ${files.length} queued emails to process`);
  
  // Create a Vercel-friendly transporter
  const transporterResult = await createVercelTransporter();
  if (!transporterResult.success) {
    return { 
      processed: 0, 
      error: `Failed to create transporter: ${transporterResult.error}` 
    };
  }
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of files) {
    try {
      const emailData = JSON.parse(fs.readFileSync(path.join(queueDir, file), 'utf8'));
      
      // Prepare the mail options
      const mailOptions = {
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      };
      
      // Try to send with a short timeout
      const sendPromise = transporterResult.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timed out after 5 seconds')), 5000)
      );
      
      await Promise.race([sendPromise, timeoutPromise]);
      
      // On success, remove the file
      fs.unlinkSync(path.join(queueDir, file));
      successCount++;
      
      console.log(`Successfully processed email from queue: ${file}`);
    } catch (error) {
      console.error(`Failed to process queued email ${file}:`, error.message);
      failCount++;
    }
  }
  
  return { 
    processed: successCount,
    failed: failCount,
    total: files.length
  };
};

// Main API handler
module.exports = async (req, res) => {
  try {
    // Step 1: Verify environment
    const envCheck = verifyEnvironmentVariables();
    
    // Step 2: Verify transporter
    const transporterResult = await createVercelTransporter();
    
    // Step 3: Test SMTP connection if transporter created successfully
    let smtpCheck = { success: false, error: 'Transporter not created' };
    if (transporterResult.success) {
      smtpCheck = await verifySmtpConnection(transporterResult.transporter);
    }
    
    // Return results
    res.status(200).json({
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL ? 'Vercel' : 'Local',
      environmentCheck: envCheck,
      transporterCheck: {
        success: transporterResult.success,
        error: transporterResult.error || undefined
      },
      smtpCheck,
      message: smtpCheck.success 
        ? 'Email configuration looks good on Vercel'
        : 'Email configuration has issues, check details'
    });
  } catch (error) {
    console.error('Error in Vercel email diagnostic:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Vercel email diagnostic failed'
    });
  }
};

// Allow direct execution for manual testing
if (require.main === module) {
  (async () => {
    console.log('Running Vercel Email Diagnostic Tool');
    
    // Step 1: Check environment variables
    const envCheck = verifyEnvironmentVariables();
    console.log('\nEnvironment Check:', envCheck);
    
    if (!envCheck.hasEmailUser || !envCheck.hasEmailPassword) {
      console.error('❌ Critical email configuration missing!');
      return;
    }
    
    // Step 2: Try to create a transporter
    console.log('\nCreating email transporter...');
    const transporterResult = await createVercelTransporter();
    
    if (!transporterResult.success) {
      console.error('❌ Failed to create email transporter:', transporterResult.error);
      return;
    }
    
    // Step 3: Verify SMTP connection
    console.log('\nVerifying SMTP connection...');
    const smtpCheck = await verifySmtpConnection(transporterResult.transporter);
    
    if (smtpCheck.success) {
      console.log('✅ SMTP connection verified successfully!');
    } else {
      console.error('❌ SMTP connection failed:', smtpCheck.error);
      
      // Special handling for Gmail authentication issues
      if (smtpCheck.error.includes('Invalid login')) {
        console.log('\nFor Gmail, please check:');
        console.log('1. 2-Factor Authentication is enabled on your Google account');
        console.log('2. You\'re using an App Password (16 characters without spaces)');
        console.log('3. The EMAIL_PASSWORD environment variable has the correct App Password');
      }
      
      return;
    }
    
    // Step 4: Process any queued emails
    console.log('\nChecking for queued emails...');
    const queueResult = await processEmailQueue();
    
    if (queueResult.processed > 0) {
      console.log(`✅ Successfully processed ${queueResult.processed} queued emails`);
    }
    
    if (queueResult.failed > 0) {
      console.log(`⚠️ Failed to process ${queueResult.failed} queued emails`);
    }
    
    console.log('\n✅ Vercel email diagnostic completed successfully');
  })();
} 
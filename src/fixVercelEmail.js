const nodemailer = require('nodemailer');
require('dotenv').config();
const fetch = require('node-fetch');

// Utility to check environment variables
const checkEnvironmentVariables = () => {
  console.log('Checking email environment variables...');
  
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  
  console.log(`EMAIL_USER: ${EMAIL_USER ? '✓ Set' : '✗ Not set'}`);
  console.log(`EMAIL_PASSWORD: ${EMAIL_PASSWORD ? `✓ Set (${EMAIL_PASSWORD.length} characters)` : '✗ Not set'}`);
  console.log(`ADMIN_EMAIL: ${ADMIN_EMAIL ? `✓ Set (${ADMIN_EMAIL})` : '⚠️ Not set, will use EMAIL_USER as fallback'}`);
  
  return {
    hasEmailUser: !!EMAIL_USER,
    hasEmailPassword: !!EMAIL_PASSWORD,
    hasAdminEmail: !!ADMIN_EMAIL
  };
};

// Create and verify transporter
const testEmailService = async () => {
  console.log('\nTesting email service connection...');
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com',
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      },
      // Shorter timeouts for Vercel environment
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    });
    
    // Verify connection configuration
    try {
      await transporter.verify();
      console.log('✓ Email service connection successful!');
      return { success: true, transporter };
    } catch (verifyError) {
      console.error('✗ Email service connection failed:', verifyError.message);
      return { success: false, error: verifyError.message };
    }
  } catch (error) {
    console.error('✗ Failed to create email transport:', error.message);
    return { success: false, error: error.message };
  }
};

// Send a simple test email
const sendTestEmail = async (transporter) => {
  if (!transporter) {
    console.log('Skipping test email - no valid transporter');
    return { success: false, error: 'No valid transporter' };
  }
  
  console.log('\nSending test email...');
  
  const to = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com';
  
  const mailOptions = {
    from: `"Pizza Host System" <${process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com'}>`,
    to,
    subject: 'Email System Diagnostic Test',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h1 style="color: #d32f2f;">Email Diagnostic Test</h1>
        <p>This email confirms that the email service is working properly.</p>
        <p><strong>Environment:</strong> ${process.env.VERCEL ? 'Vercel Production' : 'Local Development'}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      </div>
    `
  };
  
  try {
    console.log(`Sending to: ${to}`);
    
    // Use timeout promise to prevent hanging
    const emailPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email sending timed out after 10 seconds')), 10000)
    );
    
    const result = await Promise.race([emailPromise, timeoutPromise]);
    
    console.log('✓ Test email sent successfully!');
    console.log(`Message ID: ${result.messageId}`);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('✗ Failed to send test email:', error.message);
    return { success: false, error: error.message };
  }
};

// API handler for Vercel
module.exports = async (req, res) => {
  try {
    console.log('Starting email diagnostic...');
    console.log('Vercel environment:', process.env.VERCEL ? 'Yes' : 'No');
    
    // Check environment variables
    const envCheck = checkEnvironmentVariables();
    
    // Test email service
    const serviceTest = await testEmailService();
    
    if (serviceTest.success) {
      // Try to send a test email
      const emailTest = await sendTestEmail(serviceTest.transporter);
      
      res.status(emailTest.success ? 200 : 500).json({
        timestamp: new Date().toISOString(),
        environment: process.env.VERCEL ? 'Vercel' : 'Local',
        envCheck,
        serviceTest: { success: serviceTest.success },
        emailTest,
        message: emailTest.success 
          ? 'Email system is working correctly!' 
          : 'Email connection successful but sending failed'
      });
    } else {
      res.status(500).json({
        timestamp: new Date().toISOString(),
        environment: process.env.VERCEL ? 'Vercel' : 'Local',
        envCheck,
        serviceTest: { 
          success: false, 
          error: serviceTest.error 
        },
        message: 'Email service connection failed'
      });
    }
  } catch (error) {
    console.error('Diagnostic error:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Email diagnostic failed'
    });
  }
};

// Allow direct execution for testing
if (require.main === module) {
  (async () => {
    console.log('Running email diagnostic...');
    
    // Check environment variables
    const envCheck = checkEnvironmentVariables();
    
    if (!envCheck.hasEmailUser || !envCheck.hasEmailPassword) {
      console.error('\n⚠️ Critical environment variables missing!');
      console.log('Please set EMAIL_USER and EMAIL_PASSWORD in your .env file or Vercel environment variables');
      return;
    }
    
    // Test email service
    const serviceTest = await testEmailService();
    
    if (serviceTest.success) {
      console.log('\n✓ Email service connection successful!');
      
      // Send test email
      const emailTest = await sendTestEmail(serviceTest.transporter);
      
      if (emailTest.success) {
        console.log('\n✓ Email system is working correctly!');
      } else {
        console.log('\n⚠️ Email connection successful but sending failed');
        console.log('Error:', emailTest.error);
      }
    } else {
      console.log('\n✗ Email service connection failed!');
      console.log('Error:', serviceTest.error);
      
      if (serviceTest.error.includes('Invalid login')) {
        console.log('\nℹ️ For Gmail, make sure:');
        console.log('1. 2-Step Verification is enabled on your Google account');
        console.log('2. You are using an App Password (16 characters without spaces)');
        console.log('3. The EMAIL_PASSWORD environment variable contains this App Password');
      }
    }
  })();
} 
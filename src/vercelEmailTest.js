const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transport with Vercel-friendly settings
const createTransporter = async () => {
  console.log('Creating Gmail transporter for Vercel environment...');
  console.log(`Email User: ${process.env.EMAIL_USER || 'default-email@gmail.com'}`);
  console.log(`Email Password Length: ${process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 'Not set'}`);
  
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Using service rather than host/port is more reliable in serverless
    auth: {
      user: process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com',
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    },
    // Lower timeout values for serverless environment
    connectionTimeout: 5000, 
    greetingTimeout: 5000,
    socketTimeout: 10000
  });
  
  return transporter;
};

// Send test email with detailed logging
const sendTestEmail = async () => {
  console.log('Starting Vercel email test...');
  console.log('Environment:', process.env.VERCEL ? 'Vercel' : 'Local');
  
  try {
    // Ultra-minimal transporter specifically for Vercel
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      },
      // Ultra-minimal timeouts
      connectionTimeout: 3000,
      greetingTimeout: 3000,
      socketTimeout: 5000
    });
    
    console.log('Transporter created successfully');
    
    // Try to verify SMTP connection with timeout
    try {
      console.log('Verifying SMTP connection...');
      
      const verifyPromise = transporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP verification timed out after 4 seconds')), 4000)
      );
      
      await Promise.race([verifyPromise, timeoutPromise]);
      console.log('✓ SMTP connection verified!');
    } catch (error) {
      console.error('✗ SMTP verification failed:', error.message);
      return {
        success: false,
        stage: 'smtp_verification',
        error: error.message
      };
    }
    
    // Test email options with minimal features
    const mailOptions = {
      from: `"Pizza Host Test" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: 'Vercel Email Test with Optimizations',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h1 style="color: #d32f2f;">Vercel Email Test (Optimized)</h1>
          <p>This email confirms that the optimized email functionality is working.</p>
          <p>Time: ${new Date().toISOString()}</p>
          <p>Environment: ${process.env.VERCEL ? 'Vercel Production' : 'Local Development'}</p>
        </div>
      `,
      // Disable unnecessary features
      disableFileAccess: true,
      disableUrlAccess: true
    };
    
    console.log(`Sending test email to: ${mailOptions.to}`);
    
    // Send with very aggressive timeout
    const sendPromise = transporter.sendMail(mailOptions);
    const sendTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email sending timed out after 5 seconds')), 5000)
    );
    
    const info = await Promise.race([sendPromise, sendTimeoutPromise]);
    
    console.log('✓ Test email sent successfully from Vercel environment!');
    console.log('Message ID:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
      recipient: mailOptions.to,
      stage: 'complete'
    };
  } catch (error) {
    console.error('Failed to send test email from Vercel:', error);
    return {
      success: false,
      error: error.message,
      stage: 'unknown'
    };
  }
};

// API handler for Vercel
module.exports = async (req, res) => {
  try {
    const result = await sendTestEmail();
    
    if (result.success) {
      res.status(200).json({
        message: 'Email test successful',
        details: result
      });
    } else {
      res.status(500).json({
        message: 'Email test failed',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      message: 'Server error during email test',
      error: error.message
    });
  }
};

// Allow direct execution for testing
if (require.main === module) {
  sendTestEmail()
    .then(result => console.log('Test result:', result))
    .catch(err => console.error('Test error:', err));
} 
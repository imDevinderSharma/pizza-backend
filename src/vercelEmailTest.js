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
  
  try {
    const transporter = await createTransporter();
    
    // Test email options
    const mailOptions = {
      from: `"Pizza Host Vercel Test" <${process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com'}>`,
      to: process.env.ADMIN_EMAIL || 'iamdevindersharma15122005@gmail.com',
      subject: 'Vercel Deployment Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h1 style="color: #d32f2f;">Vercel Email Test Successful</h1>
          <p>This email confirms that the email functionality is working in the Vercel serverless environment.</p>
          <p>Time: ${new Date().toISOString()}</p>
          <p>Environment: ${process.env.VERCEL ? 'Vercel Production' : 'Local Development'}</p>
        </div>
      `
    };
    
    console.log(`Sending test email to: ${mailOptions.to}`);
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Test email sent successfully from Vercel environment!');
    console.log('Message ID:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
      recipient: mailOptions.to
    };
  } catch (error) {
    console.error('Failed to send test email from Vercel:', error);
    return {
      success: false,
      error: error.message
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
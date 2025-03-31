require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Testing Email Functionality');
console.log('========================');
console.log('Email password length:', process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 'Not set');

async function testEmail() {
  // Create transporter with detailed logging
  console.log('Creating transporter...');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'iamdevindersharma15122005@gmail.com',
      pass: process.env.EMAIL_PASSWORD
    },
    debug: true, // Show debug output
    logger: true // Log information about the transport mechanism
  });

  console.log('Sending test email...');
  
  // Send test email
  try {
    const info = await transporter.sendMail({
      from: '"Pizza Host Test" <iamdevindersharma15122005@gmail.com>',
      to: 'iamdevindersharma15122005@gmail.com',
      subject: 'Test Email from Pizza Host',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e53935; text-align: center;">Email Test Successful</h1>
          <p>This email confirms that the email sending functionality is working correctly.</p>
          <p>Time: ${new Date().toLocaleString()}</p>
        </div>
      `
    });

    console.log('Message sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    
    if (error.code === 'EAUTH') {
      console.error('\nAuthentication Error!');
      console.error('This typically means your Gmail password is incorrect or you need to:');
      console.error('1. Enable "Less secure app access" in your Google account settings, OR');
      console.error('2. Create an App Password if you have 2-factor authentication enabled.');
      console.error('   (Go to: https://myaccount.google.com/apppasswords)');
    }
  }
}

testEmail(); 
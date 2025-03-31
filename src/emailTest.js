require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

console.log('Email Test Script');
console.log('=================');
console.log('EMAIL_USER:', process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com (default)');
console.log('EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 'Not set');

if (!process.env.EMAIL_PASSWORD) {
  console.error('WARNING: EMAIL_PASSWORD is not set in your .env file. Email sending will likely fail.');
  console.error('Please make sure you have a valid Gmail App Password set in your .env file.');
}

// Test saving to file
const emailQueueDir = path.join(__dirname, '../email_queue');
if (!fs.existsSync(emailQueueDir)) {
  console.log('Creating email queue directory:', emailQueueDir);
  fs.mkdirSync(emailQueueDir, { recursive: true });
} else {
  console.log('Email queue directory exists:', emailQueueDir);
}

// Format email password for display (show first 2 and last 2 chars if available)
const formatPassword = (pass) => {
  if (!pass) return 'Not set';
  if (pass.length <= 4) return '****';
  return pass.substr(0, 2) + '****' + pass.substr(-2);
};

// Configure nodemailer with Gmail
const createTransporter = async () => {
  console.log('\nCreating Gmail transporter...');
  console.log(`Email: ${process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com'}`);
  console.log(`Password: ${formatPassword(process.env.EMAIL_PASSWORD)}`);
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com',
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Try to verify connection
    try {
      console.log('Verifying SMTP connection...');
      await transporter.verify();
      console.log('✓ SMTP connection verified successfully! Gmail is working.');
      return transporter;
    } catch (verifyError) {
      console.error('✗ SMTP verification failed:', verifyError.message);
      handleGmailAuthError(verifyError);
      return null;
    }
  } catch (error) {
    console.error('✗ Failed to create email transporter:', error.message);
    handleGmailAuthError(error);
    return null;
  }
};

// Handle Gmail-specific authentication errors
const handleGmailAuthError = (error) => {
  if (error.message.includes('Invalid login') || error.message.includes('authentication failed')) {
    console.error('\nGmail authentication failed. This is typically because:');
    console.error('1. Your password is incorrect or not an App Password');
    console.error('2. 2-Step Verification is not enabled on your Google account');
    console.error('3. Less secure app access is turned off (which is good, but requires App Password)');
    console.error('\nTo fix this:');
    console.error('1. Enable 2-Step Verification at https://myaccount.google.com/security');
    console.error('2. Generate an App Password at https://myaccount.google.com/apppasswords');
    console.error('   - Select "Mail" as the app and "Other" as the device (name it "Pizza Host")');
    console.error('3. Copy the 16-character password (without spaces) to your .env file as EMAIL_PASSWORD');
  } else if (error.message.includes('self signed certificate')) {
    console.error('\nTLS certificate error - this may be a network or security issue.');
    console.error('The application will still try to work by disabling strict certificate checking.');
  }
};

// Save to file function
const saveEmailToFile = async (mailOptions) => {
  try {
    const filename = path.join(emailQueueDir, `test_order_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(mailOptions, null, 2));
    console.log(`✓ Test email saved to file: ${filename}`);
    return { success: true, file: filename };
  } catch (error) {
    console.error('✗ Error saving email to file:', error.message);
    return { success: false, error };
  }
};

// Send a test email
const sendTestEmail = async () => {
  console.log('\nSending test email...');
  
  const mailOptions = {
    from: `"Pizza Host Test" <${process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com'}>`,
    to: 'iamdevindersharma15122005@gmail.com',
    subject: 'Test Order Email',
    html: `<div style="font-family: Arial; color: #d32f2f;"><h1>Test Order Email</h1><p>This is a test order email.</p></div>`
  };
  
  try {
    // Try to send via Gmail
    const transporter = await createTransporter();
    
    if (transporter) {
      console.log(`Sending test email to: ${mailOptions.to}`);
      const info = await transporter.sendMail(mailOptions);
      console.log('✓ Test email sent successfully!');
      console.log('Message ID:', info.messageId);
      
      // Also save to file to test file saving
      await saveEmailToFile(mailOptions);
      
      return true;
    } else {
      console.log('✗ Could not create transporter, falling back to file storage');
      await saveEmailToFile(mailOptions);
      return false;
    }
  } catch (error) {
    console.error('✗ Error sending test email:', error.message);
    console.log('Falling back to file storage...');
    await saveEmailToFile(mailOptions);
    return false;
  }
};

// Send a test order email
const sendTestOrderEmail = async () => {
  console.log('\nSending test order email...');
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h1 style="color: #d32f2f; text-align: center;">New Order Placed!</h1>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <p style="margin: 5px 0"><strong>Order ID:</strong> TEST-ORDER-123</p>
        <p style="margin: 5px 0"><strong>Customer:</strong> Test Customer</p>
        <p style="margin: 5px 0"><strong>Email:</strong> testcustomer@example.com</p>
        <p style="margin: 5px 0"><strong>Phone:</strong> 1234567890</p>
      </div>
      
      <h2 style="color: #555; border-bottom: 1px solid #eee; padding-bottom: 10px;">Delivery Address:</h2>
      <p style="margin-bottom: 20px;">
        Test Street,
        Test City,
        Test State,
        12345
      </p>
      
      <h2 style="color: #555; border-bottom: 1px solid #eee; padding-bottom: 10px;">Order Items:</h2>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        1x medium Test Pizza (₹349.00 each)<br>
        2x small Cheese Pizza (₹249.00 each)
      </div>
      
      <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <p style="margin: 5px 0"><strong>Total Amount:</strong> ₹847.00</p>
        <p style="margin: 5px 0"><strong>Payment Method:</strong> Cash on Delivery</p>
        <p style="margin: 5px 0"><strong>Instructions:</strong> Test instructions</p>
      </div>
      
      <p style="text-align: center; color: #888; font-size: 0.8em;">This is a test email from Pizza Host ordering system.</p>
    </div>
  `;
  
  const mailOptions = {
    from: `"Pizza Host" <${process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com'}>`,
    to: 'iamdevindersharma15122005@gmail.com',
    subject: 'Test Order #TEST-123',
    html: htmlContent
  };
  
  try {
    const transporter = await createTransporter();
    
    if (transporter) {
      console.log(`Sending test order email to: ${mailOptions.to}`);
      const info = await transporter.sendMail(mailOptions);
      console.log('✓ Test order email sent successfully!');
      console.log('Message ID:', info.messageId);
      return true;
    } else {
      console.log('✗ Could not create transporter, falling back to file storage');
      await saveEmailToFile(mailOptions);
      return false;
    }
  } catch (error) {
    console.error('✗ Error sending test order email:', error.message);
    await saveEmailToFile(mailOptions);
    return false;
  }
};

// Run the test
(async () => {
  try {
    // First send a simple test email
    const simpleSuccess = await sendTestEmail();
    
    // Then send a test order email
    const orderSuccess = await sendTestOrderEmail();
    
    if (simpleSuccess && orderSuccess) {
      console.log('\n✓ All email tests completed successfully!');
      console.log('Email notification system is working properly.');
    } else if (simpleSuccess) {
      console.log('\n⚠️ Simple email test succeeded but order email failed.');
      console.log('Check the email content formatting.');
    } else if (orderSuccess) {
      console.log('\n⚠️ Order email test succeeded but simple email failed.');
      console.log('Email functionality is partially working.');
    } else {
      console.log('\n✗ Both email tests failed but fallback to file storage worked.');
      console.log('To fix Gmail authentication:');
      console.log('1. Make sure 2-Step Verification is enabled on your Google account');
      console.log('2. Generate an App Password at https://myaccount.google.com/apppasswords');
      console.log('3. Update the EMAIL_PASSWORD in your .env file with this App Password');
    }
    
    // Test processing the queue
    console.log('\nYou can process any queued emails by running:');
    console.log('npm run process-emails');
  } catch (error) {
    console.error('\n✗ Email test failed:', error.message);
  }
})(); 
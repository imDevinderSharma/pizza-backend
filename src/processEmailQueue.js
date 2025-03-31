require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const emailQueueDir = path.join(__dirname, '../email_queue');

// Process the email queue
const processEmailQueue = async () => {
  console.log('Email Queue Processor');
  console.log('====================');

  // Check if queue directory exists
  if (!fs.existsSync(emailQueueDir)) {
    console.log('Email queue directory does not exist, creating it now...');
    fs.mkdirSync(emailQueueDir, { recursive: true });
    console.log('No emails to process. Queue directory was just created.');
    return { processed: 0, successful: 0, failed: 0 };
  }

  // Configure nodemailer with Gmail
  const createTransporter = async () => {
    console.log('Creating Gmail transporter...');
    console.log(`Email User: ${process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com'}`);
    console.log(`Email Password Length: ${process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 'Not set'}`);
    
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
        await transporter.verify();
        console.log('✓ SMTP connection verified successfully!');
        return transporter;
      } catch (verifyError) {
        console.error('✗ SMTP verification failed:', verifyError.message);
        console.error('Make sure you have:');
        console.error('1. Enabled 2-Step Verification on your Google account');
        console.error('2. Generated an App Password and added it to your .env file');
        console.error('3. Correctly formatted the App Password without spaces');
        return null;
      }
    } catch (error) {
      console.error('✗ Failed to create email transporter:', error.message);
      return null;
    }
  };

  try {
    // Get all JSON files in the queue directory
    const files = fs.readdirSync(emailQueueDir)
      .filter(file => file.endsWith('.json') && !file.startsWith('processed_'))
      .map(file => path.join(emailQueueDir, file));
    
    if (files.length === 0) {
      console.log('No emails to process. Queue is empty.');
      return { processed: 0, successful: 0, failed: 0 };
    }
    
    console.log(`Found ${files.length} emails to process.`);
    
    // Create transporter once for all emails
    const transporter = await createTransporter();
    if (!transporter) {
      console.error('✗ Could not create email transporter. Aborting queue processing.');
      return { processed: files.length, successful: 0, failed: files.length };
    }
    
    // Process each email
    let successCount = 0;
    let failCount = 0;
    
    for (const file of files) {
      try {
        console.log(`Processing email file: ${path.basename(file)}`);
        
        // Read the email data
        const emailData = JSON.parse(fs.readFileSync(file, 'utf8'));
        
        // Ensure the email has all required fields
        if (!emailData.to || !emailData.subject || !emailData.html) {
          throw new Error('Email file missing required fields (to, subject, html)');
        }
        
        // Log email details
        console.log(`Sending email to: ${emailData.to}`);
        console.log(`Subject: ${emailData.subject}`);
        
        // Send the email
        const info = await transporter.sendMail({
          from: emailData.from || `"Pizza Host" <${process.env.EMAIL_USER || 'iamdevindersharma15122005@gmail.com'}>`,
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html
        });
        
        console.log(`✓ Email sent successfully from queue. Message ID: ${info.messageId}`);
        
        // Move the file to a 'processed' directory
        const processedDir = path.join(emailQueueDir, 'processed');
        if (!fs.existsSync(processedDir)) {
          fs.mkdirSync(processedDir, { recursive: true });
        }
        
        const processedFile = path.join(processedDir, `processed_${path.basename(file)}`);
        fs.renameSync(file, processedFile);
        
        console.log(`Moved to processed directory: ${path.basename(file)}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Error processing email file ${path.basename(file)}:`, error.message);
        
        // Mark the file as failed
        try {
          const failedDir = path.join(emailQueueDir, 'failed');
          if (!fs.existsSync(failedDir)) {
            fs.mkdirSync(failedDir, { recursive: true });
          }
          
          const failedFile = path.join(failedDir, `failed_${path.basename(file)}`);
          fs.renameSync(file, failedFile);
          console.log(`Marked as failed: ${path.basename(file)}`);
        } catch (moveError) {
          console.error(`Could not move failed file: ${moveError.message}`);
        }
        
        failCount++;
      }
    }
    
    console.log('\nQueue Processing Summary:');
    console.log(`Total emails: ${files.length}`);
    console.log(`Successfully sent: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
    if (failCount > 0) {
      console.log('\nCheck the email_queue/failed directory for failed emails');
    }
    
    return { processed: files.length, successful: successCount, failed: failCount };
  } catch (error) {
    console.error('Error processing email queue:', error.message);
    return { processed: 0, successful: 0, failed: 0, error: error.message };
  }
};

// Run the processor when called directly
if (require.main === module) {
  (async () => {
    await processEmailQueue();
  })();
}

// Export the function for importing
module.exports = processEmailQueue; 
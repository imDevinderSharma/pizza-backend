/**
 * Generate VAPID keys for Web Push Notifications
 * Run with: npm run generate-vapid
 * Then add the generated keys to your .env file
 */

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

console.log('Generating VAPID keys for Web Push Notifications...');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('\nVAPID Keys generated successfully!');
console.log('\nPublic Key:');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key:');
console.log(vapidKeys.privateKey);

// Create a .env.vapid file with the keys
const envFilePath = path.join(__dirname, '../.env.vapid');
const envContent = `# VAPID Keys for Web Push Notifications
# Add these to your .env file
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
`;

fs.writeFileSync(envFilePath, envContent);

console.log(`\nKeys saved to ${envFilePath}`);
console.log('\nAdd these keys to your .env file:');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`); 
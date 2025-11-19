#!/usr/bin/env node

/**
 * VAPID key generation script
 * Run this script to generate VAPID keys for Web Push notifications
 * Usage: node scripts/generate-vapid-keys.js
 */

const webpush = require('web-push');

console.log('Generating VAPID keys for Web Push notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID Keys generated successfully!\n');
console.log('Add these to your .env.local file:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('\nIMPORTANT: Keep the private key secret!');

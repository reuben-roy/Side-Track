/**
 * Generate Apple OAuth JWT Secret for Supabase
 * 
 * You need:
 * 1. Your .p8 private key file
 * 2. Key ID (from the filename, e.g., M769K934RF)
 * 3. Team ID (from Apple Developer Membership page)
 * 4. Client ID (Service ID you created, e.g., fun.explosion.sidetrack.web)
 */

// Run 'node scripts/generate-apple-secret.mjs' to create the JWT secret
// Make sure to rotate keys evey 6 months as Apple requires
// UPDATE THE VALUES BELOW BEFORE RUNNING

import fs from 'fs';
import * as jose from 'jose';

async function generateAppleSecret() {
  // UPDATE THESE VALUES:
  const keyId = '7LGL5Y8UB8'; // From your filename
  const teamId = '5L6RA824YS';
  const clientId = 'fun.explosion.sidetrack.web'; // Your Service ID
  
  // Path to your .p8 file
  const privateKeyPath = '/Users/reuben.secondary/Downloads/AuthKey_7LGL5Y8UB8.p8';
  
  try {
    // Read the private key
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    
    // Import the key
    const key = await jose.importPKCS8(privateKey, 'ES256');
    
    // Create the JWT
    const jwt = await new jose.SignJWT({})
      .setProtectedHeader({
        alg: 'ES256',
        kid: keyId,
      })
      .setIssuer(teamId)
      .setIssuedAt()
      .setExpirationTime('180d') // 6 months (max allowed by Apple)
      .setAudience('https://appleid.apple.com')
      .setSubject(clientId)
      .sign(key);
    
    console.log('\n✅ Your Apple OAuth Client Secret (JWT):');
    console.log('\n' + jwt);
    console.log('\n📋 Copy this and paste it into Supabase "Secret Key (for OAuth)" field');
    console.log('\n⚠️  This secret expires in 6 months. You\'ll need to regenerate it then.');
    
  } catch (error) {
    console.error('❌ Error generating secret:', error.message);
  }
}

generateAppleSecret();

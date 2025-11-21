/**
 * Generate Apple OAuth JWT Secret for Supabase
 * 
 * You need:
 * 1. Your .p8 private key file
 * 2. Key ID (from the filename, e.g., M769K934RF)
 * 3. Team ID (from Apple Developer Membership page)
 * 4. Client ID (Service ID you created, e.g., fun.explosion.sidetrack.web)
 */

import fs from 'fs';
import * as jose from 'jose';

async function generateAppleSecret() {
  // UPDATE THESE VALUES:
  const keyId = 'M769K934RF'; // From your filename
  const teamId = '5L6RA824YS';
  const clientId = 'fun.explosion.sidetrack.web'; // Your Service ID
  
  // Path to your .p8 file
  const privateKeyPath = '/Users/reuben.secondary/Library/Group Containers/group.com.apple.notes/Accounts/1DAF7921-F4A0-4360-B61B-C69C4A9694BD/Media/14F5BB54-AEE7-431B-B051-3F9F2D256A4B/1_94734E8F-A5AC-49A5-B2AF-3663F8D0BCFB/AuthKey_M769K934RF.p8';
  
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

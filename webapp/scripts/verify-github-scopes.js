const { Client } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.error("Invalid ENCRYPTION_KEY");
  process.exit(1);
}

const ALGORITHM = 'aes-256-gcm';

function decrypt(hash) {
  if (!hash) return hash;
  
  const parts = hash.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encryption payload format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const authTag = Buffer.from(parts[2], 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

async function verifyScope() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    const res = await client.query('SELECT id, email, github_access_token FROM users WHERE email = $1', ['singhgurnoor283@gmail.com']);
    if (res.rows.length === 0) {
      console.error("User not found");
      return;
    }
    
    const tokenStr = res.rows[0].github_access_token;
    if (!tokenStr) {
      console.error("No github token found for user");
      return;
    }
    
    const token = decrypt(tokenStr);
    
    console.log("Token decrypted successfully. Verifying with GitHub...");
    
    const ghRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    console.log("GitHub API Status:", ghRes.status);
    console.log("X-OAuth-Scopes:", ghRes.headers.get('x-oauth-scopes'));
    console.log("X-Accepted-OAuth-Scopes:", ghRes.headers.get('x-accepted-oauth-scopes'));
    
  } finally {
    await client.end();
  }
}

verifyScope().catch(console.error);

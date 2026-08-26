const crypto = require('crypto');
const env = require('../config/env'); // Has the validated 32-byte ENCRYPTION_KEY Buffer

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Encrypts a string using AES-256-GCM
 * @param {string} text - The text to encrypt (e.g., GitHub access token)
 * @returns {string} - The encrypted string format: iv:encrypted_data:auth_tag (all hex)
 */
function encrypt(text) {
  if (!text) return text;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, env.ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

/**
 * Decrypts a string that was encrypted by the encrypt function
 * @param {string} hash - The encrypted string format: iv:encrypted_data:auth_tag
 * @returns {string} - The decrypted text
 */
function decrypt(hash) {
  if (!hash) return hash;
  
  const parts = hash.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encryption payload format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const authTag = Buffer.from(parts[2], 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, env.ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

module.exports = {
  encrypt,
  decrypt,
};

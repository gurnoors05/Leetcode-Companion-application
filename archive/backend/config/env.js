require('dotenv').config();

// Helper to check if a string is a valid hex
const isHex = (str) => /^[0-9a-fA-F]+$/.test(str);
const isBase64 = (str) =>
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(str);

const validateEnv = () => {
  const required = [
    'DATABASE_URL',
    'ENCRYPTION_KEY',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'FRONTEND_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Strictly validate ENCRYPTION_KEY is exactly 32 bytes
  const key = process.env.ENCRYPTION_KEY;
  let decodedKey;

  if (isHex(key) && key.length === 64) {
    decodedKey = Buffer.from(key, 'hex');
  } else if (isBase64(key)) {
    decodedKey = Buffer.from(key, 'base64');
  } else {
    // Attempt fallback (maybe raw string, but we want hex/base64 typically)
    decodedKey = Buffer.from(key, 'utf8');
  }

  if (Buffer.byteLength(decodedKey) !== 32) {
    console.error(
      `FATAL: ENCRYPTION_KEY must be exactly 32 bytes when decoded. Currently it is ${Buffer.byteLength(decodedKey)} bytes. Check your .env file.`
    );
    process.exit(1);
  }

  // Export validated env to be safe
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT || 5000,
    ENCRYPTION_KEY: decodedKey, // Expose the 32-byte Buffer directly for crypto
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_CALLBACK_URL:
      process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/auth/github/callback',
    FRONTEND_URL: process.env.FRONTEND_URL,
  };
};

module.exports = validateEnv();

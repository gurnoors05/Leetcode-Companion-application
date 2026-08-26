export function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.ENCRYPTION_KEY;
  if (!keyBase64) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  // Assuming it's base64 based on the original env.js validation, or hex.
  // The original backend used hex or base64. Let's decode based on length or just base64.
  // If we decode hex and length is 32 bytes, great. If base64, also great. 
  // Let's assume hex since 32 bytes in hex is 64 chars.
  let keyBuf: Buffer;
  if (keyBase64.length === 64) {
    keyBuf = Buffer.from(keyBase64, 'hex');
  } else {
    keyBuf = Buffer.from(keyBase64, 'base64');
  }

  if (keyBuf.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes when decoded. Current length: ' + keyBuf.length);
  }

  return keyBuf;
}

export function getJwtAccessSecret(): string {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET is required');
  }
  return process.env.JWT_ACCESS_SECRET;
}

export function getJwtRefreshSecret(): string {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is required');
  }
  return process.env.JWT_REFRESH_SECRET;
}

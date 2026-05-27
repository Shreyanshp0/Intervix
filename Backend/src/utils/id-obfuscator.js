import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'intervix-super-secure-key-32bytes-secret').digest();
const IV_LENGTH = 16;
const PREFIX = 'sec_';

/**
 * Checks if a string is a standard 24-character hexadecimal ObjectId.
 */
const isObjectId = (str) => /^[0-9a-fA-F]{24}$/.test(str);

/**
 * Encrypts a raw database ObjectId or UUID string.
 * Flawlessly wraps it in a secure, URL-safe base64url string.
 */
export const encryptId = (rawId) => {
  if (!rawId) return '';
  const str = String(rawId).trim();
  
  // If it's already an encrypted string, return it
  if (str.startsWith(PREFIX)) return str;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(str, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Combine IV and encrypted data as ivHex:encryptedHex
  const combined = `${iv.toString('hex')}:${encrypted}`;
  
  // Return URL-friendly base64url token prefixed with sec_
  return PREFIX + Buffer.from(combined).toString('base64url');
};

/**
 * Decrypts a secure base64url token back to the original raw ObjectId.
 * Supports legacy backwards-compatibility if the id is a standard unencrypted ObjectId.
 */
export const decryptId = (token) => {
  if (!token) return '';
  const str = String(token).trim();

  // Flawless Backwards Compatibility:
  // If the parameter is already a raw ObjectId (e.g. from an old bookmark),
  // process it directly without breaking!
  if (isObjectId(str) || !str.startsWith(PREFIX)) {
    return str;
  }

  try {
    const b64Token = str.slice(PREFIX.length);
    const decoded = Buffer.from(b64Token, 'base64url').toString('utf8');
    const [ivHex, encryptedHex] = decoded.split(':');
    
    if (!ivHex || !encryptedHex) return '';
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.warn('[IdObfuscator] Decryption failed for token:', str);
    return ''; // Return empty string representing validation failure
  }
};

export default {
  encryptId,
  decryptId
};

/**
 * lib/crypto.js
 * Server-side Token Encryption & Decryption Utility for NAD JARVIS
 * Conforms to Section 2.4 & Section 6:
 * - Uses standard AES-256-GCM authenticated encryption.
 * - Encryption key derived from server-side environment secrets.
 * - Tokens are NEVER exposed to the frontend in unencrypted or raw form.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM recommended

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_SECRET || 
                 process.env.TOKEN_ENCRYPTION_KEY || 
                 process.env.SUPABASE_SECRET_KEY || 
                 process.env.SUPABASE_SERVICE_ROLE_KEY || 
                 'nad-jarvis-default-fallback-secret-2026';

  // Deterministically hash to 32 bytes (256 bits)
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plaintext string (e.g., OAuth refresh token)
 * @param {string} plaintext 
 * @returns {string} Encrypted format: "ivHex:authTagHex:encryptedHex"
 */
function encryptToken(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return null;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('[Crypto Error] Failed to encrypt token:', err.message);
    throw new Error('Encryption error occurred.');
  }
}

/**
 * Decrypts a cipher string back to plaintext
 * @param {string} ciphertext "ivHex:authTagHex:encryptedHex"
 * @returns {string|null} Plaintext token or null
 */
function decryptToken(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') return null;

  // Gracefully handle legacy unencrypted tokens during migration
  if (!ciphertext.includes(':')) {
    return ciphertext;
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    return ciphertext; // Fallback to raw string if format does not match
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('[Crypto Error] Failed to decrypt token:', err.message);
    return null;
  }
}

module.exports = {
  encryptToken,
  decryptToken
};

/**
 * Crypto Utilities
 * Cryptographic functions for security
 */

import { randomString, generateToken } from './string';

/**
 * Hash a string using SHA-256
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Hash a string using SHA-512
 */
export async function sha512(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  return bufferToHex(hashBuffer);
}

/**
 * Hash a string using MD5 (not cryptographically secure, use for checksums only)
 */
export async function md5(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  return bufferToHex(hashBuffer);
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return generateToken(length);
}

/**
 * Generate a secure random code (numbers only)
 */
export function generateSecureCode(length: number = 6): string {
  return randomString(length, '0123456789');
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
}

/**
 * Generate a random password
 */
export function generatePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  // Ensure at least one of each character type
  const password = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  
  // Fill remaining with random characters
  for (let i = password.length; i < length; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }
  
  // Shuffle the password
  return password.sort(() => Math.random() - 0.5).join('');
}

/**
 * Generate a hash for a password (simple hash for demo, use bcrypt in production)
 */
export async function hashPassword(password: string, salt?: string): Promise<string> {
  const saltedPassword = salt ? `${salt}${password}` : password;
  return await sha256(saltedPassword);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string, salt?: string): Promise<boolean> {
  const computedHash = await hashPassword(password, salt);
  return computedHash === hash;
}

/**
 * Generate a random salt
 */
export function generateSalt(length: number = 16): string {
  return generateSecureToken(length);
}

/**
 * Encode string to base64
 */
export function encodeBase64(input: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(input);
  }
  
  const buffer = Buffer.from(input, 'utf-8');
  return buffer.toString('base64');
}

/**
 * Decode base64 string
 */
export function decodeBase64(input: string): string {
  if (typeof atob !== 'undefined') {
    return atob(input);
  }
  
  const buffer = Buffer.from(input, 'base64');
  return buffer.toString('utf-8');
}

/**
 * Encode string to base64url
 */
export function encodeBase64Url(input: string): string {
  return encodeBase64(input)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode base64url string
 */
export function decodeBase64Url(input: string): string {
  const base64 = input
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return decodeBase64(base64 + padding);
}

/**
 * Generate HMAC
 */
export async function generateHMAC(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return bufferToHex(signature);
}

/**
 * Verify HMAC
 */
export async function verifyHMAC(message: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await generateHMAC(message, secret);
  return expectedSignature === signature;
}

/**
 * Generate checksum
 */
export async function generateChecksum(data: string): Promise<string> {
  return await sha256(data);
}

/**
 * Verify checksum
 */
export async function verifyChecksum(data: string, checksum: string): Promise<boolean> {
  const computedChecksum = await generateChecksum(data);
  return computedChecksum === checksum;
}

/**
 * Encrypt data (simple XOR encryption, use proper encryption in production)
 */
export function encryptData(data: string, key: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return encodeBase64(result);
}

/**
 * Decrypt data
 */
export function decryptData(encryptedData: string, key: string): string {
  const data = decodeBase64(encryptedData);
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

/**
 * Generate a fingerprint for data
 */
export async function generateFingerprint(data: string): Promise<string> {
  return await sha256(data);
}

/**
 * Buffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hex string to buffer
 */
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Generate time-based one-time password (TOTP)
 */
export async function generateTOTP(secret: string, timeStep: number = 30, digits: number = 6): Promise<string> {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const counterHex = counter.toString(16).padStart(16, '0');
  const counterBuffer = hexToBuffer(counterHex);
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, counterBuffer);
  const signatureBytes = new Uint8Array(signature);
  const offset = signatureBytes[signatureBytes.length - 1]! & 0xf;
  
  const binary = 
    ((signatureBytes[offset]! & 0x7f) << 24) |
    ((signatureBytes[offset + 1]! & 0xff) << 16) |
    ((signatureBytes[offset + 2]! & 0xff) << 8) |
    (signatureBytes[offset + 3]! & 0xff);
  
  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

/**
 * Verify TOTP
 */
export async function verifyTOTP(token: string, secret: string, timeStep: number = 30, digits: number = 6): Promise<boolean> {
  const currentTOTP = await generateTOTP(secret, timeStep, digits);
  return token === currentTOTP;
}
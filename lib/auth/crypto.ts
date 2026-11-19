import crypto from 'node:crypto';

/**
 * Generates a cryptographically strong numeric OTP (default 6 digits).
 */
export function generateNumericOtp(digits = 6): string {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits;
  return String(crypto.randomInt(min, max));
}

/**
 * Generates a cryptographically strong URL-safe opaque token.
 */
export function generateOpaqueToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Generates a per-challenge random salt.
 */
export function generateSalt(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hashes an OTP code using HMAC-SHA256 keyed by per-challenge salt.
 * Never store plaintext OTPs in the database.
 */
export function hashOtpCode(otp: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(otp.trim()).digest('hex');
}

/**
 * Constant-time verification of an OTP code against its stored salted hash.
 */
export function verifyOtpHash(otp: string, salt: string, expectedHash: string): boolean {
  const actualHash = hashOtpCode(otp, salt);
  const a = Buffer.from(actualHash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * SHA-256 hex digest for high-entropy tokens (invitation tokens & OTP verification proof tokens).
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Strict double-gate guard for surfacing development OTPs.
 * Development OTP MUST NEVER be returned unless BOTH:
 *   1. NODE_ENV === 'development'
 *   2. AUTH_OTP_MODE === 'development'
 */
export function isDevelopmentOtpModeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'development' && env.AUTH_OTP_MODE === 'development';
}

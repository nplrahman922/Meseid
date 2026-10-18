import crypto from "node:crypto";
import { env } from "../config/env";

const IV_LENGTH = 12; // 96-bit IV for AES-256-GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Derives a strict 32-byte Buffer key from the environment ENCRYPTION_KEY.
 * Supports 64-hex string, 44-char base64 string, or arbitrary length strings (via SHA-256).
 */
export function getEncryptionKey(overrideKey?: string): Buffer {
  const keyStr = overrideKey || env.ENCRYPTION_KEY;
  if (/^[0-9a-fA-F]{64}$/.test(keyStr)) {
    return Buffer.from(keyStr, "hex");
  }
  if (/^[A-Za-z0-9+/=]{44}$/.test(keyStr)) {
    return Buffer.from(keyStr, "base64");
  }
  if (Buffer.byteLength(keyStr, "utf8") === 32) {
    return Buffer.from(keyStr, "utf8");
  }
  return crypto.createHash("sha256").update(keyStr).digest();
}

/**
 * Encrypts a string or Buffer using AES-256-GCM.
 * Packs format: [12-byte IV][16-byte AuthTag][Ciphertext]
 * Returns a Uint8Array suitable for PostgreSQL bytea columns.
 */
export function encryptBytes(
  plaintext: string | Buffer | Uint8Array,
  overrideKey?: string
): Uint8Array {
  const key = getEncryptionKey(overrideKey);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const inputBuffer =
    typeof plaintext === "string"
      ? Buffer.from(plaintext, "utf8")
      : Buffer.from(plaintext);

  const ciphertext = Buffer.concat([cipher.update(inputBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const packed = Buffer.concat([iv, authTag, ciphertext]);
  return new Uint8Array(packed);
}

/**
 * Decrypts a binary packed buffer [12-byte IV][16-byte AuthTag][Ciphertext] using AES-256-GCM.
 * Throws an error if the authentication tag fails or data is tampered.
 */
export function decryptBytes(
  cipherBuffer: Uint8Array | Buffer,
  overrideKey?: string
): string {
  const buf = Buffer.isBuffer(cipherBuffer) ? cipherBuffer : Buffer.from(cipherBuffer);

  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid ciphertext: buffer too short for AES-256-GCM");
  }

  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const key = getEncryptionKey(overrideKey);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Hashes a one-time verification OTP code using SHA-256.
 * Used for channel_link_codes.code_hash (SRS FR-31).
 */
export function hashOtpCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

/**
 * Generates an HMAC-SHA256 signature for a payload.
 */
export function signHmac(payload: string | Buffer, secret?: string): string {
  const sec = secret || env.SESSION_SECRET;
  return crypto.createHmac("sha256", sec).update(payload).digest("hex");
}

/**
 * Verifies an HMAC-SHA256 signature using timing-safe comparison.
 */
export function verifyHmacSignature(
  payload: string | Buffer,
  signature: string,
  secret?: string
): boolean {
  try {
    const expected = signHmac(payload, secret);
    const expectedBuf = Buffer.from(expected, "hex");
    const signatureBuf = Buffer.from(signature, "hex");

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

/**
 * Generates a signed OAuth state token to prevent CSRF.
 */
export function createOAuthState(payload: Record<string, any> = {}): string {
  const data = JSON.stringify({
    ...payload,
    nonce: crypto.randomBytes(16).toString("hex"),
    iat: Date.now(),
  });
  const dataB64 = Buffer.from(data, "utf8").toString("base64url");
  const sig = signHmac(dataB64);
  return `${dataB64}.${sig}`;
}

/**
 * Verifies and parses a signed OAuth state token.
 */
export function verifyOAuthState<T = Record<string, any>>(
  state: string,
  maxAgeMs: number = 10 * 60 * 1000
): T | null {
  try {
    const parts = state.split(".");
    if (parts.length !== 2) return null;

    const [dataB64, sig] = parts;
    if (!verifyHmacSignature(dataB64, sig)) {
      return null;
    }

    const jsonStr = Buffer.from(dataB64, "base64url").toString("utf8");
    const parsed = JSON.parse(jsonStr);

    if (typeof parsed.iat === "number" && Date.now() - parsed.iat > maxAgeMs) {
      return null; // Expired state
    }

    return parsed as T;
  } catch {
    return null;
  }
}

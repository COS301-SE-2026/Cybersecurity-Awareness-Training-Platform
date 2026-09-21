import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { env } from '../config/env.js';

const DEFAULT_TOKEN_BYTES = 32;
const TOKEN_CIPHERTEXT_VERSION = 'v1';
const TOKEN_CIPHER_NONCE_BYTES = 12;
const TOKEN_CIPHER_TAG_BYTES = 16;
const TOKEN_CIPHER_AAD = Buffer.from('managed-portal-token:v1', 'utf8');
const TOKEN_CIPHER_SALT = Buffer.from('insightful-phish:managed-portal', 'utf8');
const TOKEN_CIPHER_INFO = Buffer.from('opaque-token-encryption:v1', 'utf8');

export class OpaqueTokenCiphertextError extends Error {
  constructor() {
    super('Opaque token ciphertext is invalid.');
    this.name = 'OpaqueTokenCiphertextError';
  }
}

function getTokenEncryptionKey(): Buffer {
  return Buffer.from(
    hkdfSync(
      'sha256',
      Buffer.from(env.AUTH_TOKEN_SECRET, 'utf8'),
      TOKEN_CIPHER_SALT,
      TOKEN_CIPHER_INFO,
      32,
    ),
  );
}

function decodeCanonicalBase64Url(value: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new OpaqueTokenCiphertextError();
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.toString('base64url') !== value) throw new OpaqueTokenCiphertextError();
  return decoded;
}

//An Opaque token does not store any information
export function generateOpaqueToken(byteLength = DEFAULT_TOKEN_BYTES): string {
  if (!Number.isInteger(byteLength) || byteLength < 32) {
    throw new RangeError('Opaque tokens must use at least 32 bytes');
  }

  return randomBytes(byteLength).toString('base64url');
}

export function hashOpaqueToken(token: string): string {
  if (!token) {
    throw new TypeError('Token is required');
  }

  return createHmac('sha256', env.AUTH_TOKEN_SECRET).update(token).digest('base64url');
}

export function sealOpaqueToken(token: string): string {
  if (!token) throw new TypeError('Token is required');

  const nonce = randomBytes(TOKEN_CIPHER_NONCE_BYTES);
  const cipher = createCipheriv('aes-256-gcm', getTokenEncryptionKey(), nonce);
  cipher.setAAD(TOKEN_CIPHER_AAD);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    TOKEN_CIPHERTEXT_VERSION,
    nonce.toString('base64url'),
    ciphertext.toString('base64url'),
    tag.toString('base64url'),
  ].join('.');
}

export function unsealOpaqueToken(value: string): string {
  try {
    const [version, encodedNonce, encodedCiphertext, encodedTag, extra] = value.split('.');
    if (
      version !== TOKEN_CIPHERTEXT_VERSION ||
      !encodedNonce ||
      !encodedCiphertext ||
      !encodedTag ||
      extra !== undefined
    ) {
      throw new OpaqueTokenCiphertextError();
    }

    const nonce = decodeCanonicalBase64Url(encodedNonce);
    const ciphertext = decodeCanonicalBase64Url(encodedCiphertext);
    const tag = decodeCanonicalBase64Url(encodedTag);
    if (nonce.length !== TOKEN_CIPHER_NONCE_BYTES || tag.length !== TOKEN_CIPHER_TAG_BYTES) {
      throw new OpaqueTokenCiphertextError();
    }

    const decipher = createDecipheriv('aes-256-gcm', getTokenEncryptionKey(), nonce);
    decipher.setAAD(TOKEN_CIPHER_AAD);
    decipher.setAuthTag(tag);
    const token = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    if (!token) throw new OpaqueTokenCiphertextError();
    return token;
  } catch (error) {
    if (error instanceof OpaqueTokenCiphertextError) throw error;
    throw new OpaqueTokenCiphertextError();
  }
}

export function opaqueTokenMatches(token: string, expectedHash: string): boolean {
  if (!token || !expectedHash) {
    return false;
  }

  const actualHash = hashOpaqueToken(token);
  const actual = Buffer.from(actualHash, 'utf8');
  const expected = Buffer.from(expectedHash, 'utf8');

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

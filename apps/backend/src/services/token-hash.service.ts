import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

const DEFAULT_TOKEN_BYTES = 32;

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

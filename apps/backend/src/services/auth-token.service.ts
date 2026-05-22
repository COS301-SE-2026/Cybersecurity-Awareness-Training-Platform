import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

interface AuthTokenPayload {
  userId: string;
  expiresAt: string;
}

export interface AuthTokenResult {
  token: string;
  expiresAt: string;
}

function encodeBase64Url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function decodeBase64Url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signToken(payload: string) {
  return createHmac('sha256', env.AUTH_TOKEN_SECRET).update(payload).digest('base64url');
}

export function generateAuthToken(userId: string): AuthTokenResult {
  const expiresAt = new Date(Date.now() + env.AUTH_TOKEN_EXPIRES_IN_SECONDS * 1000).toISOString();
  const payload = encodeBase64Url(JSON.stringify({ userId, expiresAt } satisfies AuthTokenPayload));
  const signature = signToken(payload);
  const token = `${payload}.${signature}`;

  return { token, expiresAt };
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const [payload, signature] = token.split('.');

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signToken(payload);
  const actualSignature = Buffer.from(signature, 'utf8');
  const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8');

  if (actualSignature.length !== expectedSignatureBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(actualSignature, expectedSignatureBuffer)) {
    return null;
  }

  try {
    const decodedPayload = JSON.parse(decodeBase64Url(payload)) as Partial<AuthTokenPayload>;

    if (!decodedPayload.userId || !decodedPayload.expiresAt) {
      return null;
    }

    if (new Date(decodedPayload.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return {
      userId: decodedPayload.userId,
      expiresAt: decodedPayload.expiresAt,
    };
  } catch {
    return null;
  }
}

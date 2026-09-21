import { describe, expect, it } from 'vitest';
import {
  generateOpaqueToken,
  hashOpaqueToken,
  OpaqueTokenCiphertextError,
  opaqueTokenMatches,
  sealOpaqueToken,
  unsealOpaqueToken,
} from '../../src/services/token-hash.service.js';

describe('token hash service', () => {
  it('generates URL-safe opaque random tokens', () => {
    const token = generateOpaqueToken();

    expect(token).toEqual(expect.any(String));
    expect(token.length).toBeGreaterThan(42);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates different token values', () => {
    const first = generateOpaqueToken();
    const second = generateOpaqueToken();
    expect(first).not.toBe(second);
  });

  it('rejects token byte lengths below the minimum', () => {
    expect(() => generateOpaqueToken(31)).toThrow('Opaque tokens must use at least 32 bytes');
  });

  it('hashes the same token deterministically', () => {
    const token = 'rawrefreshtoken';
    expect(hashOpaqueToken(token)).toBe(hashOpaqueToken(token));
  });

  it('does not return the raw token as the hash', () => {
    const token = 'rawrefreshtoken';
    expect(hashOpaqueToken(token)).not.toBe(token);
  });

  it('creates different hashes for different tokens', () => {
    expect(hashOpaqueToken('furst')).not.toBe(hashOpaqueToken('second'));
  });

  it('matches a token against its stored hash', () => {
    const token = generateOpaqueToken();
    const hash = hashOpaqueToken(token);

    expect(opaqueTokenMatches(token, hash)).toBe(true);
  });

  it('rejects mismatched missing and malformed token hashes', () => {
    const token = generateOpaqueToken();
    const hash = hashOpaqueToken(token);

    expect(opaqueTokenMatches('other', hash)).toBe(false);
    expect(opaqueTokenMatches('', hash)).toBe(false);
    expect(opaqueTokenMatches(token, '')).toBe(false);
    expect(opaqueTokenMatches(token, 'short')).toBe(false);
  });

  it('requires a token before hashing', () => {
    expect(() => hashOpaqueToken('')).toThrow('Token is required');
  });

  it('seals and recovers an opaque token without exposing plaintext', () => {
    const token = generateOpaqueToken();
    const ciphertext = sealOpaqueToken(token);

    expect(ciphertext).not.toContain(token);
    expect(unsealOpaqueToken(ciphertext)).toBe(token);
  });

  it('uses a fresh authenticated-encryption nonce for each sealed value', () => {
    const token = generateOpaqueToken();
    const first = sealOpaqueToken(token);
    const second = sealOpaqueToken(token);

    expect(first).not.toBe(second);
    expect(unsealOpaqueToken(first)).toBe(token);
    expect(unsealOpaqueToken(second)).toBe(token);
  });

  it.each(['', 'v1.invalid', 'v2.a.b.c', 'v1.AA.AA.AA', 'v1.AAAAAAAAAAAAAAAA.AA.AA'])(
    'rejects malformed or unauthenticated ciphertext %s',
    (ciphertext) => {
      expect(() => unsealOpaqueToken(ciphertext)).toThrow(OpaqueTokenCiphertextError);
    },
  );

  it('rejects modified ciphertext', () => {
    const ciphertext = sealOpaqueToken(generateOpaqueToken());
    const finalCharacter = ciphertext.endsWith('A') ? 'B' : 'A';
    const modified = `${ciphertext.slice(0, -1)}${finalCharacter}`;

    expect(() => unsealOpaqueToken(modified)).toThrow(OpaqueTokenCiphertextError);
  });
});

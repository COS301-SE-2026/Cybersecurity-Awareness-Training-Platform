import { describe, expect, it } from 'vitest';
import {
  generateOpaqueToken,
  hashOpaqueToken,
  opaqueTokenMatches,
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
});

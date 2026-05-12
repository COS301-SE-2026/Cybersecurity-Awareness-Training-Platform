import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/services/password.service.js';

describe('password.service', () => {
  it('hashes passwords without storing it as plain text', async () => {
    const password = 'mySecurePassword123!';
    const hash = await hashPassword(password);

    expect(typeof hash).toBe('string');
    expect(hash).not.toBe(password);
    expect(hash.split('$').length).toBe(6); // Ensure hash format is correct

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
    expect(hash).not.toContain(password); // Ensure password is not part of the hash
    expect(hash).toMatch(/^scrypt\$/); // Ensure hash starts with the correct algorithm identifier
  });

  it('verifies correct passwords and rejects incorrect ones', async () => {
    const password = 'anotherSecurePassword!@#';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('wrongPassword', hash);
    expect(isInvalid).toBe(false);
  });

  it('returns false for malformed hashes', async () => {
    const malformedHash = 'notAValidHash';
    const result = await verifyPassword('anyPassword', malformedHash);
    expect(result).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  assertDemoSeedIdsAreUuids,
  buildAnswerOptionSeed,
  demoPosition,
  demoSeedDate,
  hashDemoPassword,
  isDemoUuid,
  normaliseDemoEmail,
} from '../../prisma/seed-data/demoSeedHelpers.js';
import { verifyPassword } from '../../src/services/password.service.js';

describe('demo seed helpers', () => {
  it('creates stable UTC dates and rejects invalid values', () => {
    expect(demoSeedDate('2026-05-17T00:00:00.000Z').toISOString()).toBe('2026-05-17T00:00:00.000Z');
    expect(() => demoSeedDate('not-a-date')).toThrow('Invalid demo seed date');
  });

  it('normalises demo email casing and spacing', () => {
    expect(normaliseDemoEmail(' Demo.User@Example.COM ')).toBe('demo.user@example.com');
  });

  it('creates deterministic position values', () => {
    expect(demoPosition(0)).toBe(100);
    expect(demoPosition(2, 10)).toBe(30);
    expect(() => demoPosition(-1)).toThrow('non-negative integer');
    expect(() => demoPosition(0, 0)).toThrow('positive integer');
  });

  it('validates UUID-like seed IDs', () => {
    expect(isDemoUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isDemoUuid('not-a-uuid')).toBe(false);
    expect(() =>
      assertDemoSeedIdsAreUuids({
        valid: '11111111-1111-4111-8111-111111111111',
        invalid: 'not-a-uuid',
      }),
    ).toThrow('invalid');
  });

  it('builds answer options with deterministic positions', () => {
    expect(
      buildAnswerOptionSeed(
        {
          id: '11111111-1111-4111-8111-111111111111',
          label: 'A',
          text: 'Check the sender domain.',
          isCorrect: true,
        },
        1,
      ),
    ).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      label: 'A',
      text: 'Check the sender domain.',
      isCorrect: true,
      position: 200,
    });
  });

  it('hashes demo passwords with the project password helper', async () => {
    const password = 'DemoPassword123!';
    const hash = await hashDemoPassword(password);

    expect(hash).not.toBe(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });
});

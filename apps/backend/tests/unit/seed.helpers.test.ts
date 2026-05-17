import { afterEach, describe, expect, it } from 'vitest';
import {
  assertDemoSeedIdsAreUuids,
  buildAnswerOptionSeed,
  DEMO_SEED_AUTH_VALUE_ENV_VAR,
  demoPosition,
  demoSeedDate,
  getDemoSeedAuthValue,
  hashDemoPassword,
  isDemoUuid,
  normaliseDemoEmail,
} from '../../prisma/seed-data/demoSeedHelpers.js';
import {
  DEMO_SEED_QUIZZES,
  DEMO_SEED_SIMULATED_EMAILS,
} from '../../prisma/seed-data/demoSeedConfig.js';
import { EmailClassification } from '../../src/generated/prisma/enums.js';
import { verifyPassword } from '../../src/services/password.service.js';

describe('demo seed helpers', () => {
  const originalDemoSeedAuthValue = process.env[DEMO_SEED_AUTH_VALUE_ENV_VAR];

  afterEach(() => {
    if (originalDemoSeedAuthValue === undefined) {
      delete process.env[DEMO_SEED_AUTH_VALUE_ENV_VAR];
      return;
    }

    process.env[DEMO_SEED_AUTH_VALUE_ENV_VAR] = originalDemoSeedAuthValue;
  });

  it('reads the demo auth value from the environment', () => {
    process.env[DEMO_SEED_AUTH_VALUE_ENV_VAR] = ' local-demo-auth-value ';

    expect(getDemoSeedAuthValue()).toBe('local-demo-auth-value');
  });

  it('fails clearly when the demo auth value is missing', () => {
    delete process.env[DEMO_SEED_AUTH_VALUE_ENV_VAR];

    expect(() => getDemoSeedAuthValue()).toThrow(DEMO_SEED_AUTH_VALUE_ENV_VAR);
  });

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

  it('hashes demo auth values with the project hashing helper', async () => {
    const authValue = ['Demo', 'Auth', '123!'].join('');
    const hash = await hashDemoPassword(authValue);

    expect(hash).not.toBe(authValue);
    expect(await verifyPassword(authValue, hash)).toBe(true);
  });

  it('defines at least two quizzes with at least five questions each', () => {
    expect(DEMO_SEED_QUIZZES.length).toBeGreaterThanOrEqual(2);

    for (const quiz of DEMO_SEED_QUIZZES) {
      expect(quiz.questions.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('defines exactly one correct answer option for each quiz question', () => {
    for (const quiz of DEMO_SEED_QUIZZES) {
      for (const question of quiz.questions) {
        expect(question.answerOptions.filter((option) => option.isCorrect)).toHaveLength(1);
        expect(question.answerOptions.every((option) => option.feedbackText)).toBe(true);
      }
    }
  });

  it('defines simulated emails with safe and unsafe classifications', () => {
    expect(
      DEMO_SEED_SIMULATED_EMAILS.some(
        (email) => email.expectedClassification === EmailClassification.PHISHING,
      ),
    ).toBe(true);
    expect(
      DEMO_SEED_SIMULATED_EMAILS.some(
        (email) => email.expectedClassification === EmailClassification.SUSPICIOUS,
      ),
    ).toBe(true);
    expect(
      DEMO_SEED_SIMULATED_EMAILS.filter(
        (email) => email.expectedClassification === EmailClassification.SAFE,
      ).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('defines red flags for phishing and suspicious simulated emails only', () => {
    for (const email of DEMO_SEED_SIMULATED_EMAILS) {
      if (email.expectedClassification === EmailClassification.SAFE) {
        expect(email.redFlags).toHaveLength(0);
      } else {
        expect(email.redFlags.length).toBeGreaterThan(0);
      }
    }
  });
});

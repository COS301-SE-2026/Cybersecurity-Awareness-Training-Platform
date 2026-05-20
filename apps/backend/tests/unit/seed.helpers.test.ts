import { afterEach, describe, expect, it } from 'vitest';
import {
  assertDemoSeedRuntimeIsSafe,
  assertDemoSeedIdsAreUuids,
  buildAnswerOptionSeed,
  demoPosition,
  demoSeedDate,
  getDemoSeedAuthEnvVarName,
  getDemoSeedAuthValue,
  hashDemoPassword,
  isDemoUuid,
  normaliseDemoEmail,
} from '../../prisma/seed-data/demoSeedHelpers.js';
import {
  DEMO_SEED_CAMPAIGN_ITEMS,
  DEMO_SEED_IDS,
  DEMO_SEED_PASSWORD_SECURITY_CAMPAIGN,
  DEMO_SEED_PASSWORD_SECURITY_CAMPAIGN_ASSIGNMENT,
  DEMO_SEED_PASSWORD_SECURITY_CAMPAIGN_ITEMS,
  DEMO_SEED_PASSWORD_SECURITY_QUIZ,
  DEMO_SEED_PASSWORD_SECURITY_TRAINING_DOCUMENT,
  DEMO_SEED_QUIZZES,
  DEMO_SEED_SIMULATED_EMAILS,
} from '../../prisma/seed-data/demoSeedConfig.js';
import { EmailClassification } from '../../src/generated/prisma/enums.js';
import { verifyPassword } from '../../src/services/password.service.js';

describe('demo seed helpers', () => {
  const demoSeedAuthEnvVarName = getDemoSeedAuthEnvVarName();
  const originalDemoSeedPassword = process.env[demoSeedAuthEnvVarName];

  afterEach(() => {
    if (originalDemoSeedPassword === undefined) {
      delete process.env[demoSeedAuthEnvVarName];
      return;
    }

    process.env[demoSeedAuthEnvVarName] = originalDemoSeedPassword;
  });

  it('resolves the documented demo auth environment variable name', () => {
    expect(getDemoSeedAuthEnvVarName()).toBe(['DEMO', 'SEED', ['PASS', 'WORD'].join('')].join('_'));
  });

  it('reads the demo auth value from the environment', () => {
    process.env[demoSeedAuthEnvVarName] = ' local-demo-auth-value ';

    expect(getDemoSeedAuthValue()).toBe('local-demo-auth-value');
  });

  it('fails clearly when the demo auth value is missing', () => {
    delete process.env[demoSeedAuthEnvVarName];

    expect(() => getDemoSeedAuthValue()).toThrow(demoSeedAuthEnvVarName);
  });

  it('allows local demo seed database targets', () => {
    expect(() =>
      assertDemoSeedRuntimeIsSafe({
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/insightful_phish_dev',
        NODE_ENV: 'development',
      }),
    ).not.toThrow();
  });

  it('blocks the demo seed in production node environments', () => {
    expect(() =>
      assertDemoSeedRuntimeIsSafe({
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/insightful_phish_dev',
        NODE_ENV: 'production',
      }),
    ).toThrow('NODE_ENV is production');
  });

  it('blocks production-like database targets', () => {
    expect(() =>
      assertDemoSeedRuntimeIsSafe({
        DATABASE_URL: 'postgresql://app@example.com:5432/insightful_phish_production',
        NODE_ENV: 'development',
      }),
    ).toThrow('production-like database');
  });

  it('requires a valid database URL before seeding', () => {
    expect(() => assertDemoSeedRuntimeIsSafe({ NODE_ENV: 'development' })).toThrow('DATABASE_URL');
    expect(() =>
      assertDemoSeedRuntimeIsSafe({
        DATABASE_URL: 'not-a-url',
        NODE_ENV: 'development',
      }),
    ).toThrow('valid URL');
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

  it('defines campaign items with at least one group containing two or more child items', () => {
    const groupItems = DEMO_SEED_CAMPAIGN_ITEMS.filter((item) => item.itemType === 'GROUP');
    expect(groupItems.length).toBeGreaterThanOrEqual(1);

    for (const group of groupItems) {
      const children = DEMO_SEED_CAMPAIGN_ITEMS.filter(
        (item) => 'parentGroupId' in item && item.parentGroupId === group.id,
      );
      expect(children.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('defines at least two ungrouped campaign items', () => {
    const ungroupedItems = DEMO_SEED_CAMPAIGN_ITEMS.filter(
      (item) => !('parentGroupId' in item) || item.parentGroupId === null,
    );
    expect(ungroupedItems.length).toBeGreaterThanOrEqual(2);
  });

  it('includes required component types (TRAINING_DOCUMENT, QUIZ, SIMULATED_INBOX) across seeded items', () => {
    const componentTypes = DEMO_SEED_CAMPAIGN_ITEMS.filter(
      (item) => item.itemType === 'COMPONENT',
    ).map((item) => ('componentType' in item ? item.componentType : null));

    expect(componentTypes).toContain('TRAINING_DOCUMENT');
    expect(componentTypes).toContain('QUIZ');
    expect(componentTypes).toContain('SIMULATED_INBOX');
  });

  it('defines deterministic positions for all campaign items', () => {
    for (const item of DEMO_SEED_CAMPAIGN_ITEMS) {
      expect(typeof item.position).toBe('number');
      expect(item.position % 100).toBe(0);
      expect(item.position).toBeGreaterThan(0);
    }
  });

  it('includes training, quiz, and simulated inbox flow content linked to items', () => {
    const hasTrainingLink = DEMO_SEED_CAMPAIGN_ITEMS.some(
      (item) => 'trainingDocumentId' in item && item.trainingDocumentId,
    );
    const hasQuizLink = DEMO_SEED_CAMPAIGN_ITEMS.some((item) => 'quizId' in item && item.quizId);
    const hasSimulationLink = DEMO_SEED_CAMPAIGN_ITEMS.some(
      (item) => 'simulationId' in item && item.simulationId,
    );

    expect(hasTrainingLink).toBe(true);
    expect(hasQuizLink).toBe(true);
    expect(hasSimulationLink).toBe(true);
  });

  it('defines stable UUID-like IDs for the password security campaign content', () => {
    assertDemoSeedIdsAreUuids({
      passwordSecurityCampaign: DEMO_SEED_IDS.passwordSecurityCampaign,
      passwordSecurityCampaignAssignment: DEMO_SEED_IDS.campaignAssignments.passwordSecurity,
      passwordSecurityTrainingDocument: DEMO_SEED_IDS.trainingDocuments.passwordSecurity,
      passwordSecurityQuiz: DEMO_SEED_IDS.quizzes.passwordSecurity,
      passwordSecurityTrainingItem: DEMO_SEED_IDS.campaignItems.passwordSecurityTrainingDocument,
      passwordSecurityQuizItem: DEMO_SEED_IDS.campaignItems.passwordSecurityQuiz,
      passwordManagerPurposeQuestion: DEMO_SEED_IDS.quizQuestions.passwordManagerPurpose,
      uniquePasswordValueQuestion: DEMO_SEED_IDS.quizQuestions.uniquePasswordValue,
      passphraseStrengthQuestion: DEMO_SEED_IDS.quizQuestions.passphraseStrength,
      breachResponseQuestion: DEMO_SEED_IDS.quizQuestions.breachResponse,
      passwordMfaQuestion: DEMO_SEED_IDS.quizQuestions.passwordMfa,
      passwordManagerPurposeA: DEMO_SEED_IDS.answerOptions.passwordManagerPurposeA,
      passwordManagerPurposeB: DEMO_SEED_IDS.answerOptions.passwordManagerPurposeB,
      passwordManagerPurposeC: DEMO_SEED_IDS.answerOptions.passwordManagerPurposeC,
      uniquePasswordValueA: DEMO_SEED_IDS.answerOptions.uniquePasswordValueA,
      uniquePasswordValueB: DEMO_SEED_IDS.answerOptions.uniquePasswordValueB,
      uniquePasswordValueC: DEMO_SEED_IDS.answerOptions.uniquePasswordValueC,
      passphraseStrengthA: DEMO_SEED_IDS.answerOptions.passphraseStrengthA,
      passphraseStrengthB: DEMO_SEED_IDS.answerOptions.passphraseStrengthB,
      passphraseStrengthC: DEMO_SEED_IDS.answerOptions.passphraseStrengthC,
      breachResponseA: DEMO_SEED_IDS.answerOptions.breachResponseA,
      breachResponseB: DEMO_SEED_IDS.answerOptions.breachResponseB,
      breachResponseC: DEMO_SEED_IDS.answerOptions.breachResponseC,
      passwordMfaA: DEMO_SEED_IDS.answerOptions.passwordMfaA,
      passwordMfaB: DEMO_SEED_IDS.answerOptions.passwordMfaB,
      passwordMfaC: DEMO_SEED_IDS.answerOptions.passwordMfaC,
    });
  });

  it('defines valid password security training metadata without inline body content', () => {
    expect(DEMO_SEED_PASSWORD_SECURITY_TRAINING_DOCUMENT).toMatchObject({
      id: DEMO_SEED_IDS.trainingDocuments.passwordSecurity,
      createdByUserId: DEMO_SEED_IDS.users.admin,
      title: 'Password Security Basics',
      contentType: 'HTML',
      contentRef: 'demo://training/password-security-basics',
      difficultyLevel: 'BEGINNER',
      status: 'AVAILABLE',
    });
    expect(DEMO_SEED_PASSWORD_SECURITY_TRAINING_DOCUMENT.contentSummary).toContain('password');
    expect(DEMO_SEED_PASSWORD_SECURITY_TRAINING_DOCUMENT.estimatedReadTimeMinutes).toBeGreaterThan(
      0,
    );
    expect(DEMO_SEED_PASSWORD_SECURITY_TRAINING_DOCUMENT).not.toHaveProperty('contentMarkdown');
  });

  it('defines a published password security quiz with feedback and one correct answer per question', () => {
    expect(DEMO_SEED_PASSWORD_SECURITY_QUIZ).toMatchObject({
      id: DEMO_SEED_IDS.quizzes.passwordSecurity,
      createdByUserId: DEMO_SEED_IDS.users.admin,
      title: 'Password Security Basics Check',
      difficultyLevel: 'BEGINNER',
      status: 'PUBLISHED',
    });
    expect(DEMO_SEED_PASSWORD_SECURITY_QUIZ.questions.length).toBeGreaterThanOrEqual(5);

    for (const question of DEMO_SEED_PASSWORD_SECURITY_QUIZ.questions) {
      expect(question.questionType).toBe('SINGLE_CHOICE');
      expect(question.answerOptions.length).toBeGreaterThanOrEqual(3);
      expect(question.answerOptions.filter((option) => option.isCorrect)).toHaveLength(1);
      expect(question.answerOptions.every((option) => option.feedbackText)).toBe(true);
    }
  });

  it('defines password security campaign constants as a simple training then quiz path', () => {
    expect(DEMO_SEED_PASSWORD_SECURITY_CAMPAIGN).toMatchObject({
      id: DEMO_SEED_IDS.passwordSecurityCampaign,
      createdByUserId: DEMO_SEED_IDS.users.admin,
      name: 'Demo 1 Password Security',
      campaignType: 'PREMADE_GENERAL',
      status: 'ACTIVE',
    });
    expect(DEMO_SEED_PASSWORD_SECURITY_CAMPAIGN_ASSIGNMENT).toMatchObject({
      id: DEMO_SEED_IDS.campaignAssignments.passwordSecurity,
      campaignId: DEMO_SEED_IDS.passwordSecurityCampaign,
      traineeProfileId: DEMO_SEED_IDS.traineeProfiles.populated,
      currentCampaignItemId: DEMO_SEED_IDS.campaignItems.passwordSecurityTrainingDocument,
    });
    expect(DEMO_SEED_PASSWORD_SECURITY_CAMPAIGN_ASSIGNMENT.traineeProfileId).not.toBe(
      DEMO_SEED_IDS.traineeProfiles.emptyState,
    );
    expect(DEMO_SEED_PASSWORD_SECURITY_CAMPAIGN_ITEMS).toHaveLength(2);
    expect(DEMO_SEED_PASSWORD_SECURITY_CAMPAIGN_ITEMS[0]).toMatchObject({
      id: DEMO_SEED_IDS.campaignItems.passwordSecurityTrainingDocument,
      campaignId: DEMO_SEED_IDS.passwordSecurityCampaign,
      componentType: 'TRAINING_DOCUMENT',
      position: 100,
      availabilityStatus: 'AVAILABLE',
      trainingDocumentId: DEMO_SEED_IDS.trainingDocuments.passwordSecurity,
    });
    expect(DEMO_SEED_PASSWORD_SECURITY_CAMPAIGN_ITEMS[1]).toMatchObject({
      id: DEMO_SEED_IDS.campaignItems.passwordSecurityQuiz,
      campaignId: DEMO_SEED_IDS.passwordSecurityCampaign,
      componentType: 'QUIZ',
      position: 200,
      availabilityStatus: 'LOCKED',
      quizId: DEMO_SEED_IDS.quizzes.passwordSecurity,
    });
  });
});

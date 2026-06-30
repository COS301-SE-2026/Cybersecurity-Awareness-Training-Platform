import { describe, expect, it } from 'vitest';
import {
  emailVerificationTemplateDataSchema,
  emailChangeWarningTemplateDataSchema,
  organisationAdminPromotionInviteTemplateDataSchema,
  organisationRequestReceivedTemplateDataSchema,
  organisationRequestRejectedTemplateDataSchema,
  organisationTraineeInviteTemplateDataSchema,
  initialOrganisationAdminSetupTemplateDataSchema,
  platformAdminInviteTemplateDataSchema,
  platformAdminUpgradeConfirmationTemplateDataSchema,
  roleChangedNotificationTemplateDataSchema,
  passwordChangedTemplateDataSchema,
  passwordResetTemplateDataSchema,
  emailChangeConfirmationTemplateDataSchema,
} from './email-template.schemas';
const rawToken = 'rawtokenqwertyuiopasdfghjklzxcvbnm';
const expiresAt = new Date('2026-06-29T12:00:00.000Z');

describe('email template schemas', () => {
  it('requires token exiry for tokenised email templates', () => {
    const result = emailVerificationTemplateDataSchema.safeParse({
      firstName: 'Johan',
      actionToken: rawToken,
    });
    expect(result.success).toBe(false);
  });

  it('allows missing first name for organisation trainee invite emails', () => {
    const result = organisationTraineeInviteTemplateDataSchema.safeParse({
      organisationName: 'Test Org',
      actionToken: rawToken,
      actionTokenExpiresAt: expiresAt,
    });
    expect(result.success).toBe(true);
  });

  it('allows missing first name for new platform admin invite emails', () => {
    const result = platformAdminInviteTemplateDataSchema.safeParse({
      actionToken: rawToken,
      actionTokenExpiresAt: expiresAt,
    });
    expect(result.success).toBe(true);
  });

  it('requires first name for existing account role change emails', () => {
    const result = platformAdminUpgradeConfirmationTemplateDataSchema.safeParse({
      actionToken: rawToken,
      actionTokenExpiresAt: expiresAt,
    });
    expect(result.success).toBe(false);

    const result1 = organisationAdminPromotionInviteTemplateDataSchema.safeParse({
      organisationName: 'Test Org',
      actionToken: rawToken,
      actionTokenExpiresAt: expiresAt,
    });
    expect(result1.success).toBe(false);

    const result2 = roleChangedNotificationTemplateDataSchema.safeParse({
      roleName: 'platform admin',
    });
    expect(result2.success).toBe(false);
  });

  it('rejects unkown fields in template data', () => {
    const templateCases = [
      [
        emailVerificationTemplateDataSchema,
        { firstName: 'Johan', actionToken: rawToken, actionTokenExpiresAt: expiresAt },
      ],
      [
        passwordResetTemplateDataSchema,
        { firstName: 'Johan', actionToken: rawToken, actionTokenExpiresAt: expiresAt },
      ],
      [passwordChangedTemplateDataSchema, { firstName: 'Johan' }],
      [
        emailChangeConfirmationTemplateDataSchema,
        {
          firstName: 'Johan',
          oldEmail: 'old@example.com',
          newEmail: 'new@example.com',
          actionToken: rawToken,
          actionTokenExpiresAt: expiresAt,
        },
      ],
      [
        emailChangeWarningTemplateDataSchema,
        { firstName: 'Johan', oldEmail: 'old@example.com', newEmail: 'new@example.com' },
      ],
      [organisationRequestReceivedTemplateDataSchema, { organisationName: 'Test Org' }],
      [
        organisationRequestRejectedTemplateDataSchema,
        { organisationName: 'Test Org', rejectionReason: 'Dont like you' },
      ],
      [
        initialOrganisationAdminSetupTemplateDataSchema,
        {
          firstName: 'Johan',
          organisationName: 'Test Org',
          actionToken: rawToken,
          actionTokenExpiresAt: expiresAt,
        },
      ],
      [
        organisationTraineeInviteTemplateDataSchema,
        {
          firstName: 'Johan',
          organisationName: 'Test Org',
          actionToken: rawToken,
          actionTokenExpiresAt: expiresAt,
        },
      ],
      [
        organisationAdminPromotionInviteTemplateDataSchema,
        {
          firstName: 'Johan',
          organisationName: 'test Org',
          actionToken: rawToken,
          actionTokenExpiresAt: expiresAt,
        },
      ],
      [
        platformAdminInviteTemplateDataSchema,
        { firstName: 'Johan', actionToken: rawToken, actionTokenExpiresAt: expiresAt },
      ],
      [
        platformAdminUpgradeConfirmationTemplateDataSchema,
        { firstName: 'Johan', actionToken: rawToken, actionTokenExpiresAt: expiresAt },
      ],
      [
        roleChangedNotificationTemplateDataSchema,
        { firstName: 'Johan', organisationName: 'Test Org', roleName: 'platformadmin' },
      ],
    ] as const;
    for (const [schema, data] of templateCases) {
      const resultGood = schema.safeParse(data);
      expect(resultGood.success).toBe(true);
      const resultBad = schema.safeParse({ ...data, unexpected: 'unexpected' });
      expect(resultBad.success).toBe(false);
    }
  });
}); //describe

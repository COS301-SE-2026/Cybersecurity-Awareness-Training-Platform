import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import {
  BROWSER_PORTAL_INTERACTION_EVENT_TYPES,
  PORTAL_CLIENT_EVENT_ID_MAX_LENGTH,
  PORTAL_DELIVERY_CHANNELS,
  PORTAL_INTERACTION_EVENT_TYPES,
  PORTAL_TEMPLATE_IDS,
  browserPortalInteractionEventTypeSchema,
  campaignPortalReportingFactSchema,
  managedPortalLinkContextSchema,
  portalCapableEmailFieldsSchema,
  portalDeliveryChannelSchema,
  portalEducationalRevealSchema,
  portalEmailRedFlagSchema,
  portalInsightSummarySchema,
  portalInteractionEventTypeSchema,
  portalTemplateDefinitionSchema,
  portalTemplateIdSchema,
  portalTemplatePresentationSchema,
  portalWarningSignSchema,
  realEmailManagedPortalLinkContextSchema,
  recordPortalInteractionRequestSchema,
  recordPortalInteractionResponseSchema,
  resolvePhishingPortalResponseSchema,
  simulatedInboxManagedPortalLinkContextSchema,
  traineePortalInsightSchema,
  type BrowserPortalInteractionEventType,
  type CampaignPortalReportingFact,
  type ManagedPortalLinkContext,
  type PortalCapableEmailFields,
  type PortalDeliveryChannel,
  type PortalEducationalReveal,
  type PortalEmailRedFlag,
  type PortalInsightSummary,
  type PortalInteractionEventType,
  type PortalTemplateDefinition,
  type PortalTemplateId,
  type PortalTemplatePresentation,
  type PortalWarningSign,
  type RecordPortalInteractionRequest,
  type RecordPortalInteractionResponse,
  type ResolvePhishingPortalResponse,
  type TraineePortalInsight,
} from '../index.js';

const campaignAssignmentId = '11111111-1111-4111-8111-111111111111';
const campaignItemId = '22222222-2222-4222-8222-222222222222';
const simulatedEmailId = '33333333-3333-4333-8333-333333333333';
const phishingSimulationMessageId = '44444444-4444-4444-8444-444444444444';
const managedPortalLinkId = '55555555-5555-4555-8555-555555555555';
const traineeProfileId = '66666666-6666-4666-8666-666666666666';

const presentation = {
  templateId: 'GENERIC_ACCOUNT_LOGIN_V1' as const,
  heading: 'Sign in to continue',
  identifierLabel: 'Email address',
  credentialLabel: 'Password',
  submitLabel: 'Sign in',
};

const warningSign = {
  label: 'Unexpected destination',
  description: 'The destination did not match the service named in the email.',
};

const reveal = {
  emailRedFlags: [
    {
      label: 'Urgent language',
      description: null,
    },
  ],
  portalWarningSigns: [warningSign],
  trainingPath: `/training/${campaignItemId}`,
};

const insightSummary = {
  managedLinkRequestCount: 10,
  distinctTraineeLinkRequestCount: 9,
  portalVisitCount: 8,
  distinctPortalVisitorCount: 7,
  identifierFieldInteractionCount: 6,
  credentialFieldInteractionCount: 5,
  credentialSubmissionAttemptCount: 4,
  distinctCredentialAttemptTraineeCount: 3,
  repeatCredentialAttemptCount: 2,
  educationalRevealViewCount: 1,
  distinctRevealTraineeCount: 0,
};

const traineeInsight = {
  managedLinkRequested: true,
  portalVisited: true,
  identifierFieldInteracted: true,
  credentialFieldInteracted: true,
  credentialSubmissionAttemptCount: 2,
  repeatCredentialAttemptCount: 1,
  educationalRevealViewed: true,
};

const simulatedInboxReportingFact = {
  managedPortalLinkId,
  traineeProfileId,
  context: {
    channel: 'SIMULATED_INBOX' as const,
    campaignAssignmentId,
    campaignItemId,
    simulatedEmailId,
  },
  eventType: 'MANAGED_LINK_REQUESTED' as const,
  occurredAt: '2026-09-21T10:15:30.000Z',
};

const realEmailReportingFact = {
  managedPortalLinkId,
  traineeProfileId,
  context: {
    channel: 'REAL_EMAIL' as const,
    phishingSimulationMessageId,
    campaignAssignmentId: null,
  },
  eventType: 'PORTAL_VISITED' as const,
  occurredAt: '2026-09-21T10:15:30.000Z',
};

describe('phishing portal validation schemas', () => {
  it('exports the canonical enum-like values', () => {
    expect(PORTAL_TEMPLATE_IDS).toEqual([
      'GENERIC_ACCOUNT_LOGIN_V1',
      'GENERIC_DOCUMENT_ACCESS_V1',
      'GENERIC_BANKING_LOGIN_V1',
    ]);
    expect(PORTAL_DELIVERY_CHANNELS).toEqual(['SIMULATED_INBOX', 'REAL_EMAIL']);
    expect(BROWSER_PORTAL_INTERACTION_EVENT_TYPES).toEqual([
      'PORTAL_VISITED',
      'PORTAL_IDENTIFIER_FIELD_INTERACTED',
      'PORTAL_CREDENTIAL_FIELD_INTERACTED',
      'CREDENTIAL_SUBMISSION_ATTEMPTED',
      'PORTAL_EDUCATIONAL_REVEAL_VIEWED',
    ]);
    expect(PORTAL_INTERACTION_EVENT_TYPES).toEqual([
      'MANAGED_LINK_REQUESTED',
      ...BROWSER_PORTAL_INTERACTION_EVENT_TYPES,
    ]);
  });

  it('accepts only canonical template identifiers and delivery channels', () => {
    for (const templateId of PORTAL_TEMPLATE_IDS) {
      expect(portalTemplateIdSchema.safeParse(templateId).success).toBe(true);
    }
    for (const channel of PORTAL_DELIVERY_CHANNELS) {
      expect(portalDeliveryChannelSchema.safeParse(channel).success).toBe(true);
    }

    for (const invalidTemplateId of [
      'GENERIC_ACCOUNT_LOGIN_V2',
      'GENERIC_ACCOUNT_LOGIN',
      'GENERIC_UNKNOWN_LOGIN_V1',
      'generic_account_login_v1',
      'GENERIC-ACCOUNT-LOGIN-V1',
      '',
      1,
      null,
    ]) {
      expect(portalTemplateIdSchema.safeParse(invalidTemplateId).success).toBe(false);
    }
    expect(portalDeliveryChannelSchema.safeParse('DIRECT_MESSAGE').success).toBe(false);
  });

  it('validates the strict portal-capable email extension', () => {
    expect(
      portalCapableEmailFieldsSchema.safeParse({
        portalTemplateId: 'GENERIC_DOCUMENT_ACCESS_V1',
      }).success,
    ).toBe(true);
    expect(portalCapableEmailFieldsSchema.safeParse({ portalTemplateId: null }).success).toBe(true);
    expect(
      portalCapableEmailFieldsSchema.safeParse({
        portalTemplateId: null,
        subject: 'Unexpected field',
      }).success,
    ).toBe(false);
  });

  it('validates the simulated inbox managed-link context', () => {
    const context = {
      channel: 'SIMULATED_INBOX' as const,
      campaignAssignmentId,
      campaignItemId,
      simulatedEmailId,
    };

    expect(simulatedInboxManagedPortalLinkContextSchema.safeParse(context).success).toBe(true);
    expect(managedPortalLinkContextSchema.safeParse(context).success).toBe(true);

    for (const requiredField of [
      'campaignAssignmentId',
      'campaignItemId',
      'simulatedEmailId',
    ] as const) {
      const invalidContext: Partial<typeof context> = { ...context };
      delete invalidContext[requiredField];
      expect(managedPortalLinkContextSchema.safeParse(invalidContext).success).toBe(false);
    }

    expect(
      managedPortalLinkContextSchema.safeParse({
        ...context,
        phishingSimulationMessageId,
      }).success,
    ).toBe(false);
  });

  it('validates the real email managed-link context', () => {
    const context = {
      channel: 'REAL_EMAIL' as const,
      phishingSimulationMessageId,
    };

    expect(realEmailManagedPortalLinkContextSchema.safeParse(context).success).toBe(true);
    expect(managedPortalLinkContextSchema.safeParse(context).success).toBe(true);
    expect(
      managedPortalLinkContextSchema.safeParse({
        ...context,
        campaignAssignmentId,
      }).success,
    ).toBe(true);
    expect(
      managedPortalLinkContextSchema.safeParse({
        ...context,
        campaignAssignmentId: null,
      }).success,
    ).toBe(true);
    expect(
      managedPortalLinkContextSchema.safeParse({
        channel: 'REAL_EMAIL',
        campaignAssignmentId,
      }).success,
    ).toBe(false);

    for (const forbiddenField of ['campaignItemId', 'simulatedEmailId'] as const) {
      expect(
        managedPortalLinkContextSchema.safeParse({
          ...context,
          [forbiddenField]: forbiddenField === 'campaignItemId' ? campaignItemId : simulatedEmailId,
        }).success,
      ).toBe(false);
    }
  });

  it('rejects unknown managed-link context properties', () => {
    expect(
      managedPortalLinkContextSchema.safeParse({
        channel: 'SIMULATED_INBOX',
        campaignAssignmentId,
        campaignItemId,
        simulatedEmailId,
        tenantId: campaignAssignmentId,
      }).success,
    ).toBe(false);
    expect(
      managedPortalLinkContextSchema.safeParse({
        channel: 'REAL_EMAIL',
        phishingSimulationMessageId,
        organisationId: campaignAssignmentId,
      }).success,
    ).toBe(false);
  });

  it('rejects mixed and ambiguous managed-link contexts', () => {
    expect(
      managedPortalLinkContextSchema.safeParse({
        campaignAssignmentId,
        campaignItemId,
        simulatedEmailId,
        phishingSimulationMessageId,
      }).success,
    ).toBe(false);
    expect(
      managedPortalLinkContextSchema.safeParse({
        channel: 'SIMULATED_INBOX',
        campaignAssignmentId,
        campaignItemId,
        simulatedEmailId,
        phishingSimulationMessageId,
      }).success,
    ).toBe(false);
    expect(
      managedPortalLinkContextSchema.safeParse({
        channel: 'REAL_EMAIL',
        phishingSimulationMessageId,
        campaignItemId,
        simulatedEmailId,
      }).success,
    ).toBe(false);
  });

  it('separates browser-submitted events from server-observed events', () => {
    for (const eventType of BROWSER_PORTAL_INTERACTION_EVENT_TYPES) {
      expect(browserPortalInteractionEventTypeSchema.safeParse(eventType).success).toBe(true);
      expect(portalInteractionEventTypeSchema.safeParse(eventType).success).toBe(true);
      expect(
        recordPortalInteractionRequestSchema.safeParse({
          eventType,
          clientEventId: `event-${eventType}`,
        }).success,
      ).toBe(true);
    }

    expect(portalInteractionEventTypeSchema.safeParse('MANAGED_LINK_REQUESTED').success).toBe(true);
    expect(
      browserPortalInteractionEventTypeSchema.safeParse('MANAGED_LINK_REQUESTED').success,
    ).toBe(false);
  });

  it('accepts canonical Campaign portal reporting facts for both managed contexts', () => {
    expect(campaignPortalReportingFactSchema.safeParse(simulatedInboxReportingFact).success).toBe(
      true,
    );
    expect(campaignPortalReportingFactSchema.safeParse(realEmailReportingFact).success).toBe(true);
  });

  it('accepts every canonical factual portal event', () => {
    for (const eventType of PORTAL_INTERACTION_EVENT_TYPES) {
      expect(
        campaignPortalReportingFactSchema.safeParse({
          ...simulatedInboxReportingFact,
          eventType,
        }).success,
      ).toBe(true);
    }
  });

  it('rejects invalid or incomplete Campaign portal reporting facts', () => {
    expect(
      campaignPortalReportingFactSchema.safeParse({
        ...simulatedInboxReportingFact,
        eventType: 'PORTAL_UNKNOWN_EVENT',
      }).success,
    ).toBe(false);
    expect(
      campaignPortalReportingFactSchema.safeParse({
        ...simulatedInboxReportingFact,
        occurredAt: '21 September 2026',
      }).success,
    ).toBe(false);

    for (const requiredField of ['managedPortalLinkId', 'traineeProfileId'] as const) {
      const invalidFact: Partial<typeof simulatedInboxReportingFact> = {
        ...simulatedInboxReportingFact,
      };
      delete invalidFact[requiredField];
      expect(campaignPortalReportingFactSchema.safeParse(invalidFact).success).toBe(false);
    }
  });

  it('rejects mixed Campaign portal reporting contexts', () => {
    expect(
      campaignPortalReportingFactSchema.safeParse({
        ...simulatedInboxReportingFact,
        context: {
          ...simulatedInboxReportingFact.context,
          phishingSimulationMessageId,
        },
      }).success,
    ).toBe(false);
    expect(
      campaignPortalReportingFactSchema.safeParse({
        ...realEmailReportingFact,
        context: {
          ...realEmailReportingFact.context,
          campaignItemId,
          simulatedEmailId,
        },
      }).success,
    ).toBe(false);
  });

  it.each([
    ['unknown property', 'unexpected', 'value'],
    ['raw token', 'token', 'opaque-token'],
    ['token hash', 'tokenHash', 'hashed-token'],
    ['client retry identifier', 'clientEventId', 'browser-event-1'],
    ['metadata', 'metadata', { source: 'browser' }],
    ['form data', 'formData', { field: 'value' }],
    ['entered identifier', 'identifier', 'entered-user'],
    ['username', 'username', 'entered-user'],
    ['entered email', 'email', 'entered@example.test'],
    ['password', 'password', 'secret'],
    ['credential', 'credential', 'secret'],
    ['credentials', 'credentials', { password: 'secret' }],
    ['credential hash', 'credentialHash', 'hashed-secret'],
    ['one-time pin', 'otp', '123456'],
    ['one-time pin alias', 'oneTimePin', '123456'],
    ['PIN', 'pin', '1234'],
    ['event payload', 'eventPayload', { arbitrary: true }],
    ['provider metadata', 'providerMetadata', { provider: 'smtp' }],
    ['sender provider metadata', 'senderProviderMetadata', { provider: 'smtp' }],
    ['delivery metadata', 'emailDeliveryMetadata', { messageId: 'message-1' }],
    ['organisation name', 'organisationName', 'Example Organisation'],
    ['unrelated trainee data', 'traineeEmail', 'trainee@example.test'],
    ['recipient email', 'recipientEmail', 'recipient@example.test'],
    ['recipient phone', 'recipientPhoneNumber', '+27123456789'],
  ])('rejects prohibited %s fields', (_description, field, value) => {
    expect(
      campaignPortalReportingFactSchema.safeParse({
        ...simulatedInboxReportingFact,
        [field]: value,
      }).success,
    ).toBe(false);
  });

  it('accepts only an event type and a non-empty client event identifier', () => {
    const result = recordPortalInteractionRequestSchema.parse({
      eventType: 'PORTAL_VISITED',
      clientEventId: '  event-1  ',
    });

    expect(result).toEqual({
      eventType: 'PORTAL_VISITED',
      clientEventId: 'event-1',
    });
    expect(
      recordPortalInteractionRequestSchema.safeParse({
        eventType: 'PORTAL_VISITED',
        clientEventId: '   ',
      }).success,
    ).toBe(false);
    expect(
      recordPortalInteractionRequestSchema.safeParse({
        eventType: 'PORTAL_VISITED',
      }).success,
    ).toBe(false);
    expect(
      recordPortalInteractionRequestSchema.safeParse({
        eventType: 'MANAGED_LINK_REQUESTED',
        clientEventId: 'event-2',
      }).success,
    ).toBe(false);
  });

  it('bounds client event identifiers at the public trust boundary', () => {
    expect(
      recordPortalInteractionRequestSchema.safeParse({
        eventType: 'PORTAL_VISITED',
        clientEventId: 'a'.repeat(PORTAL_CLIENT_EVENT_ID_MAX_LENGTH),
      }).success,
    ).toBe(true);

    const result = recordPortalInteractionRequestSchema.safeParse({
      eventType: 'PORTAL_VISITED',
      clientEventId: 'a'.repeat(PORTAL_CLIENT_EVENT_ID_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        `Client event identifier must be at most ${PORTAL_CLIENT_EVENT_ID_MAX_LENGTH} characters.`,
      );
    }
  });

  it('rejects identity, source, and captured-input fields in browser requests', () => {
    const forbiddenFields = [
      'metadata',
      'formData',
      'fieldValues',
      'value',
      'username',
      'email',
      'identifier',
      'password',
      'credential',
      'credentials',
      'otp',
      'oneTimePin',
      'pin',
      'portalTemplateId',
      'organisationId',
      'tenantId',
      'campaignAssignmentId',
      'campaignItemId',
      'simulationId',
      'simulatedEmailId',
      'emailId',
      'sourceId',
      'phishingSimulationMessageId',
      'token',
    ] as const;

    for (const forbiddenField of forbiddenFields) {
      const value = forbiddenField === 'metadata' || forbiddenField === 'formData' ? {} : 'value';
      expect(
        recordPortalInteractionRequestSchema.safeParse({
          eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
          clientEventId: 'event-3',
          [forbiddenField]: value,
        }).success,
      ).toBe(false);
    }
  });

  it('validates trimmed warning signs and safe template shapes', () => {
    expect(
      portalWarningSignSchema.parse({
        label: '  Unexpected destination  ',
        description: '  Check the destination before entering credentials.  ',
      }),
    ).toEqual({
      label: 'Unexpected destination',
      description: 'Check the destination before entering credentials.',
    });
    expect(portalWarningSignSchema.safeParse({ label: '', description: 'Valid' }).success).toBe(
      false,
    );
    expect(
      portalWarningSignSchema.safeParse({
        label: 'L'.repeat(201),
        description: 'Valid',
      }).success,
    ).toBe(false);
    expect(
      portalWarningSignSchema.safeParse({
        label: 'Valid',
        description: 'D'.repeat(2001),
      }).success,
    ).toBe(false);

    expect(portalTemplatePresentationSchema.safeParse(presentation).success).toBe(true);
    expect(
      portalTemplatePresentationSchema.safeParse({
        ...presentation,
        warningSigns: [warningSign],
      }).success,
    ).toBe(false);
    expect(
      portalTemplateDefinitionSchema.safeParse({
        ...presentation,
        warningSigns: [warningSign],
      }).success,
    ).toBe(true);
  });

  it('validates the educational reveal and server-owned training path', () => {
    expect(portalEducationalRevealSchema.safeParse(reveal).success).toBe(true);
    expect(
      portalEducationalRevealSchema.safeParse({
        ...reveal,
        trainingPath: null,
      }).success,
    ).toBe(true);

    for (const invalidPath of [
      'https://example.com/training',
      '//example.com/training',
      'training/lesson',
      '/training/../admin',
      '/training/lesson?redirect=https://example.com',
      42,
      undefined,
    ]) {
      expect(
        portalEducationalRevealSchema.safeParse({
          ...reveal,
          trainingPath: invalidPath,
        }).success,
      ).toBe(false);
    }
  });

  it('keeps email red flags and educational reveal objects strict', () => {
    expect(
      portalEmailRedFlagSchema.safeParse({
        label: 'Urgent language',
        description: 'The message pressured the recipient to act quickly.',
      }).success,
    ).toBe(true);
    expect(
      portalEmailRedFlagSchema.safeParse({
        label: 'Urgent language',
        description: null,
        severity: 'HIGH',
      }).success,
    ).toBe(false);
    expect(
      portalWarningSignSchema.safeParse({
        ...warningSign,
        severity: 'HIGH',
      }).success,
    ).toBe(false);
    expect(
      portalEducationalRevealSchema.safeParse({
        ...reveal,
        capturedValue: 'secret',
      }).success,
    ).toBe(false);

    for (const forbiddenField of [
      'value',
      'password',
      'credential',
      'credentials',
      'token',
      'rawToken',
    ]) {
      expect(
        portalEducationalRevealSchema.safeParse({
          ...reveal,
          [forbiddenField]: 'sensitive-value',
        }).success,
      ).toBe(false);
    }
  });

  it('returns only the safe presentation for an active portal', () => {
    expect(
      resolvePhishingPortalResponseSchema.safeParse({
        state: 'ACTIVE',
        portal: presentation,
      }).success,
    ).toBe(true);
    expect(resolvePhishingPortalResponseSchema.safeParse({ state: 'ACTIVE' }).success).toBe(false);
    expect(
      resolvePhishingPortalResponseSchema.safeParse({
        state: 'ACTIVE',
        portal: {
          ...presentation,
          warningSigns: [warningSign],
        },
      }).success,
    ).toBe(false);
  });

  it('keeps inactive portal responses free of a portal payload', () => {
    expect(resolvePhishingPortalResponseSchema.safeParse({ state: 'INACTIVE' }).success).toBe(true);
    expect(resolvePhishingPortalResponseSchema.safeParse({ state: 'UNAVAILABLE' }).success).toBe(
      true,
    );

    for (const state of ['INACTIVE', 'UNAVAILABLE'] as const) {
      expect(
        resolvePhishingPortalResponseSchema.safeParse({
          state,
          portal: presentation,
        }).success,
      ).toBe(false);
    }
  });

  it('rejects unknown, source, tenant, token, and internal fields in resolve responses', () => {
    for (const forbiddenField of [
      'unexpected',
      'organisationId',
      'tenantId',
      'token',
      'internalId',
      'traineeId',
      'campaignAssignmentId',
      'campaignItemId',
      'simulatedEmailId',
      'phishingSimulationMessageId',
    ]) {
      expect(
        resolvePhishingPortalResponseSchema.safeParse({
          state: 'ACTIVE',
          portal: presentation,
          [forbiddenField]: 'private-value',
        }).success,
      ).toBe(false);
    }
  });

  it('validates only the canonical interaction response reveal', () => {
    expect(
      recordPortalInteractionResponseSchema.safeParse({
        accepted: false,
        reveal: null,
      }).success,
    ).toBe(false);
    expect(
      recordPortalInteractionResponseSchema.safeParse({
        accepted: true,
        reveal: null,
      }).success,
    ).toBe(true);
    expect(
      recordPortalInteractionResponseSchema.safeParse({
        accepted: true,
        reveal,
      }).success,
    ).toBe(true);
    expect(
      recordPortalInteractionResponseSchema.safeParse({
        accepted: true,
        reveal,
        credential: 'secret',
      }).success,
    ).toBe(false);
  });

  it('accepts non-negative integer portal insight counts', () => {
    expect(portalInsightSummarySchema.safeParse(insightSummary).success).toBe(true);
    expect(traineePortalInsightSchema.safeParse(traineeInsight).success).toBe(true);

    for (const countField of Object.keys(insightSummary) as (keyof typeof insightSummary)[]) {
      expect(
        portalInsightSummarySchema.safeParse({
          ...insightSummary,
          [countField]: -1,
        }).success,
      ).toBe(false);
      expect(
        portalInsightSummarySchema.safeParse({
          ...insightSummary,
          [countField]: 1.5,
        }).success,
      ).toBe(false);
    }

    for (const countField of [
      'credentialSubmissionAttemptCount',
      'repeatCredentialAttemptCount',
    ] as const) {
      expect(
        traineePortalInsightSchema.safeParse({
          ...traineeInsight,
          [countField]: -1,
        }).success,
      ).toBe(false);
      expect(
        traineePortalInsightSchema.safeParse({
          ...traineeInsight,
          [countField]: 1.5,
        }).success,
      ).toBe(false);
    }
  });

  it('keeps reporting objects strict', () => {
    expect(
      portalInsightSummarySchema.safeParse({
        ...insightSummary,
        campaignId: campaignAssignmentId,
      }).success,
    ).toBe(false);
    expect(
      traineePortalInsightSchema.safeParse({
        ...traineeInsight,
        traineeId: campaignAssignmentId,
      }).success,
    ).toBe(false);
  });

  it('rejects reporting objects with any required field missing', () => {
    for (const requiredField of Object.keys(insightSummary)) {
      const invalidSummary: Record<string, unknown> = { ...insightSummary };
      delete invalidSummary[requiredField];
      expect(portalInsightSummarySchema.safeParse(invalidSummary).success).toBe(false);
    }

    for (const requiredField of Object.keys(traineeInsight)) {
      const invalidInsight: Record<string, unknown> = { ...traineeInsight };
      delete invalidInsight[requiredField];
      expect(traineePortalInsightSchema.safeParse(invalidInsight).success).toBe(false);
    }
  });

  it('aligns public schema outputs with the canonical exported types', () => {
    expectTypeOf<z.output<typeof portalTemplateIdSchema>>().toMatchTypeOf<PortalTemplateId>();
    expectTypeOf<
      z.output<typeof portalCapableEmailFieldsSchema>
    >().toMatchTypeOf<PortalCapableEmailFields>();
    expectTypeOf<
      z.output<typeof portalDeliveryChannelSchema>
    >().toMatchTypeOf<PortalDeliveryChannel>();
    expectTypeOf<
      z.output<typeof managedPortalLinkContextSchema>
    >().toMatchTypeOf<ManagedPortalLinkContext>();
    expectTypeOf<
      z.output<typeof browserPortalInteractionEventTypeSchema>
    >().toMatchTypeOf<BrowserPortalInteractionEventType>();
    expectTypeOf<
      z.output<typeof portalInteractionEventTypeSchema>
    >().toMatchTypeOf<PortalInteractionEventType>();
    expectTypeOf<
      z.output<typeof campaignPortalReportingFactSchema>
    >().toMatchTypeOf<CampaignPortalReportingFact>();
    expectTypeOf<
      z.output<typeof recordPortalInteractionRequestSchema>
    >().toMatchTypeOf<RecordPortalInteractionRequest>();
    expectTypeOf<z.output<typeof portalWarningSignSchema>>().toMatchTypeOf<PortalWarningSign>();
    expectTypeOf<
      z.output<typeof portalTemplatePresentationSchema>
    >().toMatchTypeOf<PortalTemplatePresentation>();
    expectTypeOf<
      z.output<typeof portalTemplateDefinitionSchema>
    >().toMatchTypeOf<PortalTemplateDefinition>();
    expectTypeOf<z.output<typeof portalEmailRedFlagSchema>>().toMatchTypeOf<PortalEmailRedFlag>();
    expectTypeOf<
      z.output<typeof portalEducationalRevealSchema>
    >().toMatchTypeOf<PortalEducationalReveal>();
    expectTypeOf<
      z.output<typeof resolvePhishingPortalResponseSchema>
    >().toMatchTypeOf<ResolvePhishingPortalResponse>();
    expectTypeOf<
      z.output<typeof recordPortalInteractionResponseSchema>
    >().toMatchTypeOf<RecordPortalInteractionResponse>();
    expectTypeOf<
      z.output<typeof portalInsightSummarySchema>
    >().toMatchTypeOf<PortalInsightSummary>();
    expectTypeOf<
      z.output<typeof traineePortalInsightSchema>
    >().toMatchTypeOf<TraineePortalInsight>();
  });
});

import { describe, expect, it } from 'vitest';
import { EmailPersonalisationField } from '../simulations.js';
import {
  activationValidationIssueSchema,
  addLibraryEmailToSimulatedInboxRequestSchema,
  classifySimulatedEmailRequestSchema,
  createSimulatedInboxDraftRequestSchema,
  emailClassificationSchema,
  emailPersonalisationFields,
  emailPersonalisationMarkers,
  emailRedFlagTypeSchema,
  embeddedEmailSnapshotSchema,
  getSimulatedEmailRequestParamsSchema,
  getSimulatedInboxRequestParamsSchema,
  listOrganisationEmailsQuerySchema,
  listSimulatedInboxesQuerySchema,
  organisationEmailDraftInputSchema,
  organisationEmailListSummarySchema,
  organisationEmailManagementDetailResponseSchema,
  phishingSimulationEmailInputSchema,
  redFlagSeveritySchema,
  recordSimulatedEmailInteractionRequestSchema,
  simulatedInboxDraftInputSchema,
  simulatedInboxDetailSchema,
  reorderSimulatedInboxEmailsRequestSchema,
  supportedEmailMarkers,
  systemLinkMarker,
  updateSimulatedInboxDraftRequestSchema,
} from './simulations.schemas.js';

describe('simulation validation schemas', () => {
  const campaignItemId = '11111111-1111-4111-8111-111111111111';
  const emailId = '22222222-2222-4222-8222-222222222222';

  it('accepts UUID simulated inbox route params', () => {
    const result = getSimulatedInboxRequestParamsSchema.safeParse({
      campaignItemId,
    });

    expect(result.success).toBe(true);
  });

  it('rejects malformed simulated inbox route params', () => {
    const result = getSimulatedInboxRequestParamsSchema.safeParse({
      campaignItemId: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });

  it('rejects unexpected simulated inbox route params', () => {
    const result = getSimulatedInboxRequestParamsSchema.safeParse({
      campaignItemId,
      emailId,
    });

    expect(result.success).toBe(false);
  });

  it('accepts UUID simulated email route params', () => {
    const result = getSimulatedEmailRequestParamsSchema.safeParse({
      campaignItemId,
      emailId,
    });

    expect(result.success).toBe(true);
  });

  it('rejects malformed simulated email route params', () => {
    const result = getSimulatedEmailRequestParamsSchema.safeParse({
      campaignItemId,
      emailId: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });

  it('accepts supported simulated email interaction events', () => {
    expect(
      recordSimulatedEmailInteractionRequestSchema.safeParse({
        eventType: 'SIMULATED_EMAIL_OPENED',
      }).success,
    ).toBe(true);

    expect(
      recordSimulatedEmailInteractionRequestSchema.safeParse({
        eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
      }).success,
    ).toBe(true);
  });

  it('rejects unsupported simulated email interaction events', () => {
    const result = recordSimulatedEmailInteractionRequestSchema.safeParse({
      eventType: 'TRAINING_VIEWED',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Please select a supported simulated email interaction event.',
      );
    }
  });

  it('rejects simulated email interaction payloads with unexpected fields', () => {
    const result = recordSimulatedEmailInteractionRequestSchema.safeParse({
      eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
      campaignItemId,
    });

    expect(result.success).toBe(false);
  });

  it('accepts campaign-scoped email classifications', () => {
    const result = classifySimulatedEmailRequestSchema.safeParse({
      selectedClassification: 'PHISHING',
      selectedRedFlagIds: ['11111111-1111-1111-1111-111111111111'],
    });

    expect(result.success).toBe(true);
  });

  it('trims optional classification free text', () => {
    const result = classifySimulatedEmailRequestSchema.parse({
      selectedClassification: 'SUSPICIOUS',
      freeTextReason: '  Urgent tone and suspicious link  ',
    });

    expect(result.freeTextReason).toBe('Urgent tone and suspicious link');
  });

  it('allows empty selected red flag arrays when no red flags are selected', () => {
    const result = classifySimulatedEmailRequestSchema.safeParse({
      selectedClassification: 'SAFE',
      selectedRedFlagIds: [],
    });

    expect(result.success).toBe(true);
  });

  it('rejects classification free text over maximum length', () => {
    const result = classifySimulatedEmailRequestSchema.safeParse({
      selectedClassification: 'SUSPICIOUS',
      freeTextReason: 'A'.repeat(1001),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Reason must be at most 1000 characters.');
    }
  });

  it('rejects invalid classification values and red flag IDs', () => {
    const result = classifySimulatedEmailRequestSchema.safeParse({
      selectedClassification: 'MAYBE',
      selectedRedFlagIds: ['not-a-uuid'],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          'Please select a valid email classification.',
          'Invalid identifier format.',
        ]),
      );
    }
  });

  it('rejects classification payloads with unexpected fields', () => {
    const result = classifySimulatedEmailRequestSchema.safeParse({
      selectedClassification: 'SAFE',
      expectedClassification: 'PHISHING',
    });

    expect(result.success).toBe(false);
  });
});

describe('email authoring schemas', () => {
  const emailId = '22222222-2222-4222-8222-222222222222';
  const draft = {
    senderLabel: '',
    senderAddress: '',
    subject: '',
    preview: '',
    bodyHtml: '<p>Hello {{FIRST_NAME}}. {{SYSTEM_LINK}}</p>',
    link: { anchorText: '' },
    expectedClassification: 'PHISHING' as const,
    redFlags: [
      {
        redFlagType: 'LINK' as const,
        label: '',
        description: null,
        severity: 'HIGH' as const,
      },
    ],
    categories: [],
    difficultyLevel: 'EASY' as const,
  };

  it('exports the canonical personalisation fields and literal markers', () => {
    expect(EmailPersonalisationField).toEqual({
      FIRST_NAME: 'FIRST_NAME',
      SURNAME: 'SURNAME',
      EMAIL_ADDRESS: 'EMAIL_ADDRESS',
    });
    expect(emailPersonalisationFields).toEqual(['FIRST_NAME', 'SURNAME', 'EMAIL_ADDRESS']);
    expect(emailPersonalisationMarkers).toEqual({
      FIRST_NAME: '{{FIRST_NAME}}',
      SURNAME: '{{SURNAME}}',
      EMAIL_ADDRESS: '{{EMAIL_ADDRESS}}',
    });
    expect(systemLinkMarker).toBe('{{SYSTEM_LINK}}');
    expect(supportedEmailMarkers).toEqual([
      '{{FIRST_NAME}}',
      '{{SURNAME}}',
      '{{EMAIL_ADDRESS}}',
      '{{SYSTEM_LINK}}',
    ]);
  });

  it('accepts every supported classification and red-flag enum', () => {
    for (const classification of ['SAFE', 'SUSPICIOUS', 'PHISHING']) {
      expect(emailClassificationSchema.safeParse(classification).success).toBe(true);
    }

    for (const redFlagType of [
      'SENDER',
      'LINK',
      'LANGUAGE',
      'ATTACHMENT',
      'REQUEST',
      'DOMAIN',
      'OTHER',
    ]) {
      expect(emailRedFlagTypeSchema.safeParse(redFlagType).success).toBe(true);
    }

    for (const severity of ['LOW', 'MEDIUM', 'HIGH']) {
      expect(redFlagSeveritySchema.safeParse(severity).success).toBe(true);
    }
  });

  it('accepts structurally valid incomplete drafts and the compatibility schema', () => {
    expect(organisationEmailDraftInputSchema.parse(draft)).toEqual(draft);
    expect(phishingSimulationEmailInputSchema.parse(draft)).toEqual(draft);
    expect(
      organisationEmailDraftInputSchema.safeParse({
        ...draft,
        bodyHtml: '',
        link: null,
        redFlags: [],
      }).success,
    ).toBe(true);
  });

  it('accepts a nullable preview throughout the canonical Draft and snapshot schemas', () => {
    const nullablePreviewDraft = { ...draft, preview: null };
    const timestamps = {
      createdAt: '2026-09-15T10:00:00.000Z',
      updatedAt: '2026-09-15T10:00:00.000Z',
    };

    expect(organisationEmailDraftInputSchema.parse(nullablePreviewDraft).preview).toBeNull();
    expect(phishingSimulationEmailInputSchema.parse(nullablePreviewDraft).preview).toBeNull();
    expect(
      embeddedEmailSnapshotSchema.parse({
        ...nullablePreviewDraft,
        id: '22222222-2222-4222-8222-222222222222',
        sourceOrganisationEmailId: null,
      }).preview,
    ).toBeNull();
    expect(
      organisationEmailManagementDetailResponseSchema.parse({
        ...nullablePreviewDraft,
        id: emailId,
        organisationId: '11111111-1111-4111-8111-111111111111',
        createdByUserId: null,
        status: 'DRAFT',
        ...timestamps,
      }).preview,
    ).toBeNull();
    expect(
      organisationEmailListSummarySchema.parse({
        id: emailId,
        senderLabel: nullablePreviewDraft.senderLabel,
        senderAddress: nullablePreviewDraft.senderAddress,
        subject: nullablePreviewDraft.subject,
        preview: nullablePreviewDraft.preview,
        expectedClassification: nullablePreviewDraft.expectedClassification,
        categories: nullablePreviewDraft.categories,
        difficultyLevel: nullablePreviewDraft.difficultyLevel,
        status: 'DRAFT',
        updatedAt: timestamps.updatedAt,
      }).preview,
    ).toBeNull();
  });

  it('accepts picker query defaults and strict status filters', () => {
    expect(listOrganisationEmailsQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(
      listOrganisationEmailsQuerySchema.parse({ status: 'ACTIVE', search: '  payroll  ' }),
    ).toEqual({
      page: 1,
      limit: 20,
      status: 'ACTIVE',
      search: 'payroll',
    });
    expect(listOrganisationEmailsQuerySchema.safeParse({ status: 'ARCHIVED' }).success).toBe(false);
    expect(
      listOrganisationEmailsQuerySchema.safeParse({ destination: 'https://example.test' }).success,
    ).toBe(false);
  });

  it('does not expose the internal content hash in management details', () => {
    const result = organisationEmailManagementDetailResponseSchema.safeParse({
      ...draft,
      id: '22222222-2222-4222-8222-222222222222',
      organisationId: '11111111-1111-4111-8111-111111111111',
      createdByUserId: null,
      status: 'DRAFT',
      createdAt: '2026-09-15T10:00:00.000Z',
      updatedAt: '2026-09-15T10:00:00.000Z',
      contentHash: 'internal',
    });

    expect(result.success).toBe(false);
  });

  it('keeps link destinations out of authored email links', () => {
    expect(
      organisationEmailDraftInputSchema.safeParse({
        ...draft,
        link: { anchorText: 'Review', destination: 'https://example.test' },
      }).success,
    ).toBe(false);
  });

  it('rejects malformed fields, unknown fields, and unsupported enum values', () => {
    expect(
      organisationEmailDraftInputSchema.safeParse({
        ...draft,
        senderAddress: 42,
      }).success,
    ).toBe(false);
    expect(
      organisationEmailDraftInputSchema.safeParse({
        ...draft,
        hasAttachment: false,
      }).success,
    ).toBe(false);
    expect(
      organisationEmailDraftInputSchema.safeParse({
        ...draft,
        difficultyLevel: 'ADVANCED',
      }).success,
    ).toBe(false);
  });

  it('accepts independent embedded snapshots and positioned inbox children', () => {
    const embedded = {
      ...draft,
      id: '22222222-2222-4222-8222-222222222222',
      sourceOrganisationEmailId: '33333333-3333-4333-8333-333333333333',
    };

    expect(embeddedEmailSnapshotSchema.safeParse(embedded).success).toBe(true);
    expect(
      simulatedInboxDraftInputSchema.safeParse({
        title: '',
        description: '',
        objective: '',
        difficultyLevel: 'MEDIUM',
        emails: [{ ...draft, position: 0, sourceOrganisationEmailId: null }],
      }).success,
    ).toBe(true);
    expect(
      simulatedInboxDraftInputSchema.safeParse({
        title: '',
        description: '',
        objective: '',
        difficultyLevel: 'MEDIUM',
        emails: [{ ...draft, position: -1 }],
      }).success,
    ).toBe(false);
  });

  it('validates structured activation issues and rejects unknown fields', () => {
    const issue = {
      emailId: null,
      position: null,
      field: 'emails',
      code: 'REQUIRED',
      message: 'Add at least one email.',
    };

    expect(activationValidationIssueSchema.parse(issue)).toEqual(issue);
    expect(activationValidationIssueSchema.safeParse({ ...issue, path: ['emails'] }).success).toBe(
      false,
    );
  });

  it('accepts strict Simulated Inbox management requests', () => {
    expect(
      createSimulatedInboxDraftRequestSchema.parse({
        title: '',
        description: '',
        difficultyLevel: 'EASY',
      }),
    ).toEqual({ title: '', description: '', difficultyLevel: 'EASY' });
    expect(updateSimulatedInboxDraftRequestSchema.safeParse({ title: 'Updated' }).success).toBe(
      true,
    );
    expect(
      addLibraryEmailToSimulatedInboxRequestSchema.safeParse({
        organisationEmailId: '33333333-3333-4333-8333-333333333333',
      }).success,
    ).toBe(true);
    expect(
      reorderSimulatedInboxEmailsRequestSchema.safeParse({
        emails: [{ emailId: '22222222-2222-4222-8222-222222222222', position: 0 }],
      }).success,
    ).toBe(true);
  });

  it('parses management lifecycle filters and rejects unknown values', () => {
    expect(listSimulatedInboxesQuerySchema.parse({ lifecycleStatus: 'ACTIVE' })).toEqual({
      page: 1,
      limit: 20,
      lifecycleStatus: 'ACTIVE',
    });
    expect(listSimulatedInboxesQuerySchema.safeParse({ lifecycleStatus: 'BLOCKED' }).success).toBe(
      false,
    );
    expect(
      updateSimulatedInboxDraftRequestSchema.safeParse({ objective: 'not independently editable' })
        .success,
    ).toBe(false);
  });

  it('exposes one canonical metadata set in management detail', () => {
    const detail = {
      id: '11111111-1111-4111-8111-111111111111',
      organisationId: '22222222-2222-4222-8222-222222222222',
      createdByUserId: null,
      title: 'Inbox',
      description: 'Description',
      objective: null,
      difficultyLevel: 'MEDIUM',
      safetyStatus: 'DRAFT',
      lifecycleStatus: 'DRAFT',
      createdAt: '2026-09-15T08:00:00.000Z',
      updatedAt: '2026-09-15T08:00:00.000Z',
      inboxId: '33333333-3333-4333-8333-333333333333',
      inboxStatus: 'ARCHIVED',
      emails: [],
    };

    expect(simulatedInboxDetailSchema.safeParse(detail).success).toBe(true);
    expect(
      simulatedInboxDetailSchema.safeParse({ ...detail, inboxTitle: 'Duplicate title' }).success,
    ).toBe(false);
  });
});

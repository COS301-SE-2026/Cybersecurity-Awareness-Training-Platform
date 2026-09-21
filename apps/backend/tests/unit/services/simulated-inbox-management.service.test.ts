import type { OrganisationEmailDraftInput } from '@insightful-phish/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Repository from '../../../src/repositories/simulated-inbox-management.repository.js';
import {
  SimulatedInboxManagementServiceError,
  activateSimulatedInbox,
  addAuthoredEmailToSimulatedInbox,
  addLibraryEmailToSimulatedInbox,
  copySimulatedInbox,
  createSimulatedInboxDraft,
  getSimulatedInbox,
  updateSimulatedInboxEmail,
} from '../../../src/services/simulated-inbox-management.service.js';

vi.mock('../../../src/repositories/simulated-inbox-management.repository.js', () => ({
  listSimulatedInboxes: vi.fn(),
  findSimulatedInbox: vi.fn(),
  createSimulatedInboxDraft: vi.fn(),
  updateSimulatedInboxDraftMetadata: vi.fn(),
  addAuthoredEmailSnapshot: vi.fn(),
  addActiveLibraryEmailSnapshot: vi.fn(),
  updateSimulatedInboxSnapshot: vi.fn(),
  removeSimulatedInboxSnapshot: vi.fn(),
  reorderSimulatedInboxSnapshots: vi.fn(),
  activateSimulatedInbox: vi.fn(),
  copyActiveSimulatedInbox: vi.fn(),
}));

const scopeMock = vi.hoisted(() => {
  class MockOrganisationScopeServiceError extends Error {
    constructor(
      public readonly statusCode: 401 | 403 | 404,
      public readonly error: string,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    OrganisationScopeServiceError: MockOrganisationScopeServiceError,
    requireOrganisationAdminScope: vi.fn(),
  };
});

vi.mock('../../../src/services/organisation-scope.service.js', () => scopeMock);

const organisationId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const simulationId = '33333333-3333-4333-8333-333333333333';
const inboxId = '44444444-4444-4444-8444-444444444444';
const firstEmailId = '55555555-5555-4555-8555-555555555555';
const secondEmailId = '66666666-6666-4666-8666-666666666666';
const libraryId = '77777777-7777-4777-8777-777777777777';

function draft(overrides: Partial<OrganisationEmailDraftInput> = {}): OrganisationEmailDraftInput {
  return {
    senderLabel: 'Security Team',
    senderAddress: 'security@example.test',
    subject: 'Review',
    preview: 'Review pending',
    bodyHtml: '<p>Hello {{FIRST_NAME}}, {{SYSTEM_LINK}}</p>',
    link: { anchorText: 'review now' },
    expectedClassification: 'PHISHING',
    redFlags: [
      {
        redFlagType: 'LINK',
        label: 'Link',
        description: 'Unexpected link',
        severity: 'HIGH',
      },
    ],
    categories: ['LINKS_DOMAINS_AND_SENDER_VERIFICATION'],
    difficultyLevel: 'EASY',
    ...overrides,
  };
}

function snapshot(id: string, position: number, overrides: Record<string, unknown> = {}) {
  const content = draft();
  return {
    id,
    inboxId,
    sourceOrganisationEmailId: libraryId,
    position,
    senderLabel: content.senderLabel,
    senderAddress: content.senderAddress,
    subject: content.subject,
    preview: content.preview,
    bodyHtml: content.bodyHtml,
    linkAnchorText: content.link?.anchorText ?? null,
    simulatedLinkTarget: null,
    portalTemplateId: null,
    hasAttachment: false,
    receivedAt: new Date('2026-09-15T08:00:00.000Z'),
    expectedClassification: content.expectedClassification,
    categories: content.categories,
    difficultyLevel: content.difficultyLevel,
    createdAt: new Date('2026-09-15T08:00:00.000Z'),
    updatedAt: new Date('2026-09-15T08:00:00.000Z'),
    redFlags: content.redFlags.map((redFlag) => ({
      id: `${id}-red-flag`,
      simulatedEmailId: id,
      organisationEmailId: null,
      ...redFlag,
      createdAt: new Date('2026-09-15T08:00:00.000Z'),
      updatedAt: new Date('2026-09-15T08:00:00.000Z'),
    })),
    ...overrides,
  };
}

function simulation(overrides: Record<string, unknown> = {}) {
  return {
    id: simulationId,
    organisationId,
    createdByUserId: userId,
    simulationType: 'SIMULATED_INBOX' as const,
    title: 'Inbox exercise',
    description: 'Classify the messages',
    objective: null,
    safetyStatus: 'DRAFT' as const,
    difficultyLevel: 'MEDIUM' as const,
    createdAt: new Date('2026-09-15T08:00:00.000Z'),
    updatedAt: new Date('2026-09-15T08:00:00.000Z'),
    simulatedInbox: {
      id: inboxId,
      simulationId,
      title: 'Inbox exercise',
      description: 'Classify the messages',
      status: 'ARCHIVED' as const,
      createdAt: new Date('2026-09-15T08:00:00.000Z'),
      updatedAt: new Date('2026-09-15T08:00:00.000Z'),
      emails: [] as ReturnType<typeof snapshot>[],
    },
    ...overrides,
  };
}

describe('simulated inbox management service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scopeMock.requireOrganisationAdminScope.mockResolvedValue({
      userId,
      organisationId,
      adminProfileId: 'admin-id',
      grantedPermissions: new Set(['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS']),
    });
  });

  it('creates an empty inactive Draft with synchronised metadata', async () => {
    vi.mocked(Repository.createSimulatedInboxDraft).mockResolvedValue(simulation());

    const result = await createSimulatedInboxDraft(userId, organisationId, {
      title: '  Inbox exercise  ',
      description: '  Classify the messages  ',
      difficultyLevel: 'MEDIUM',
    });

    expect(Repository.createSimulatedInboxDraft).toHaveBeenCalledWith({
      organisationId,
      createdByUserId: userId,
      title: 'Inbox exercise',
      description: 'Classify the messages',
      difficultyLevel: 'MEDIUM',
    });
    expect(result.lifecycleStatus).toBe('DRAFT');
    expect(result.inboxStatus).toBe('ARCHIVED');
    expect(result.emails).toEqual([]);
    expect(scopeMock.requireOrganisationAdminScope).toHaveBeenCalledWith({
      userId,
      organisationId,
      requiredPermission: 'MANAGE_CAMPAIGNS',
    });
  });

  it('allows either campaign view or manage permission for management reads', async () => {
    vi.mocked(Repository.findSimulatedInbox).mockResolvedValue(simulation());

    await getSimulatedInbox(userId, organisationId, simulationId);

    expect(scopeMock.requireOrganisationAdminScope).toHaveBeenCalledWith({
      userId,
      organisationId,
      requiredAnyPermission: ['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS'],
    });
  });

  it('registers canonical authored content and creates its first snapshot in one repository use case', async () => {
    vi.mocked(Repository.addAuthoredEmailSnapshot).mockImplementation(async (input) => {
      expect(input.registration.organisationId).toBe(organisationId);
      expect(input.registration.contentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(input.isEquivalent).toEqual(expect.any(Function));
      return {
        state: 'CREATED',
        email: snapshot(firstEmailId, 0),
        sourceOrganisationEmailId: libraryId,
        libraryEmailReused: false,
      } as never;
    });

    const result = await addAuthoredEmailToSimulatedInbox(
      userId,
      organisationId,
      simulationId,
      draft(),
    );

    expect(result.email.id).toBe(firstEmailId);
    expect(result.email.position).toBe(0);
    expect(result.sourceOrganisationEmailId).toBe(libraryId);
    expect(result.libraryEmailReused).toBe(false);
  });

  it('adds only an eligible Active library record as an independent snapshot', async () => {
    vi.mocked(Repository.addActiveLibraryEmailSnapshot).mockResolvedValue({
      state: 'CREATED',
      email: snapshot(firstEmailId, 0),
      sourceOrganisationEmailId: libraryId,
      libraryEmailReused: true,
    } as never);

    const result = await addLibraryEmailToSimulatedInbox(userId, organisationId, simulationId, {
      organisationEmailId: libraryId,
    });

    expect(result.email.id).toBe(firstEmailId);
    expect(result.sourceOrganisationEmailId).toBe(libraryId);
    expect(Repository.addActiveLibraryEmailSnapshot).toHaveBeenCalledWith({
      organisationId,
      simulationId,
      organisationEmailId: libraryId,
    });
  });

  it('updates a stable snapshot identity without registering or changing source traceability', async () => {
    vi.mocked(Repository.updateSimulatedInboxSnapshot).mockImplementation(async (input) => {
      expect(input.emailId).toBe(firstEmailId);
      return {
        state: 'UPDATED',
        email: snapshot(firstEmailId, 0, {
          subject: input.draft.subject,
          sourceOrganisationEmailId: libraryId,
        }),
      } as never;
    });

    const result = await updateSimulatedInboxEmail(
      userId,
      organisationId,
      simulationId,
      firstEmailId,
      draft({ subject: 'Diverged snapshot' }),
    );

    expect(result.id).toBe(firstEmailId);
    expect(result.sourceOrganisationEmailId).toBe(libraryId);
    expect(result.subject).toBe('Diverged snapshot');
  });

  it('activates valid mixed-difficulty children through transactional final validation', async () => {
    const record = simulation();
    record.simulatedInbox.emails = [
      snapshot(firstEmailId, 0, { difficultyLevel: 'EASY' }),
      snapshot(secondEmailId, 1, { difficultyLevel: 'HARD' }),
    ];
    vi.mocked(Repository.activateSimulatedInbox).mockImplementation(async ({ validate }) => {
      expect(validate(record as never)).toEqual([]);
      return {
        state: 'ACTIVATED',
        record: simulation({
          safetyStatus: 'APPROVED',
          simulatedInbox: { ...record.simulatedInbox, status: 'ACTIVE' },
        }),
      } as never;
    });

    const result = await activateSimulatedInbox(userId, organisationId, simulationId);

    expect(result.lifecycleStatus).toBe('ACTIVE');
    expect(result.emails.map((email) => email.difficultyLevel)).toEqual(['EASY', 'HARD']);
  });

  it('returns the invalid email identity and position during activation', async () => {
    const invalid = snapshot(secondEmailId, 1, {
      senderAddress: 'invalid',
      subject: '',
      redFlags: [],
    });
    const record = simulation();
    record.simulatedInbox.emails = [snapshot(firstEmailId, 0), invalid];
    vi.mocked(Repository.activateSimulatedInbox).mockImplementation(async ({ validate }) => ({
      state: 'INVALID',
      issues: validate(record),
    }));

    await expect(
      activateSimulatedInbox(userId, organisationId, simulationId),
    ).rejects.toMatchObject({
      statusCode: 422,
      error: 'SIMULATED_INBOX_ACTIVATION_INVALID',
      issues: expect.arrayContaining([
        expect.objectContaining({
          emailId: secondEmailId,
          position: 1,
          field: 'senderAddress',
        }),
      ]),
    });
  });

  it('rejects fewer than two emails and non-contiguous ordering', async () => {
    const record = simulation();
    record.simulatedInbox.emails = [snapshot(firstEmailId, 2)];
    vi.mocked(Repository.activateSimulatedInbox).mockImplementation(async ({ validate }) => ({
      state: 'INVALID',
      issues: validate(record),
    }));

    await expect(
      activateSimulatedInbox(userId, organisationId, simulationId),
    ).rejects.toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({ code: 'MINIMUM_EMAILS' }),
        expect.objectContaining({ code: 'NON_CONTIGUOUS_POSITIONS' }),
      ]),
    });
  });

  it('enforces Active immutability', async () => {
    vi.mocked(Repository.updateSimulatedInboxSnapshot).mockResolvedValue({ state: 'ACTIVE' });

    await expect(
      updateSimulatedInboxEmail(userId, organisationId, simulationId, firstEmailId, draft()),
    ).rejects.toMatchObject({
      statusCode: 409,
      error: 'SIMULATED_INBOX_ACTIVE_IMMUTABLE',
    });
  });

  it('returns a deep-copy Draft without history projections', async () => {
    const copyId = '88888888-8888-4888-8888-888888888888';
    const copyInboxId = '99999999-9999-4999-8999-999999999999';
    vi.mocked(Repository.copyActiveSimulatedInbox).mockResolvedValue(
      simulation({
        id: copyId,
        title: 'Inbox exercise (Copy)',
        safetyStatus: 'DRAFT',
        simulatedInbox: {
          ...simulation().simulatedInbox,
          id: copyInboxId,
          simulationId: copyId,
          title: 'Inbox exercise (Copy)',
          status: 'ARCHIVED',
          emails: [snapshot('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 0)],
        },
      }),
    );

    const result = await copySimulatedInbox(userId, organisationId, simulationId);

    expect(result.id).toBe(copyId);
    expect(result.inboxId).toBe(copyInboxId);
    expect(result.title).toBe('Inbox exercise (Copy)');
    expect(result.lifecycleStatus).toBe('DRAFT');
    expect(JSON.stringify(result)).not.toContain('classificationResponses');
    expect(JSON.stringify(result)).not.toContain('interactionEvents');
  });

  it('prevents cross-organisation discovery before repository access', async () => {
    scopeMock.requireOrganisationAdminScope.mockRejectedValue(
      new scopeMock.OrganisationScopeServiceError(
        404,
        'INACCESSIBLE_ORGANISATION',
        'Inaccessible organisation',
      ),
    );

    await expect(getSimulatedInbox(userId, organisationId, simulationId)).rejects.toMatchObject({
      statusCode: 404,
      error: 'INACCESSIBLE_ORGANISATION',
    });
    expect(Repository.findSimulatedInbox).not.toHaveBeenCalled();
  });

  it('maps missing Active sources without exposing cross-organisation existence', async () => {
    vi.mocked(Repository.addActiveLibraryEmailSnapshot).mockResolvedValue({
      state: 'LIBRARY_EMAIL_NOT_FOUND',
    });

    await expect(
      addLibraryEmailToSimulatedInbox(userId, organisationId, simulationId, {
        organisationEmailId: libraryId,
      }),
    ).rejects.toBeInstanceOf(SimulatedInboxManagementServiceError);
  });
});

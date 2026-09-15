import type { OrganisationEmailDraftInput } from '@insightful-phish/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Repository from '../../../src/repositories/simulated-inbox-management.repository.js';

const organisationEmailRepositoryMock = vi.hoisted(() => ({
  registerOrganisationEmailDraftInTransaction: vi.fn(),
}));

vi.mock(
  '../../../src/repositories/organisation-email.repository.js',
  () => organisationEmailRepositoryMock,
);

const tx = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  simulation: {
    findFirst: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  simulatedInbox: { update: vi.fn() },
  simulatedEmail: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  organisationEmail: { findFirst: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
  simulation: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn((input: ((client: typeof tx) => unknown) | Promise<unknown>[]) =>
    Array.isArray(input) ? Promise.all(input) : input(tx),
  ),
}));

vi.mock('../../../src/lib/prisma.js', () => ({ prisma: prismaMock }));

const organisationId = '11111111-1111-4111-8111-111111111111';
const simulationId = '33333333-3333-4333-8333-333333333333';
const inboxId = '44444444-4444-4444-8444-444444444444';
const userId = '22222222-2222-4222-8222-222222222222';
const libraryId = '77777777-7777-4777-8777-777777777777';

const draft: OrganisationEmailDraftInput = {
  senderLabel: 'Security',
  senderAddress: 'security@example.test',
  subject: 'Review',
  preview: 'Review pending',
  bodyHtml: '<p>{{SYSTEM_LINK}}</p>',
  link: { anchorText: 'Review' },
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
  difficultyLevel: 'HARD',
};

function parent(status: 'DRAFT' | 'APPROVED' = 'DRAFT') {
  return {
    id: simulationId,
    organisationId,
    createdByUserId: userId,
    simulationType: 'SIMULATED_INBOX',
    title: 'Exercise',
    description: 'Description',
    objective: null,
    safetyStatus: status,
    difficultyLevel: 'MEDIUM',
    createdAt: new Date(),
    updatedAt: new Date(),
    simulatedInbox: {
      id: inboxId,
      simulationId,
      title: 'Exercise',
      description: 'Description',
      status: status === 'DRAFT' ? 'ARCHIVED' : 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      emails: [
        { id: 'email-1', position: 0 },
        { id: 'email-2', position: 1 },
      ],
    },
  };
}

function libraryRecord() {
  return {
    id: libraryId,
    organisationId,
    createdByUserId: userId,
    senderLabel: draft.senderLabel,
    senderAddress: draft.senderAddress,
    subject: draft.subject,
    preview: draft.preview,
    bodyHtml: draft.bodyHtml,
    linkAnchorText: draft.link?.anchorText ?? null,
    expectedClassification: draft.expectedClassification,
    categories: draft.categories,
    difficultyLevel: draft.difficultyLevel,
    contentHash: 'a'.repeat(64),
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    redFlags: draft.redFlags.map((redFlag) => ({
      id: 'library-red-flag',
      simulatedEmailId: null,
      organisationEmailId: libraryId,
      ...redFlag,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };
}

describe('simulated inbox management repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((input) =>
      Array.isArray(input) ? Promise.all(input) : input(tx),
    );
  });

  it('creates an empty Draft with its nested Inbox inactive and metadata synchronised', async () => {
    prismaMock.simulation.create.mockResolvedValue(parent());

    await Repository.createSimulatedInboxDraft({
      organisationId,
      createdByUserId: userId,
      title: 'Exercise',
      description: 'Description',
      difficultyLevel: 'MEDIUM',
    });

    expect(prismaMock.simulation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Exercise',
          description: 'Description',
          safetyStatus: 'DRAFT',
          simulatedInbox: {
            create: {
              title: 'Exercise',
              description: 'Description',
              status: 'ARCHIVED',
            },
          },
        }),
      }),
    );
  });

  it('lists only organisation-owned Draft or approved Active Inbox identities', async () => {
    prismaMock.simulation.findMany.mockResolvedValue([]);
    prismaMock.simulation.count.mockResolvedValue(0);
    await Repository.listSimulatedInboxes({
      organisationId,
      page: 1,
      limit: 20,
      search: 'invoice',
    });

    expect(prismaMock.simulation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organisationId,
          simulationType: 'SIMULATED_INBOX',
          AND: expect.arrayContaining([
            {
              OR: [
                { safetyStatus: 'DRAFT' },
                { safetyStatus: 'APPROVED', simulatedInbox: { status: 'ACTIVE' } },
              ],
            },
          ]),
        }),
      }),
    );
  });

  it('reads only organisation-owned Draft or approved Active Inbox identities', async () => {
    prismaMock.simulation.findFirst.mockResolvedValue(parent());

    await Repository.findSimulatedInbox(organisationId, simulationId);

    expect(prismaMock.simulation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: simulationId,
          organisationId,
          simulationType: 'SIMULATED_INBOX',
          OR: [
            { safetyStatus: 'DRAFT' },
            { safetyStatus: 'APPROVED', simulatedInbox: { status: 'ACTIVE' } },
          ],
        },
      }),
    );
  });

  it('registers/reuses library content and creates its snapshot in the same transaction', async () => {
    tx.simulation.findFirst.mockResolvedValue(parent());
    organisationEmailRepositoryMock.registerOrganisationEmailDraftInTransaction.mockResolvedValue({
      record: libraryRecord(),
      reused: false,
    });
    tx.simulatedEmail.create.mockResolvedValue({ id: 'email-3', position: 2 });

    const result = await Repository.addAuthoredEmailSnapshot({
      organisationId,
      simulationId,
      registration: {
        organisationId,
        createdByUserId: userId,
        draft,
        contentHash: 'a'.repeat(64),
      },
      isEquivalent: () => true,
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(
      organisationEmailRepositoryMock.registerOrganisationEmailDraftInTransaction,
    ).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ contentHash: 'a'.repeat(64) }),
      expect.any(Function),
    );
    expect(tx.simulatedEmail.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceOrganisationEmailId: libraryId,
          position: 2,
          senderLabel: draft.senderLabel,
          bodyHtml: draft.bodyHtml,
        }),
      }),
    );
    expect(result.state).toBe('CREATED');
  });

  it('copies only an organisation-owned ACTIVE library email into independent nested creates', async () => {
    tx.simulation.findFirst.mockResolvedValue(parent());
    tx.organisationEmail.findFirst.mockResolvedValue(libraryRecord());
    tx.simulatedEmail.create.mockResolvedValue({ id: 'email-3', position: 2 });

    await Repository.addActiveLibraryEmailSnapshot({
      organisationId,
      simulationId,
      organisationEmailId: libraryId,
    });

    expect(tx.organisationEmail.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: libraryId, organisationId, status: 'ACTIVE' },
      }),
    );
    expect(tx.simulatedEmail.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceOrganisationEmailId: libraryId,
          redFlags: {
            create: [
              {
                redFlagType: 'LINK',
                label: 'Link',
                description: 'Unexpected link',
                severity: 'HIGH',
              },
            ],
          },
        }),
      }),
    );
  });

  it('updates a snapshot in place without changing source traceability', async () => {
    tx.simulation.findFirst.mockResolvedValue(parent());
    tx.simulatedEmail.findFirst.mockResolvedValue({
      id: 'email-1',
      sourceOrganisationEmailId: libraryId,
    });
    tx.simulatedEmail.update.mockResolvedValue({ id: 'email-1' });

    await Repository.updateSimulatedInboxSnapshot({
      organisationId,
      simulationId,
      emailId: 'email-1',
      draft: { ...draft, subject: 'Diverged' },
    });

    const update = tx.simulatedEmail.update.mock.calls[0]?.[0];
    expect(update.where).toEqual({ id: 'email-1' });
    expect(update.data.subject).toBe('Diverged');
    expect(update.data).not.toHaveProperty('sourceOrganisationEmailId');
    expect(update.data).not.toHaveProperty('id');
  });

  it('reorders stable IDs using collision-safe temporary positions', async () => {
    tx.simulation.findFirst.mockResolvedValue(parent());
    tx.simulation.findUniqueOrThrow.mockResolvedValue(parent());

    const result = await Repository.reorderSimulatedInboxSnapshots({
      organisationId,
      simulationId,
      order: [
        { emailId: 'email-2', position: 0 },
        { emailId: 'email-1', position: 1 },
      ],
    });

    expect(tx.simulatedEmail.updateMany).toHaveBeenCalledWith({
      where: { inboxId },
      data: { position: { increment: 4 } },
    });
    expect(tx.simulatedEmail.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'email-2' },
      data: { position: 0 },
    });
    expect(tx.simulatedEmail.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'email-1' },
      data: { position: 1 },
    });
    expect(result.state).toBe('REORDERED');
  });

  it('removes one snapshot and compacts following positions without recreating children', async () => {
    tx.simulation.findFirst.mockResolvedValue(parent());

    const result = await Repository.removeSimulatedInboxSnapshot({
      organisationId,
      simulationId,
      emailId: 'email-1',
    });

    expect(tx.simulatedEmail.delete).toHaveBeenCalledWith({ where: { id: 'email-1' } });
    expect(tx.simulatedEmail.updateMany).toHaveBeenNthCalledWith(1, {
      where: { inboxId, position: { gt: 0 } },
      data: { position: { increment: 3 } },
    });
    expect(tx.simulatedEmail.updateMany).toHaveBeenNthCalledWith(2, {
      where: { inboxId, position: { gt: 3 } },
      data: { position: { decrement: 4 } },
    });
    expect(tx.simulatedEmail.create).not.toHaveBeenCalled();
    expect(result.state).toBe('REMOVED');
  });

  it('runs final validation inside the locked activation transaction', async () => {
    const managementRecord = {
      ...parent(),
      simulatedInbox: {
        ...parent().simulatedInbox,
        emails: [],
      },
    };
    tx.simulation.findFirst.mockResolvedValue(managementRecord);
    const validate = vi.fn(() => [{ field: 'emails' }]);

    const result = await Repository.activateSimulatedInbox({
      organisationId,
      simulationId,
      validate: validate as never,
    });

    expect(tx.$executeRaw).toHaveBeenCalledBefore(validate);
    expect(validate).toHaveBeenCalledWith(managementRecord);
    expect(result.state).toBe('INVALID');
    expect(tx.simulation.update).not.toHaveBeenCalled();
    expect(tx.simulatedInbox.update).not.toHaveBeenCalled();
  });

  it('atomically creates the APPROVED and ACTIVE catalogue combination', async () => {
    const active = {
      ...parent('APPROVED'),
      simulatedInbox: { ...parent('APPROVED').simulatedInbox, emails: [] },
    };
    tx.simulation.findFirst.mockResolvedValue({
      ...parent(),
      simulatedInbox: { ...parent().simulatedInbox, emails: [] },
    });
    tx.simulation.findUniqueOrThrow.mockResolvedValue(active);

    const result = await Repository.activateSimulatedInbox({
      organisationId,
      simulationId,
      validate: () => [],
    });

    expect(tx.simulation.update).toHaveBeenCalledWith({
      where: { id: simulationId },
      data: { safetyStatus: 'APPROVED' },
    });
    expect(tx.simulatedInbox.update).toHaveBeenCalledWith({
      where: { id: inboxId },
      data: { status: 'ACTIVE' },
    });
    expect(result.state).toBe('ACTIVATED');
  });

  it('deep-copies authored snapshots without campaign or execution history relations', async () => {
    const source = {
      ...parent('APPROVED'),
      simulatedInbox: {
        ...parent('APPROVED').simulatedInbox,
        emails: [
          {
            ...libraryRecord(),
            id: 'email-1',
            inboxId,
            sourceOrganisationEmailId: libraryId,
            position: 0,
            linkAnchorText: 'Review',
            simulatedLinkTarget: null,
            hasAttachment: false,
            receivedAt: new Date(),
            redFlags: libraryRecord().redFlags,
          },
        ],
      },
    };
    tx.simulation.findFirst.mockResolvedValue(source);
    tx.simulation.create.mockResolvedValue({ id: 'copy-id' });

    await Repository.copyActiveSimulatedInbox({
      organisationId,
      simulationId,
      createdByUserId: userId,
    });

    const create = tx.simulation.create.mock.calls[0]?.[0];
    expect(create.data.title).toBe('Exercise (Copy)');
    expect(create.data.safetyStatus).toBe('DRAFT');
    expect(create.data.simulatedInbox.create.status).toBe('ARCHIVED');
    expect(create.data.simulatedInbox.create.emails.create[0]).toEqual(
      expect.objectContaining({
        sourceOrganisationEmailId: libraryId,
        position: 0,
        difficultyLevel: 'HARD',
      }),
    );
    expect(JSON.stringify(create)).not.toContain('campaignItems');
    expect(JSON.stringify(create)).not.toContain('classificationResponses');
    expect(JSON.stringify(create)).not.toContain('interactionEvents');
  });
});

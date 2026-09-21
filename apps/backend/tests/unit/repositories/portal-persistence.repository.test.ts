import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  ManagedPortalLinkOccurrenceConflictError,
  ManagedPortalLinkTokenHashConflictError,
  PortalInteractionEventIdempotencyConflictError,
  createFirstPortalInteractionEvent,
  createManagedPortalLink,
  createPortalInteractionEvent,
  findManagedPortalLinkById,
  findManagedPortalLinkByOccurrence,
  findManagedPortalLinkByTokenHash,
  findManagedPortalLinkResolutionByTokenHash,
  findPortalInteractionEvents,
  setManagedPortalLinkRevokedAt,
} from '../../../src/repositories/portal-persistence.repository.js';

const prismaMock = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  $transaction: vi.fn(),
  managedPortalLink: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  portalInteractionEvent: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('../../../src/lib/prisma.js', () => ({ prisma: prismaMock }));

const createdAt = new Date('2026-09-21T08:00:00.000Z');
const expiresAt = new Date('2026-09-22T08:00:00.000Z');
const revokedAt = new Date('2026-09-21T12:00:00.000Z');
const occurredAt = new Date('2026-09-21T09:00:00.000Z');

function managedLinkRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'link-1',
    tokenHash: 'sha256:managed-link',
    tokenCiphertext: 'v1.encrypted-token',
    purpose: 'PHISHING_PORTAL',
    portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
    traineeProfileId: 'trainee-1',
    organisationId: 'organisation-1',
    campaignAssignmentId: 'assignment-1',
    campaignItemId: 'item-1',
    simulatedEmailId: 'email-1',
    expiresAt,
    revokedAt: null,
    createdAt,
    ...overrides,
  };
}

function eventRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    managedPortalLinkId: 'link-1',
    eventType: 'PORTAL_VISITED',
    clientEventId: 'client-event-1',
    occurredAt,
    ...overrides,
  };
}

function managedLinkResolutionRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'link-1',
    purpose: 'PHISHING_PORTAL',
    portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
    traineeProfileId: 'trainee-1',
    organisationId: 'organisation-1',
    campaignAssignmentId: 'assignment-1',
    campaignItemId: 'item-1',
    simulatedEmailId: 'email-1',
    expiresAt,
    revokedAt: null,
    traineeProfile: {
      id: 'trainee-1',
      traineeStatus: 'ACTIVE',
      user: { authStatus: 'ACTIVE' },
      organisationTraineeProfile: {
        organisationId: 'organisation-1',
        membershipStatus: 'ACTIVE',
      },
      generalTraineeProfile: null,
    },
    organisation: { id: 'organisation-1', status: 'ACTIVE' },
    campaignAssignment: {
      id: 'assignment-1',
      campaignId: 'campaign-1',
      traineeProfileId: 'trainee-1',
      assignmentStatus: 'ASSIGNED',
      accessType: 'ASSIGNED',
      campaign: {
        id: 'campaign-1',
        organisationId: 'organisation-1',
        campaignType: 'ORGANISATION_CUSTOM',
        status: 'ACTIVE',
        startDate: new Date('2026-09-20T08:00:00.000Z'),
        endDate: new Date('2026-09-23T08:00:00.000Z'),
      },
    },
    campaignItem: {
      id: 'item-1',
      campaignId: 'campaign-1',
      itemType: 'COMPONENT',
      componentType: 'SIMULATED_INBOX',
      availabilityStatus: 'AVAILABLE',
      simulationId: 'simulation-1',
    },
    simulatedEmail: {
      id: 'email-1',
      inboxId: 'inbox-1',
      portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
      redFlags: [
        { label: 'Unexpected sender', description: 'The sender was not expected.' },
        { label: 'Urgent request', description: null },
      ],
      inbox: {
        id: 'inbox-1',
        simulationId: 'simulation-1',
        status: 'ACTIVE',
        simulation: {
          id: 'simulation-1',
          organisationId: 'organisation-1',
          simulationType: 'SIMULATED_INBOX',
          safetyStatus: 'APPROVED',
        },
      },
    },
    ...overrides,
  };
}

describe('portal persistence repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock),
    );
  });

  it('creates and maps a purpose-bound Simulated Inbox managed link', async () => {
    prismaMock.managedPortalLink.create.mockResolvedValue(managedLinkRecord());

    const record = await createManagedPortalLink({
      tokenHash: 'sha256:managed-link',
      tokenCiphertext: 'v1.encrypted-token',
      portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
      traineeProfileId: 'trainee-1',
      organisationId: 'organisation-1',
      context: {
        channel: 'SIMULATED_INBOX',
        campaignAssignmentId: 'assignment-1',
        campaignItemId: 'item-1',
        simulatedEmailId: 'email-1',
      },
      expiresAt,
    });

    expect(prismaMock.managedPortalLink.create).toHaveBeenCalledWith({
      data: {
        tokenHash: 'sha256:managed-link',
        tokenCiphertext: 'v1.encrypted-token',
        purpose: 'PHISHING_PORTAL',
        portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        traineeProfileId: 'trainee-1',
        organisationId: 'organisation-1',
        campaignAssignmentId: 'assignment-1',
        campaignItemId: 'item-1',
        simulatedEmailId: 'email-1',
        expiresAt,
        revokedAt: null,
      },
    });
    expect(record).toEqual({
      id: 'link-1',
      tokenHash: 'sha256:managed-link',
      purpose: 'PHISHING_PORTAL',
      portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
      traineeProfileId: 'trainee-1',
      organisationId: 'organisation-1',
      context: {
        channel: 'SIMULATED_INBOX',
        campaignAssignmentId: 'assignment-1',
        campaignItemId: 'item-1',
        simulatedEmailId: 'email-1',
      },
      expiresAt: '2026-09-22T08:00:00.000Z',
      revokedAt: null,
      createdAt: '2026-09-21T08:00:00.000Z',
    });
    expect(JSON.stringify(prismaMock.managedPortalLink.create.mock.calls)).not.toContain(
      'rawToken',
    );
  });

  it('maps nullable organisation ownership and revocation timestamps', async () => {
    prismaMock.managedPortalLink.findUnique.mockResolvedValue(
      managedLinkRecord({ organisationId: null, revokedAt }),
    );

    const record = await findManagedPortalLinkByTokenHash('sha256:managed-link');

    expect(prismaMock.managedPortalLink.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: 'sha256:managed-link' },
    });
    expect(record?.organisationId).toBeNull();
    expect(record?.revokedAt).toBe('2026-09-21T12:00:00.000Z');
  });

  it('loads and maps the narrow source facts required for managed-link resolution', async () => {
    prismaMock.managedPortalLink.findUnique.mockResolvedValue(managedLinkResolutionRecord());

    const facts = await findManagedPortalLinkResolutionByTokenHash('sha256:managed-link');

    expect(prismaMock.managedPortalLink.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: 'sha256:managed-link' },
      select: expect.objectContaining({
        id: true,
        purpose: true,
        portalTemplateId: true,
        traineeProfile: expect.any(Object),
        campaignAssignment: expect.any(Object),
        campaignItem: expect.any(Object),
        simulatedEmail: expect.any(Object),
      }),
    });
    const resolutionSelect = prismaMock.managedPortalLink.findUnique.mock.calls[0]?.[0]?.select;
    expect(resolutionSelect.simulatedEmail.select.redFlags).toEqual({
      orderBy: [
        { redFlagType: 'asc' },
        { label: 'asc' },
        { description: 'asc' },
        { severity: 'asc' },
        { id: 'asc' },
      ],
      select: { label: true, description: true },
    });
    expect(resolutionSelect.simulatedEmail.select).not.toHaveProperty('sourceOrganisationEmail');
    expect(facts).toMatchObject({
      id: 'link-1',
      purpose: 'PHISHING_PORTAL',
      portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
      context: {
        channel: 'SIMULATED_INBOX',
        campaignAssignmentId: 'assignment-1',
        campaignItemId: 'item-1',
        simulatedEmailId: 'email-1',
      },
      traineeProfile: {
        userAuthStatus: 'ACTIVE',
        hasGeneralProfile: false,
      },
      simulatedEmail: {
        portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        redFlags: [
          { label: 'Unexpected sender', description: 'The sender was not expected.' },
          { label: 'Urgent request', description: null },
        ],
        inbox: { simulation: { safetyStatus: 'APPROVED' } },
      },
    });
    expect(facts).not.toHaveProperty('tokenHash');
  });

  it('returns null when no managed-link resolution facts exist', async () => {
    prismaMock.managedPortalLink.findUnique.mockResolvedValue(null);

    await expect(findManagedPortalLinkResolutionByTokenHash('sha256:missing')).resolves.toBeNull();
  });

  it('maps only token-hash uniqueness failures to a collision error', async () => {
    prismaMock.managedPortalLink.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['tokenHash'] },
    });

    await expect(
      createManagedPortalLink({
        tokenHash: 'sha256:duplicate',
        tokenCiphertext: 'v1.encrypted-token',
        portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        traineeProfileId: 'trainee-1',
        organisationId: null,
        context: {
          channel: 'SIMULATED_INBOX',
          campaignAssignmentId: 'assignment-1',
          campaignItemId: 'item-1',
          simulatedEmailId: 'email-1',
        },
        expiresAt,
      }),
    ).rejects.toBeInstanceOf(ManagedPortalLinkTokenHashConflictError);
  });

  it('does not map unrelated managed-link persistence failures as token collisions', async () => {
    const unrelatedUniqueError = { code: 'P2002', meta: { target: ['campaignItemId'] } };
    prismaMock.managedPortalLink.create.mockRejectedValueOnce(unrelatedUniqueError);

    await expect(
      createManagedPortalLink({
        tokenHash: 'sha256:managed-link',
        tokenCiphertext: 'v1.encrypted-token',
        portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        traineeProfileId: 'trainee-1',
        organisationId: null,
        context: {
          channel: 'SIMULATED_INBOX',
          campaignAssignmentId: 'assignment-1',
          campaignItemId: 'item-1',
          simulatedEmailId: 'email-1',
        },
        expiresAt,
      }),
    ).rejects.toBe(unrelatedUniqueError);

    const foreignKeyError = { code: 'P2003' };
    prismaMock.managedPortalLink.create.mockRejectedValueOnce(foreignKeyError);

    await expect(
      createManagedPortalLink({
        tokenHash: 'sha256:managed-link',
        tokenCiphertext: 'v1.encrypted-token',
        portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        traineeProfileId: 'trainee-1',
        organisationId: null,
        context: {
          channel: 'SIMULATED_INBOX',
          campaignAssignmentId: 'assignment-1',
          campaignItemId: 'item-1',
          simulatedEmailId: 'email-1',
        },
        expiresAt,
      }),
    ).rejects.toBe(foreignKeyError);
  });

  it('maps only the occurrence uniqueness constraint to an occurrence conflict', async () => {
    prismaMock.managedPortalLink.create.mockRejectedValue({
      code: 'P2002',
      meta: {
        target: ['campaignAssignmentId', 'campaignItemId', 'simulatedEmailId'],
      },
    });

    await expect(
      createManagedPortalLink({
        tokenHash: 'sha256:new-token',
        tokenCiphertext: 'v1.encrypted-token',
        portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        traineeProfileId: 'trainee-1',
        organisationId: null,
        context: {
          channel: 'SIMULATED_INBOX',
          campaignAssignmentId: 'assignment-1',
          campaignItemId: 'item-1',
          simulatedEmailId: 'email-1',
        },
        expiresAt,
      }),
    ).rejects.toBeInstanceOf(ManagedPortalLinkOccurrenceConflictError);
  });

  it('finds the encrypted capability by stable occurrence without exposing it publicly', async () => {
    prismaMock.managedPortalLink.findUnique.mockResolvedValue(managedLinkRecord());

    const record = await findManagedPortalLinkByOccurrence({
      channel: 'SIMULATED_INBOX',
      campaignAssignmentId: 'assignment-1',
      campaignItemId: 'item-1',
      simulatedEmailId: 'email-1',
    });

    expect(prismaMock.managedPortalLink.findUnique).toHaveBeenCalledWith({
      where: {
        campaignAssignmentId_campaignItemId_simulatedEmailId: {
          campaignAssignmentId: 'assignment-1',
          campaignItemId: 'item-1',
          simulatedEmailId: 'email-1',
        },
      },
      select: expect.objectContaining({ tokenHash: true, tokenCiphertext: true }),
    });
    expect(record).toMatchObject({
      id: 'link-1',
      tokenHash: 'sha256:managed-link',
      tokenCiphertext: 'v1.encrypted-token',
      context: {
        channel: 'SIMULATED_INBOX',
        campaignAssignmentId: 'assignment-1',
        campaignItemId: 'item-1',
        simulatedEmailId: 'email-1',
      },
    });
  });

  it('finds a managed link by ID and returns null when absent', async () => {
    prismaMock.managedPortalLink.findUnique
      .mockResolvedValueOnce(managedLinkRecord())
      .mockResolvedValueOnce(null);

    await expect(findManagedPortalLinkById('link-1')).resolves.toMatchObject({ id: 'link-1' });
    await expect(findManagedPortalLinkById('missing-link')).resolves.toBeNull();
    expect(prismaMock.managedPortalLink.findUnique).toHaveBeenNthCalledWith(1, {
      where: { id: 'link-1' },
    });
  });

  it('persists an instructed revocation timestamp', async () => {
    prismaMock.managedPortalLink.update.mockResolvedValue(managedLinkRecord({ revokedAt }));

    const record = await setManagedPortalLinkRevokedAt({ id: 'link-1', revokedAt });

    expect(prismaMock.managedPortalLink.update).toHaveBeenCalledWith({
      where: { id: 'link-1' },
      data: { revokedAt },
    });
    expect(record.revokedAt).toBe('2026-09-21T12:00:00.000Z');
  });

  it('creates factual server events with a null client event identifier', async () => {
    prismaMock.portalInteractionEvent.create.mockResolvedValue(
      eventRecord({ eventType: 'MANAGED_LINK_REQUESTED', clientEventId: null }),
    );

    const result = await createPortalInteractionEvent({
      managedPortalLinkId: 'link-1',
      eventType: 'MANAGED_LINK_REQUESTED',
      clientEventId: null,
      occurredAt,
    });

    expect(prismaMock.portalInteractionEvent.create).toHaveBeenCalledWith({
      data: {
        managedPortalLinkId: 'link-1',
        eventType: 'MANAGED_LINK_REQUESTED',
        clientEventId: null,
        occurredAt,
      },
    });
    expect(result).toEqual({
      created: true,
      record: {
        id: 'event-1',
        managedPortalLinkId: 'link-1',
        eventType: 'MANAGED_LINK_REQUESTED',
        clientEventId: null,
        occurredAt: '2026-09-21T09:00:00.000Z',
      },
    });
  });

  it('creates browser events with client event identifiers', async () => {
    prismaMock.portalInteractionEvent.create.mockResolvedValue(eventRecord());

    const result = await createPortalInteractionEvent({
      managedPortalLinkId: 'link-1',
      eventType: 'PORTAL_VISITED',
      clientEventId: 'client-event-1',
    });

    expect(result.created).toBe(true);
    expect(result.record.clientEventId).toBe('client-event-1');
  });

  it('maps a same-link browser retry to the existing factual event', async () => {
    prismaMock.portalInteractionEvent.create.mockRejectedValue({ code: 'P2002' });
    prismaMock.portalInteractionEvent.findUnique.mockResolvedValue(eventRecord());

    const result = await createPortalInteractionEvent({
      managedPortalLinkId: 'link-1',
      eventType: 'PORTAL_VISITED',
      clientEventId: 'client-event-1',
    });

    expect(prismaMock.portalInteractionEvent.findUnique).toHaveBeenCalledWith({
      where: {
        managedPortalLinkId_clientEventId: {
          managedPortalLinkId: 'link-1',
          clientEventId: 'client-event-1',
        },
      },
    });
    expect(result.created).toBe(false);
    expect(result.record.id).toBe('event-1');
  });

  it('rejects reuse of a client event identifier for a different factual event', async () => {
    prismaMock.portalInteractionEvent.create.mockRejectedValue({ code: 'P2002' });
    prismaMock.portalInteractionEvent.findUnique.mockResolvedValue(
      eventRecord({ eventType: 'PORTAL_IDENTIFIER_FIELD_INTERACTED' }),
    );

    await expect(
      createPortalInteractionEvent({
        managedPortalLinkId: 'link-1',
        eventType: 'PORTAL_VISITED',
        clientEventId: 'client-event-1',
      }),
    ).rejects.toBeInstanceOf(PortalInteractionEventIdempotencyConflictError);
  });

  it('does not swallow unrelated persistence failures', async () => {
    const error = { code: 'P2003' };
    prismaMock.portalInteractionEvent.create.mockRejectedValue(error);

    await expect(
      createPortalInteractionEvent({
        managedPortalLinkId: 'link-1',
        eventType: 'PORTAL_VISITED',
        clientEventId: 'client-event-1',
      }),
    ).rejects.toBe(error);
  });

  it('atomically creates the first event of a factual type under an advisory lock', async () => {
    prismaMock.portalInteractionEvent.findFirst.mockResolvedValue(null);
    prismaMock.portalInteractionEvent.create.mockResolvedValue(eventRecord());

    const result = await createFirstPortalInteractionEvent({
      managedPortalLinkId: 'link-1',
      eventType: 'PORTAL_VISITED',
      clientEventId: 'client-event-1',
      occurredAt,
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.portalInteractionEvent.findFirst).toHaveBeenCalledWith({
      where: {
        managedPortalLinkId: 'link-1',
        eventType: 'PORTAL_VISITED',
      },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
    expect(prismaMock.portalInteractionEvent.create).toHaveBeenCalledWith({
      data: {
        managedPortalLinkId: 'link-1',
        eventType: 'PORTAL_VISITED',
        clientEventId: 'client-event-1',
        occurredAt,
      },
    });
    expect(result.created).toBe(true);
  });

  it('returns the existing first-occurrence fact without inserting a duplicate', async () => {
    prismaMock.portalInteractionEvent.findFirst.mockResolvedValue(eventRecord());

    const result = await createFirstPortalInteractionEvent({
      managedPortalLinkId: 'link-1',
      eventType: 'PORTAL_VISITED',
      clientEventId: 'later-client-event',
      occurredAt,
    });

    expect(result).toEqual({
      created: false,
      record: {
        id: 'event-1',
        managedPortalLinkId: 'link-1',
        eventType: 'PORTAL_VISITED',
        clientEventId: 'client-event-1',
        occurredAt: '2026-09-21T09:00:00.000Z',
      },
    });
    expect(prismaMock.portalInteractionEvent.create).not.toHaveBeenCalled();
  });

  it('reads events in deterministic occurrence order without payload surfaces', async () => {
    prismaMock.portalInteractionEvent.findMany.mockResolvedValue([
      eventRecord(),
      eventRecord({
        id: 'event-2',
        eventType: 'PORTAL_CREDENTIAL_FIELD_INTERACTED',
        clientEventId: 'client-event-2',
      }),
    ]);

    const records = await findPortalInteractionEvents('link-1');

    expect(prismaMock.portalInteractionEvent.findMany).toHaveBeenCalledWith({
      where: { managedPortalLinkId: 'link-1' },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
    expect(records).toHaveLength(2);
    expect(Object.keys(records[0] ?? {}).sort()).toEqual(
      ['clientEventId', 'eventType', 'id', 'managedPortalLinkId', 'occurredAt'].sort(),
    );
  });
});

import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  ManagedPortalLinkIdConflictError,
  ManagedPortalLinkOccurrenceConflictError,
  ManagedPortalLinkTokenHashConflictError,
  PortalInteractionEventIdempotencyConflictError,
  createFirstPortalInteractionEvent,
  createManagedPortalLink,
  createPortalInteractionEvent,
  findOrganisationCampaignForPortalReporting,
  findManagedPortalLinkById,
  findManagedPortalLinkByOccurrence,
  findManagedPortalLinkByTokenHash,
  findManagedPortalLinkResolutionByTokenHash,
  findPortalInteractionEvents,
  readCampaignPortalReportingFacts,
  setManagedPortalLinkRevokedAt,
} from '../../../src/repositories/portal-persistence.repository.js';

const prismaMock = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
  campaign: {
    findFirst: vi.fn(),
  },
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

function campaignReportingRow(overrides: Record<string, unknown> = {}) {
  return {
    managedPortalLinkId: 'link-1',
    traineeProfileId: 'trainee-1',
    campaignAssignmentId: 'assignment-1',
    campaignItemId: 'item-1',
    simulatedEmailId: 'email-1',
    eventType: 'MANAGED_LINK_REQUESTED',
    occurredAt,
    ...overrides,
  };
}

function managedLinkRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'link-1',
    tokenHash: 'sha256:managed-link',
    publicOrigin: 'https://simulation-one.test',
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
    publicOrigin: 'https://simulation-one.test',
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
      id: 'link-1',
      tokenHash: 'sha256:managed-link',
      publicOrigin: 'https://simulation-one.test',
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
        id: 'link-1',
        tokenHash: 'sha256:managed-link',
        publicOrigin: 'https://simulation-one.test',
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
      publicOrigin: 'https://simulation-one.test',
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
    expect(record?.publicOrigin).toBe('https://simulation-one.test');
    expect(record?.revokedAt).toBe('2026-09-21T12:00:00.000Z');
  });

  it('loads and maps the narrow source facts required for managed-link resolution', async () => {
    prismaMock.managedPortalLink.findUnique.mockResolvedValue(managedLinkResolutionRecord());

    const facts = await findManagedPortalLinkResolutionByTokenHash('sha256:managed-link');

    expect(prismaMock.managedPortalLink.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: 'sha256:managed-link' },
      select: expect.objectContaining({
        id: true,
        publicOrigin: true,
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
      publicOrigin: 'https://simulation-one.test',
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
        id: 'link-duplicate',
        tokenHash: 'sha256:duplicate',
        publicOrigin: 'https://simulation-one.test',
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

  it('maps Prisma adapter token-hash constraint details to a collision error', async () => {
    prismaMock.managedPortalLink.create.mockRejectedValue({
      code: 'P2002',
      meta: {
        driverAdapterError: {
          cause: {
            kind: 'UniqueConstraintViolation',
            constraint: { fields: ['"tokenHash"'] },
            originalMessage:
              'duplicate key value violates unique constraint "ManagedPortalLink_tokenHash_key"',
          },
        },
      },
    });

    await expect(
      createManagedPortalLink({
        id: 'link-duplicate',
        tokenHash: 'sha256:duplicate',
        publicOrigin: 'https://simulation-one.test',
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

  it('maps only the managed-link primary key to an identifier collision error', async () => {
    prismaMock.managedPortalLink.create.mockRejectedValue({
      code: 'P2002',
      meta: {
        driverAdapterError: {
          cause: {
            kind: 'UniqueConstraintViolation',
            constraint: { fields: ['"id"'] },
            originalMessage:
              'duplicate key value violates unique constraint "ManagedPortalLink_pkey"',
          },
        },
      },
    });

    await expect(
      createManagedPortalLink({
        id: 'duplicate-link-id',
        tokenHash: 'sha256:new-token',
        publicOrigin: 'https://simulation-one.test',
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
    ).rejects.toBeInstanceOf(ManagedPortalLinkIdConflictError);
  });

  it('does not map unrelated managed-link persistence failures as token collisions', async () => {
    const unrelatedUniqueError = { code: 'P2002', meta: { target: ['campaignItemId'] } };
    prismaMock.managedPortalLink.create.mockRejectedValueOnce(unrelatedUniqueError);

    await expect(
      createManagedPortalLink({
        id: 'link-1',
        tokenHash: 'sha256:managed-link',
        publicOrigin: 'https://simulation-one.test',
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
        id: 'link-1',
        tokenHash: 'sha256:managed-link',
        publicOrigin: 'https://simulation-one.test',
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
        id: 'link-new',
        tokenHash: 'sha256:new-token',
        publicOrigin: 'https://simulation-one.test',
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

  it('maps Prisma adapter occurrence constraint details without hiding other failures', async () => {
    prismaMock.managedPortalLink.create.mockRejectedValue({
      code: 'P2002',
      meta: {
        driverAdapterError: {
          cause: {
            kind: 'UniqueConstraintViolation',
            constraint: {
              fields: ['"campaignAssignmentId"', '"campaignItemId"', '"simulatedEmailId"'],
            },
            originalMessage:
              'duplicate key value violates unique constraint "ManagedPortalLink_occurrence_key"',
          },
        },
      },
    });

    await expect(
      createManagedPortalLink({
        id: 'link-new',
        tokenHash: 'sha256:new-token',
        publicOrigin: 'https://simulation-one.test',
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

  it('finds only the internal ID and token hash needed to restore a stable occurrence URL', async () => {
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
      select: expect.objectContaining({ id: true, tokenHash: true, publicOrigin: true }),
    });
    expect(record).toMatchObject({
      id: 'link-1',
      tokenHash: 'sha256:managed-link',
      publicOrigin: 'https://simulation-one.test',
      context: {
        channel: 'SIMULATED_INBOX',
        campaignAssignmentId: 'assignment-1',
        campaignItemId: 'item-1',
        simulatedEmailId: 'email-1',
      },
    });
    expect(record).not.toHaveProperty('tokenCiphertext');
  });

  it('finds a managed link by ID and returns null when absent', async () => {
    prismaMock.managedPortalLink.findUnique
      .mockResolvedValueOnce(managedLinkRecord())
      .mockResolvedValueOnce(null);

    await expect(findManagedPortalLinkById('link-1')).resolves.toMatchObject({
      id: 'link-1',
      publicOrigin: 'https://simulation-one.test',
    });
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
    expect(record.publicOrigin).toBe('https://simulation-one.test');
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
    expect(prismaMock.managedPortalLink.update).not.toHaveBeenCalled();
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

  it('scopes Campaign reporting facts to one organisation Campaign and consistent occurrence', async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    await readCampaignPortalReportingFacts({
      organisationId: 'organisation-1',
      campaignId: 'campaign-1',
    });

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    const call = prismaMock.$queryRaw.mock.calls[0] ?? [];
    const strings = call[0];
    expect(Array.isArray(strings)).toBe(true);
    const sql = (strings as readonly string[]).join('?').replaceAll(/\s+/g, ' ').trim();

    expect(sql).toContain('FROM "PortalInteractionEvent" pie');
    expect(sql).toContain('mpl."id" = pie."managedPortalLinkId"');
    expect(sql).toContain('ca."id" = mpl."campaignAssignmentId"');
    expect(sql).toContain('ca."traineeProfileId" = mpl."traineeProfileId"');
    expect(sql).toContain('tp."id" = mpl."traineeProfileId"');
    expect(sql).toContain('c."id" = ca."campaignId"');
    expect(sql).toContain('c."id" = ?');
    expect(sql).toContain('c."organisationId" = ?');
    expect(sql).toContain('o."id" = mpl."organisationId"');
    expect(sql).toContain('ci."id" = mpl."campaignItemId"');
    expect(sql).toContain('ci."campaignId" = c."id"');
    expect(sql).toContain('ci."componentType" = \'SIMULATED_INBOX\'');
    expect(sql).toContain('se."id" = mpl."simulatedEmailId"');
    expect(sql).toContain('si."id" = se."inboxId"');
    expect(sql).toContain('s."id" = si."simulationId"');
    expect(sql).toContain('s."id" = ci."simulationId"');
    expect(sql).toContain('s."organisationId" = o."id"');
    expect(sql).toContain('s."simulationType" = \'SIMULATED_INBOX\'');
    expect(sql).toContain('WHERE mpl."organisationId" = ?');
    expect(sql).toContain('mpl."purpose" = \'PHISHING_PORTAL\'');
    expect(call.slice(1)).toEqual(['campaign-1', 'organisation-1', 'organisation-1']);
  });

  it('checks Campaign ownership with a narrow organisation-scoped lookup', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue({ id: 'campaign-1' });

    await expect(
      findOrganisationCampaignForPortalReporting({
        organisationId: 'organisation-1',
        campaignId: 'campaign-1',
      }),
    ).resolves.toEqual({ id: 'campaign-1' });

    expect(prismaMock.campaign.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'campaign-1',
        organisationId: 'organisation-1',
      },
      select: { id: true },
    });
  });

  it('selects only canonical reporting fields in deterministic order', async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    await readCampaignPortalReportingFacts({
      organisationId: 'organisation-1',
      campaignId: 'campaign-1',
    });

    const call = prismaMock.$queryRaw.mock.calls[0] ?? [];
    const sql = ((call[0] as readonly string[]) ?? []).join('?').replaceAll(/\s+/g, ' ').trim();
    const projection = sql.slice(sql.indexOf('SELECT'), sql.indexOf('FROM'));

    expect(projection).toContain('pie."managedPortalLinkId"');
    expect(projection).toContain('mpl."traineeProfileId"');
    expect(projection).toContain('mpl."campaignAssignmentId"');
    expect(projection).toContain('mpl."campaignItemId"');
    expect(projection).toContain('mpl."simulatedEmailId"');
    expect(projection).toContain('pie."eventType"');
    expect(projection).toContain('pie."occurredAt"');
    expect(projection).not.toMatch(
      /token|clientEventId|metadata|portalTemplateId|bodyHtml|recipient|sender|provider/i,
    );
    expect(sql).not.toContain('DISTINCT');
    expect(sql).toContain('ORDER BY pie."occurredAt" ASC, pie."id" ASC');
  });

  it('maps all factual event types without aggregating deliberate credential attempts', async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      campaignReportingRow(),
      campaignReportingRow({
        eventType: 'PORTAL_VISITED',
        occurredAt: new Date('2026-09-21T09:01:00.000Z'),
      }),
      campaignReportingRow({
        eventType: 'PORTAL_IDENTIFIER_FIELD_INTERACTED',
        occurredAt: new Date('2026-09-21T09:02:00.000Z'),
      }),
      campaignReportingRow({
        eventType: 'PORTAL_CREDENTIAL_FIELD_INTERACTED',
        occurredAt: new Date('2026-09-21T09:03:00.000Z'),
      }),
      campaignReportingRow({
        eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
        occurredAt: new Date('2026-09-21T09:04:00.000Z'),
      }),
      campaignReportingRow({
        eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
        occurredAt: new Date('2026-09-21T09:05:00.000Z'),
      }),
      campaignReportingRow({
        managedPortalLinkId: 'link-2',
        traineeProfileId: 'trainee-2',
        campaignAssignmentId: 'assignment-2',
        simulatedEmailId: 'email-2',
        eventType: 'PORTAL_EDUCATIONAL_REVEAL_VIEWED',
        occurredAt: new Date('2026-09-21T09:06:00.000Z'),
      }),
    ]);

    const facts = await readCampaignPortalReportingFacts({
      organisationId: 'organisation-1',
      campaignId: 'campaign-1',
    });

    expect(facts.map((fact) => fact.eventType)).toEqual([
      'MANAGED_LINK_REQUESTED',
      'PORTAL_VISITED',
      'PORTAL_IDENTIFIER_FIELD_INTERACTED',
      'PORTAL_CREDENTIAL_FIELD_INTERACTED',
      'CREDENTIAL_SUBMISSION_ATTEMPTED',
      'CREDENTIAL_SUBMISSION_ATTEMPTED',
      'PORTAL_EDUCATIONAL_REVEAL_VIEWED',
    ]);
    expect(
      facts.filter((fact) => fact.eventType === 'CREDENTIAL_SUBMISSION_ATTEMPTED'),
    ).toHaveLength(2);
    expect(facts.at(-1)?.traineeProfileId).toBe('trainee-2');
    expect(facts[0]).toEqual({
      managedPortalLinkId: 'link-1',
      traineeProfileId: 'trainee-1',
      context: {
        channel: 'SIMULATED_INBOX',
        campaignAssignmentId: 'assignment-1',
        campaignItemId: 'item-1',
        simulatedEmailId: 'email-1',
      },
      eventType: 'MANAGED_LINK_REQUESTED',
      occurredAt: '2026-09-21T09:00:00.000Z',
    });
  });

  it('returns no raw-token, retry, metadata, real-email, or recipient surface', async () => {
    prismaMock.$queryRaw.mockResolvedValue([campaignReportingRow()]);

    const [fact] = await readCampaignPortalReportingFacts({
      organisationId: 'organisation-1',
      campaignId: 'campaign-1',
    });

    expect(Object.keys(fact ?? {}).sort()).toEqual(
      ['managedPortalLinkId', 'traineeProfileId', 'context', 'eventType', 'occurredAt'].sort(),
    );
    expect(fact?.context).toEqual({
      channel: 'SIMULATED_INBOX',
      campaignAssignmentId: 'assignment-1',
      campaignItemId: 'item-1',
      simulatedEmailId: 'email-1',
    });
    expect(JSON.stringify(fact)).not.toMatch(
      /token|clientEventId|metadata|phishingSimulationMessageId|recipient|sender|provider/i,
    );
  });

  it('fails closed for an unsupported persisted event type', async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      campaignReportingRow({ eventType: 'UNSUPPORTED_PORTAL_EVENT' }),
    ]);

    await expect(
      readCampaignPortalReportingFacts({
        organisationId: 'organisation-1',
        campaignId: 'campaign-1',
      }),
    ).rejects.toThrow('Unsupported portal interaction event type.');
  });
});

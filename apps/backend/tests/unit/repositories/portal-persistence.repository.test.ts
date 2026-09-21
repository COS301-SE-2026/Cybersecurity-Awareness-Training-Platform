import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  PortalInteractionEventIdempotencyConflictError,
  createManagedPortalLink,
  createPortalInteractionEvent,
  findManagedPortalLinkById,
  findManagedPortalLinkByTokenHash,
  findPortalInteractionEvents,
  setManagedPortalLinkRevokedAt,
} from '../../../src/repositories/portal-persistence.repository.js';

const prismaMock = vi.hoisted(() => ({
  managedPortalLink: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  portalInteractionEvent: {
    create: vi.fn(),
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

describe('portal persistence repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates and maps a purpose-bound Simulated Inbox managed link', async () => {
    prismaMock.managedPortalLink.create.mockResolvedValue(managedLinkRecord());

    const record = await createManagedPortalLink({
      tokenHash: 'sha256:managed-link',
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

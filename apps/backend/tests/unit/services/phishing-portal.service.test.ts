import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManagedPortalLinkResolutionFacts } from '../../../src/repositories/portal-persistence.repository.js';
import {
  createApprovedManagedPortalLink,
  PhishingPortalServiceError,
  PhishingPortalInteractionUnavailableError,
  recordPhishingPortalInteraction,
  resolveManagedPortalToken,
  resolvePhishingPortal,
} from '../../../src/services/phishing-portal.service.js';

const { repositoryMock, tokenHashServiceMock } = vi.hoisted(() => {
  class ManagedPortalLinkTokenHashConflictError extends Error {}

  return {
    repositoryMock: {
      ManagedPortalLinkTokenHashConflictError,
      createManagedPortalLink: vi.fn(),
      createFirstPortalInteractionEvent: vi.fn(),
      createPortalInteractionEvent: vi.fn(),
      findManagedPortalLinkResolutionByTokenHash: vi.fn(),
    },
    tokenHashServiceMock: {
      generateOpaqueToken: vi.fn(),
      hashOpaqueToken: vi.fn(),
    },
  };
});

vi.mock('../../../src/repositories/portal-persistence.repository.js', () => repositoryMock);
vi.mock('../../../src/services/token-hash.service.js', () => tokenHashServiceMock);

const now = new Date('2026-09-21T10:00:00.000Z');
const expiresAt = new Date('2026-09-22T10:00:00.000Z');
const rawToken = 'A'.repeat(43);
const secondRawToken = `${'B'.repeat(42)}Q`;

function creationInput() {
  return {
    portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1' as const,
    traineeProfileId: 'trainee-1',
    organisationId: 'organisation-1',
    context: {
      channel: 'SIMULATED_INBOX' as const,
      campaignAssignmentId: 'assignment-1',
      campaignItemId: 'item-1',
      simulatedEmailId: 'email-1',
    },
    expiresAt,
  };
}

function createdLink() {
  return {
    id: 'link-1',
    tokenHash: 'hashed-token',
    purpose: 'PHISHING_PORTAL' as const,
    portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1' as const,
    traineeProfileId: 'trainee-1',
    organisationId: 'organisation-1',
    context: creationInput().context,
    expiresAt: expiresAt.toISOString(),
    revokedAt: null,
    createdAt: now.toISOString(),
  };
}

function activeResolutionFacts(): ManagedPortalLinkResolutionFacts {
  return {
    id: 'link-1',
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
    expiresAt,
    revokedAt: null,
    traineeProfile: {
      id: 'trainee-1',
      traineeStatus: 'ACTIVE',
      userAuthStatus: 'ACTIVE',
      organisationMembership: {
        organisationId: 'organisation-1',
        membershipStatus: 'ACTIVE',
      },
      hasGeneralProfile: false,
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
        startDate: new Date('2026-09-20T10:00:00.000Z'),
        endDate: new Date('2026-09-23T10:00:00.000Z'),
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
  };
}

describe('phishing portal service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenHashServiceMock.generateOpaqueToken.mockReturnValue(rawToken);
    tokenHashServiceMock.hashOpaqueToken.mockReturnValue('hashed-token');
    repositoryMock.createManagedPortalLink.mockResolvedValue(createdLink());
    repositoryMock.createPortalInteractionEvent.mockResolvedValue({
      created: true,
      record: {
        id: 'event-1',
        managedPortalLinkId: 'link-1',
        eventType: 'MANAGED_LINK_REQUESTED',
        clientEventId: null,
        occurredAt: now.toISOString(),
      },
    });
    repositoryMock.createFirstPortalInteractionEvent.mockResolvedValue({
      created: true,
      record: {
        id: 'event-1',
        managedPortalLinkId: 'link-1',
        eventType: 'PORTAL_VISITED',
        clientEventId: 'client-event-1',
        occurredAt: now.toISOString(),
      },
    });
    repositoryMock.findManagedPortalLinkResolutionByTokenHash.mockResolvedValue(
      activeResolutionFacts(),
    );
  });

  describe('managed-link creation', () => {
    it('generates at least 32 random bytes and persists only the deterministic hash', async () => {
      const result = await createApprovedManagedPortalLink(creationInput(), now);

      expect(tokenHashServiceMock.generateOpaqueToken).toHaveBeenCalledWith(32);
      expect(tokenHashServiceMock.hashOpaqueToken).toHaveBeenCalledWith(rawToken);
      expect(repositoryMock.createManagedPortalLink).toHaveBeenCalledWith({
        tokenHash: 'hashed-token',
        portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        traineeProfileId: 'trainee-1',
        organisationId: 'organisation-1',
        context: creationInput().context,
        expiresAt,
      });
      expect(result).toEqual({
        token: rawToken,
        managedPortalLinkId: 'link-1',
        expiresAt: expiresAt.toISOString(),
      });
      expect(JSON.stringify(repositoryMock.createManagedPortalLink.mock.calls)).not.toContain(
        rawToken,
      );
      expect(Object.keys(repositoryMock.createManagedPortalLink.mock.calls[0]?.[0] ?? {})).toEqual([
        'tokenHash',
        'portalTemplateId',
        'traineeProfileId',
        'organisationId',
        'context',
        'expiresAt',
      ]);
    });

    it('returns distinct URL-safe opaque tokens produced by the cryptographic utility', async () => {
      tokenHashServiceMock.generateOpaqueToken
        .mockReturnValueOnce(rawToken)
        .mockReturnValueOnce(secondRawToken);
      tokenHashServiceMock.hashOpaqueToken
        .mockReturnValueOnce('hashed-token-1')
        .mockReturnValueOnce('hashed-token-2');

      const first = await createApprovedManagedPortalLink(creationInput(), now);
      const second = await createApprovedManagedPortalLink(creationInput(), now);

      expect(first.token).not.toBe(second.token);
      expect(first.token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(second.token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it.each([
      new Date('2026-09-21T10:00:00.000Z'),
      new Date('2026-09-21T09:59:59.999Z'),
      new Date(Number.NaN),
    ])(
      'rejects a non-future or invalid expiry before generating a token',
      async (invalidExpiry) => {
        await expect(
          createApprovedManagedPortalLink({ ...creationInput(), expiresAt: invalidExpiry }, now),
        ).rejects.toMatchObject({ code: 'INVALID_EXPIRY' });
        expect(tokenHashServiceMock.generateOpaqueToken).not.toHaveBeenCalled();
        expect(repositoryMock.createManagedPortalLink).not.toHaveBeenCalled();
      },
    );

    it('retries a bounded token-hash collision and does not reuse colliding token material', async () => {
      repositoryMock.createManagedPortalLink
        .mockRejectedValueOnce(new repositoryMock.ManagedPortalLinkTokenHashConflictError())
        .mockResolvedValueOnce(createdLink());
      tokenHashServiceMock.generateOpaqueToken
        .mockReturnValueOnce(rawToken)
        .mockReturnValueOnce(secondRawToken);
      tokenHashServiceMock.hashOpaqueToken
        .mockReturnValueOnce('colliding-hash')
        .mockReturnValueOnce('hashed-token');

      const result = await createApprovedManagedPortalLink(creationInput(), now);

      expect(result.token).toBe(secondRawToken);
      expect(repositoryMock.createManagedPortalLink).toHaveBeenCalledTimes(2);
      expect(repositoryMock.createManagedPortalLink).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ tokenHash: 'colliding-hash' }),
      );
      expect(repositoryMock.createManagedPortalLink).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ tokenHash: 'hashed-token' }),
      );
    });

    it('fails safely after three hash collisions and propagates unrelated failures', async () => {
      repositoryMock.createManagedPortalLink.mockRejectedValue(
        new repositoryMock.ManagedPortalLinkTokenHashConflictError(),
      );

      await expect(createApprovedManagedPortalLink(creationInput(), now)).rejects.toEqual(
        new PhishingPortalServiceError('TOKEN_COLLISION_RETRY_EXHAUSTED'),
      );
      expect(repositoryMock.createManagedPortalLink).toHaveBeenCalledTimes(3);

      const persistenceError = new Error('database unavailable');
      repositoryMock.createManagedPortalLink.mockReset().mockRejectedValue(persistenceError);
      await expect(createApprovedManagedPortalLink(creationInput(), now)).rejects.toBe(
        persistenceError,
      );
      expect(repositoryMock.createManagedPortalLink).toHaveBeenCalledTimes(1);
    });
  });

  describe('managed-link resolution', () => {
    it.each([
      undefined,
      null,
      '',
      'short',
      `${'A'.repeat(42)}!`,
      `${'A'.repeat(42)}B`,
      'A'.repeat(44),
    ])(
      'returns unavailable for malformed token input without hashing or querying',
      async (malformedToken) => {
        await expect(resolveManagedPortalToken(malformedToken, now)).resolves.toEqual({
          state: 'UNAVAILABLE',
          reason: 'MALFORMED_TOKEN',
        });
        expect(tokenHashServiceMock.hashOpaqueToken).not.toHaveBeenCalled();
        expect(repositoryMock.findManagedPortalLinkResolutionByTokenHash).not.toHaveBeenCalled();
      },
    );

    it('returns unavailable for an unknown hash without exposing token details', async () => {
      repositoryMock.findManagedPortalLinkResolutionByTokenHash.mockResolvedValue(null);

      const result = await resolveManagedPortalToken(rawToken, now);

      expect(tokenHashServiceMock.hashOpaqueToken).toHaveBeenCalledWith(rawToken);
      expect(repositoryMock.findManagedPortalLinkResolutionByTokenHash).toHaveBeenCalledWith(
        'hashed-token',
      );
      expect(result).toEqual({ state: 'UNAVAILABLE', reason: 'UNKNOWN_TOKEN' });
      expect(JSON.stringify(result)).not.toContain(rawToken);
      expect(JSON.stringify(result)).not.toContain('hashed-token');
    });

    it.each([
      ['WRONG_PURPOSE', { purpose: 'OTHER' }],
      ['UNKNOWN_TEMPLATE', { portalTemplateId: 'UNKNOWN_TEMPLATE' }],
      ['UNSUPPORTED_SOURCE', { context: { channel: 'REAL_EMAIL' } }],
    ])('returns unavailable for %s', async (reason, override) => {
      repositoryMock.findManagedPortalLinkResolutionByTokenHash.mockResolvedValue({
        ...activeResolutionFacts(),
        ...override,
      });

      await expect(resolveManagedPortalToken(rawToken, now)).resolves.toEqual({
        state: 'UNAVAILABLE',
        reason,
      });
    });

    it('returns unavailable when a required source record is missing', async () => {
      repositoryMock.findManagedPortalLinkResolutionByTokenHash.mockResolvedValue({
        ...activeResolutionFacts(),
        campaignItem: null,
      });

      await expect(resolveManagedPortalToken(rawToken, now)).resolves.toEqual({
        state: 'UNAVAILABLE',
        reason: 'SOURCE_MISSING',
      });
    });

    it('returns unavailable for mutually inconsistent source relationships', async () => {
      const facts = activeResolutionFacts();
      facts.campaignItem!.simulationId = 'different-simulation';
      repositoryMock.findManagedPortalLinkResolutionByTokenHash.mockResolvedValue(facts);

      await expect(resolveManagedPortalToken(rawToken, now)).resolves.toEqual({
        state: 'UNAVAILABLE',
        reason: 'SOURCE_INCONSISTENT',
      });
    });

    it('returns unavailable for trainee and tenant inconsistencies', async () => {
      const traineeMismatch = activeResolutionFacts();
      traineeMismatch.campaignAssignment!.traineeProfileId = 'different-trainee';
      repositoryMock.findManagedPortalLinkResolutionByTokenHash.mockResolvedValueOnce(
        traineeMismatch,
      );

      await expect(resolveManagedPortalToken(rawToken, now)).resolves.toEqual({
        state: 'UNAVAILABLE',
        reason: 'TRAINEE_CONTEXT_INCONSISTENT',
      });

      const tenantMismatch = activeResolutionFacts();
      tenantMismatch.campaignAssignment!.campaign.organisationId = 'different-organisation';
      repositoryMock.findManagedPortalLinkResolutionByTokenHash.mockResolvedValueOnce(
        tenantMismatch,
      );

      await expect(resolveManagedPortalToken(rawToken, now)).resolves.toEqual({
        state: 'UNAVAILABLE',
        reason: 'TENANT_INCONSISTENT',
      });
    });

    it.each([
      [
        'REVOKED',
        (facts: ReturnType<typeof activeResolutionFacts>) => {
          facts.revokedAt = new Date('2026-09-21T09:00:00.000Z');
        },
      ],
      [
        'EXPIRED',
        (facts: ReturnType<typeof activeResolutionFacts>) => {
          facts.expiresAt = now;
        },
      ],
      [
        'SOURCE_INACTIVE',
        (facts: ReturnType<typeof activeResolutionFacts>) => {
          facts.campaignAssignment!.campaign.status = 'PAUSED';
        },
      ],
    ])('returns inactive when the link is %s', async (reason, mutateFacts) => {
      const facts = activeResolutionFacts();
      mutateFacts(facts);
      repositoryMock.findManagedPortalLinkResolutionByTokenHash.mockResolvedValue(facts);

      await expect(resolveManagedPortalToken(rawToken, now)).resolves.toEqual({
        state: 'INACTIVE',
        reason,
      });
    });

    it('supports a consistent active general campaign source', async () => {
      const facts = activeResolutionFacts();
      facts.organisationId = null;
      facts.organisation = null;
      facts.traineeProfile!.organisationMembership = null;
      facts.traineeProfile!.hasGeneralProfile = true;
      facts.campaignAssignment!.accessType = 'SELF_SELECTED';
      facts.campaignAssignment!.campaign.organisationId = null;
      facts.campaignAssignment!.campaign.campaignType = 'PREMADE_GENERAL';
      facts.simulatedEmail!.inbox.simulation.organisationId = null;
      repositoryMock.findManagedPortalLinkResolutionByTokenHash.mockResolvedValue(facts);

      await expect(resolveManagedPortalToken(rawToken, now)).resolves.toMatchObject({
        state: 'ACTIVE',
      });
    });

    it('returns only safe fixed-registry presentation for a valid active link', async () => {
      const response = await resolvePhishingPortal(rawToken, now);

      expect(response).toEqual({
        state: 'ACTIVE',
        portal: {
          templateId: 'GENERIC_ACCOUNT_LOGIN_V1',
          heading: 'Sign in to your account',
          identifierLabel: 'Email address or username',
          credentialLabel: 'Password',
          submitLabel: 'Sign in',
        },
      });
      expect(Object.keys(response.state === 'ACTIVE' ? response.portal : {}).sort()).toEqual(
        ['templateId', 'heading', 'identifierLabel', 'credentialLabel', 'submitLabel'].sort(),
      );
      const serialized = JSON.stringify(response);
      expect(serialized).not.toContain('warningSigns');
      expect(serialized).not.toContain('trainee-1');
      expect(serialized).not.toContain('organisation-1');
      expect(serialized).not.toContain('assignment-1');
      expect(serialized).not.toContain('email-1');
      expect(serialized).not.toContain(rawToken);
      expect(serialized).not.toContain('hashed-token');
      expect(repositoryMock.createPortalInteractionEvent).toHaveBeenCalledWith({
        managedPortalLinkId: 'link-1',
        eventType: 'MANAGED_LINK_REQUESTED',
        clientEventId: null,
        occurredAt: now,
      });
      expect(repositoryMock.createPortalInteractionEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'PORTAL_VISITED' }),
      );
    });

    it('maps internal inactive and unavailable details to opaque public outcomes', async () => {
      const revokedFacts = activeResolutionFacts();
      revokedFacts.revokedAt = new Date('2026-09-21T09:00:00.000Z');
      repositoryMock.findManagedPortalLinkResolutionByTokenHash
        .mockResolvedValueOnce(revokedFacts)
        .mockResolvedValueOnce(null);

      await expect(resolvePhishingPortal(rawToken, now)).resolves.toEqual({ state: 'INACTIVE' });
      await expect(resolvePhishingPortal(rawToken, now)).resolves.toEqual({
        state: 'UNAVAILABLE',
      });
      expect(repositoryMock.createPortalInteractionEvent).not.toHaveBeenCalled();
    });

    it('does not consume or revoke a link and resolves the same active token repeatedly', async () => {
      await expect(resolvePhishingPortal(rawToken, now)).resolves.toMatchObject({
        state: 'ACTIVE',
      });
      await expect(resolvePhishingPortal(rawToken, now)).resolves.toMatchObject({
        state: 'ACTIVE',
      });

      expect(repositoryMock.findManagedPortalLinkResolutionByTokenHash).toHaveBeenCalledTimes(2);
      expect(repositoryMock.createPortalInteractionEvent).toHaveBeenCalledTimes(2);
      expect(repositoryMock.createPortalInteractionEvent).toHaveBeenNthCalledWith(1, {
        managedPortalLinkId: 'link-1',
        eventType: 'MANAGED_LINK_REQUESTED',
        clientEventId: null,
        occurredAt: now,
      });
      expect(repositoryMock.createPortalInteractionEvent).toHaveBeenNthCalledWith(2, {
        managedPortalLinkId: 'link-1',
        eventType: 'MANAGED_LINK_REQUESTED',
        clientEventId: null,
        occurredAt: now,
      });
      expect(repositoryMock.createManagedPortalLink).not.toHaveBeenCalled();
    });

    it('does not return an active response when request-event persistence fails', async () => {
      const persistenceError = new Error('event persistence failed');
      repositoryMock.createPortalInteractionEvent.mockRejectedValue(persistenceError);

      await expect(resolvePhishingPortal(rawToken, now)).rejects.toBe(persistenceError);
      expect(repositoryMock.createPortalInteractionEvent).toHaveBeenCalledWith({
        managedPortalLinkId: 'link-1',
        eventType: 'MANAGED_LINK_REQUESTED',
        clientEventId: null,
        occurredAt: now,
      });
    });
  });

  describe('browser interaction recording', () => {
    it.each([
      'PORTAL_VISITED',
      'PORTAL_IDENTIFIER_FIELD_INTERACTED',
      'PORTAL_CREDENTIAL_FIELD_INTERACTED',
      'PORTAL_EDUCATIONAL_REVEAL_VIEWED',
    ] as const)('records only the first %s fact and returns no reveal', async (eventType) => {
      repositoryMock.createFirstPortalInteractionEvent
        .mockResolvedValueOnce({
          created: true,
          record: {
            id: 'event-1',
            managedPortalLinkId: 'link-1',
            eventType,
            clientEventId: 'client-event-1',
            occurredAt: now.toISOString(),
          },
        })
        .mockResolvedValueOnce({
          created: false,
          record: {
            id: 'event-1',
            managedPortalLinkId: 'link-1',
            eventType,
            clientEventId: 'client-event-1',
            occurredAt: now.toISOString(),
          },
        });

      const request = { eventType, clientEventId: 'client-event-1' };
      await expect(recordPhishingPortalInteraction(rawToken, request, now)).resolves.toEqual({
        accepted: true,
        reveal: null,
      });
      await expect(recordPhishingPortalInteraction(rawToken, request, now)).resolves.toEqual({
        accepted: true,
        reveal: null,
      });

      expect(repositoryMock.createFirstPortalInteractionEvent).toHaveBeenCalledTimes(2);
      expect(repositoryMock.createFirstPortalInteractionEvent).toHaveBeenCalledWith({
        managedPortalLinkId: 'link-1',
        eventType,
        clientEventId: 'client-event-1',
        occurredAt: now,
      });
      expect(repositoryMock.createPortalInteractionEvent).not.toHaveBeenCalled();
    });

    it('records a credential attempt without entered values and returns snapshot-based education', async () => {
      const response = await recordPhishingPortalInteraction(
        rawToken,
        {
          eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
          clientEventId: 'attempt-1',
        },
        now,
      );

      expect(repositoryMock.createPortalInteractionEvent).toHaveBeenCalledWith({
        managedPortalLinkId: 'link-1',
        eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
        clientEventId: 'attempt-1',
        occurredAt: now,
      });
      expect(repositoryMock.createPortalInteractionEvent.mock.calls[0]?.[0]).toEqual({
        managedPortalLinkId: 'link-1',
        eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
        clientEventId: 'attempt-1',
        occurredAt: now,
      });
      expect(response).toEqual({
        accepted: true,
        reveal: {
          emailRedFlags: [
            { label: 'Unexpected sender', description: 'The sender was not expected.' },
            { label: 'Urgent request', description: null },
          ],
          portalWarningSigns: [
            {
              label: 'Unexpected sign-in request',
              description: 'Pause when a message asks you to sign in unexpectedly.',
            },
            {
              label: 'Pressure to act quickly',
              description: 'Urgent language can rush you into entering credentials.',
            },
            {
              label: 'Unverified destination',
              description: 'Confirm the destination and request context before signing in.',
            },
          ],
          trainingPath: null,
        },
      });
      const serialized = JSON.stringify(response);
      expect(serialized).not.toContain(rawToken);
      expect(serialized).not.toContain('hashed-token');
      expect(serialized).not.toContain('link-1');
      expect(serialized).not.toContain('trainee-1');
      expect(serialized).not.toContain('organisation-1');
      expect(serialized).not.toContain('campaign-1');
      expect(serialized).not.toContain('simulation-1');
      expect(serialized).not.toContain('metadata');
    });

    it('returns the same reveal for an idempotent credential retry and permits a new attempt ID', async () => {
      repositoryMock.createPortalInteractionEvent
        .mockResolvedValueOnce({
          created: true,
          record: {
            id: 'attempt-event-1',
            managedPortalLinkId: 'link-1',
            eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
            clientEventId: 'attempt-1',
            occurredAt: now.toISOString(),
          },
        })
        .mockResolvedValueOnce({
          created: false,
          record: {
            id: 'attempt-event-1',
            managedPortalLinkId: 'link-1',
            eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
            clientEventId: 'attempt-1',
            occurredAt: now.toISOString(),
          },
        })
        .mockResolvedValueOnce({
          created: true,
          record: {
            id: 'attempt-event-2',
            managedPortalLinkId: 'link-1',
            eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
            clientEventId: 'attempt-2',
            occurredAt: now.toISOString(),
          },
        });

      const first = await recordPhishingPortalInteraction(
        rawToken,
        { eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED', clientEventId: 'attempt-1' },
        now,
      );
      const retry = await recordPhishingPortalInteraction(
        rawToken,
        { eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED', clientEventId: 'attempt-1' },
        now,
      );
      const laterAttempt = await recordPhishingPortalInteraction(
        rawToken,
        { eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED', clientEventId: 'attempt-2' },
        now,
      );

      expect(retry).toEqual(first);
      expect(laterAttempt).toEqual(first);
      expect(repositoryMock.createPortalInteractionEvent).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ clientEventId: 'attempt-1' }),
      );
      expect(repositoryMock.createPortalInteractionEvent).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ clientEventId: 'attempt-1' }),
      );
      expect(repositoryMock.createPortalInteractionEvent).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ clientEventId: 'attempt-2' }),
      );
    });

    it.each([
      ['unknown', null],
      ['wrong purpose', { ...activeResolutionFacts(), purpose: 'OTHER' }],
      ['cross-context', { ...activeResolutionFacts(), context: { channel: 'REAL_EMAIL' } }],
      [
        'tenant inconsistent',
        {
          ...activeResolutionFacts(),
          organisationId: 'different-organisation',
        },
      ],
      [
        'expired',
        {
          ...activeResolutionFacts(),
          expiresAt: now,
        },
      ],
      [
        'revoked',
        {
          ...activeResolutionFacts(),
          revokedAt: new Date('2026-09-21T09:00:00.000Z'),
        },
      ],
      [
        'inactive source',
        {
          ...activeResolutionFacts(),
          simulatedEmail: {
            ...activeResolutionFacts().simulatedEmail!,
            inbox: { ...activeResolutionFacts().simulatedEmail!.inbox, status: 'ARCHIVED' },
          },
        },
      ],
    ])('stores nothing for an %s link', async (_label, facts) => {
      repositoryMock.findManagedPortalLinkResolutionByTokenHash.mockResolvedValue(facts);

      await expect(
        recordPhishingPortalInteraction(
          rawToken,
          { eventType: 'PORTAL_VISITED', clientEventId: 'client-event-1' },
          now,
        ),
      ).rejects.toBeInstanceOf(PhishingPortalInteractionUnavailableError);
      expect(repositoryMock.createFirstPortalInteractionEvent).not.toHaveBeenCalled();
      expect(repositoryMock.createPortalInteractionEvent).not.toHaveBeenCalled();
    });

    it('stores nothing for malformed token input', async () => {
      await expect(
        recordPhishingPortalInteraction(
          'malformed',
          { eventType: 'PORTAL_VISITED', clientEventId: 'client-event-1' },
          now,
        ),
      ).rejects.toBeInstanceOf(PhishingPortalInteractionUnavailableError);
      expect(repositoryMock.findManagedPortalLinkResolutionByTokenHash).not.toHaveBeenCalled();
      expect(repositoryMock.createFirstPortalInteractionEvent).not.toHaveBeenCalled();
      expect(repositoryMock.createPortalInteractionEvent).not.toHaveBeenCalled();
    });

    it('rejects the server-only event even if it reaches the service boundary', async () => {
      await expect(
        recordPhishingPortalInteraction(
          rawToken,
          {
            eventType: 'MANAGED_LINK_REQUESTED',
            clientEventId: 'client-event-1',
          } as never,
          now,
        ),
      ).rejects.toBeInstanceOf(PhishingPortalInteractionUnavailableError);
      expect(repositoryMock.createFirstPortalInteractionEvent).not.toHaveBeenCalled();
      expect(repositoryMock.createPortalInteractionEvent).not.toHaveBeenCalled();
    });

    it('does not conceal unrelated event persistence failures', async () => {
      const persistenceError = new Error('database unavailable');
      repositoryMock.createFirstPortalInteractionEvent.mockRejectedValue(persistenceError);

      await expect(
        recordPhishingPortalInteraction(
          rawToken,
          { eventType: 'PORTAL_VISITED', clientEventId: 'client-event-1' },
          now,
        ),
      ).rejects.toBe(persistenceError);
    });
  });
});

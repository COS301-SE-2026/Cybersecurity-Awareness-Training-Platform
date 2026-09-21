import { beforeEach, describe, expect, it, vi } from 'vitest';
import { campaignPortalReportingFactSchema } from '@insightful-phish/shared';
import type { ManagedPortalLinkResolutionFacts } from '../../../src/repositories/portal-persistence.repository.js';
import {
  CampaignPortalReportingServiceError,
  createApprovedManagedPortalLink,
  getCampaignPortalReportingFacts,
  getOrCreateManagedPortalForOccurrence,
  PhishingPortalServiceError,
  PhishingPortalInteractionUnavailableError,
  recordPhishingPortalInteraction,
  resolveManagedPortalToken,
  resolvePhishingPortal,
} from '../../../src/services/phishing-portal.service.js';

const { organisationScopeServiceMock, repositoryMock, tokenHashServiceMock } = vi.hoisted(() => {
  class ManagedPortalLinkTokenHashConflictError extends Error {}
  class ManagedPortalLinkIdConflictError extends Error {}
  class ManagedPortalLinkOccurrenceConflictError extends Error {}

  return {
    organisationScopeServiceMock: {
      requireOrganisationAdminScope: vi.fn(),
    },
    repositoryMock: {
      ManagedPortalLinkOccurrenceConflictError,
      ManagedPortalLinkIdConflictError,
      ManagedPortalLinkTokenHashConflictError,
      createManagedPortalLink: vi.fn(),
      createFirstPortalInteractionEvent: vi.fn(),
      createPortalInteractionEvent: vi.fn(),
      findOrganisationCampaignForPortalReporting: vi.fn(),
      findManagedPortalLinkByOccurrence: vi.fn(),
      findManagedPortalLinkResolutionByTokenHash: vi.fn(),
      readCampaignPortalReportingFacts: vi.fn(),
    },
    tokenHashServiceMock: {
      deriveManagedPortalToken: vi.fn(),
      generateOpaqueToken: vi.fn(),
      hashOpaqueToken: vi.fn(),
      opaqueTokenMatches: vi.fn(),
    },
  };
});

vi.mock('../../../src/repositories/portal-persistence.repository.js', () => repositoryMock);
vi.mock('../../../src/services/token-hash.service.js', () => tokenHashServiceMock);
vi.mock('../../../src/services/organisation-scope.service.js', () => organisationScopeServiceMock);

const now = new Date('2026-09-21T10:00:00.000Z');
const expiresAt = new Date('2026-09-22T10:00:00.000Z');
const rawToken = 'A'.repeat(43);
const secondRawToken = `${'B'.repeat(42)}Q`;
const managedPortalLinkId = 'L'.repeat(43);
const secondManagedPortalLinkId = 'M'.repeat(43);
const reportingIds = {
  link1: '00000000-0000-4000-8000-000000000001',
  link2: '00000000-0000-4000-8000-000000000002',
  trainee1: '00000000-0000-4000-8000-000000000003',
  trainee2: '00000000-0000-4000-8000-000000000004',
  assignment: '00000000-0000-4000-8000-000000000005',
  item: '00000000-0000-4000-8000-000000000006',
  email: '00000000-0000-4000-8000-000000000007',
};

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
    id: managedPortalLinkId,
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

function occurrenceRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: managedPortalLinkId,
    tokenHash: 'hashed-token',
    purpose: 'PHISHING_PORTAL' as const,
    portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1' as const,
    traineeProfileId: 'trainee-1',
    organisationId: 'organisation-1',
    context: creationInput().context,
    expiresAt,
    revokedAt: null,
    ...overrides,
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

function campaignReportingFact(overrides: Record<string, unknown> = {}) {
  return {
    managedPortalLinkId: reportingIds.link1,
    traineeProfileId: reportingIds.trainee1,
    context: {
      channel: 'SIMULATED_INBOX' as const,
      campaignAssignmentId: reportingIds.assignment,
      campaignItemId: reportingIds.item,
      simulatedEmailId: reportingIds.email,
    },
    eventType: 'MANAGED_LINK_REQUESTED' as const,
    occurredAt: '2026-09-21T09:00:00.000Z',
    ...overrides,
  };
}

describe('phishing portal service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    organisationScopeServiceMock.requireOrganisationAdminScope.mockResolvedValue({
      adminProfileId: 'admin-1',
      userId: 'user-1',
      organisationId: 'organisation-1',
      grantedPermissions: new Set(['VIEW_CAMPAIGNS']),
    });
    repositoryMock.findOrganisationCampaignForPortalReporting.mockResolvedValue({
      id: 'campaign-1',
    });
    repositoryMock.readCampaignPortalReportingFacts.mockResolvedValue([]);
    tokenHashServiceMock.generateOpaqueToken.mockReturnValue(managedPortalLinkId);
    tokenHashServiceMock.deriveManagedPortalToken.mockReturnValue(rawToken);
    tokenHashServiceMock.hashOpaqueToken.mockReturnValue('hashed-token');
    tokenHashServiceMock.opaqueTokenMatches.mockReturnValue(true);
    repositoryMock.createManagedPortalLink.mockResolvedValue(createdLink());
    repositoryMock.findManagedPortalLinkByOccurrence.mockResolvedValue(null);
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

  describe('Campaign portal reporting', () => {
    const actor = { userId: 'user-1', userType: 'ORGANISATION_ADMIN' };

    it('authorises and returns strict factual rows for one organisation Campaign', async () => {
      const facts = [
        campaignReportingFact(),
        campaignReportingFact({
          managedPortalLinkId: reportingIds.link2,
          traineeProfileId: reportingIds.trainee2,
          eventType: 'PORTAL_VISITED',
          occurredAt: '2026-09-21T09:01:00.000Z',
        }),
      ];
      repositoryMock.readCampaignPortalReportingFacts.mockResolvedValue(facts);

      const result = await getCampaignPortalReportingFacts(actor, 'organisation-1', 'campaign-1');

      expect(organisationScopeServiceMock.requireOrganisationAdminScope).toHaveBeenCalledWith({
        userId: 'user-1',
        organisationId: 'organisation-1',
        requiredAnyPermission: ['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS'],
      });
      expect(repositoryMock.findOrganisationCampaignForPortalReporting).toHaveBeenCalledWith({
        organisationId: 'organisation-1',
        campaignId: 'campaign-1',
      });
      expect(repositoryMock.readCampaignPortalReportingFacts).toHaveBeenCalledWith({
        organisationId: 'organisation-1',
        campaignId: 'campaign-1',
      });
      expect(result).toEqual(facts);
      expect(campaignPortalReportingFactSchema.array().safeParse(result).success).toBe(true);
    });

    it('returns an empty array without synthesising facts or aggregates', async () => {
      await expect(
        getCampaignPortalReportingFacts(actor, 'organisation-1', 'campaign-1'),
      ).resolves.toEqual([]);

      expect(repositoryMock.createManagedPortalLink).not.toHaveBeenCalled();
      expect(repositoryMock.createPortalInteractionEvent).not.toHaveBeenCalled();
      expect(repositoryMock.createFirstPortalInteractionEvent).not.toHaveBeenCalled();
    });

    it('stops before Campaign lookup and fact reads when organisation scope is unauthorised', async () => {
      const accessError = new Error('inaccessible organisation');
      organisationScopeServiceMock.requireOrganisationAdminScope.mockRejectedValue(accessError);

      await expect(
        getCampaignPortalReportingFacts(
          { userId: 'other-user', userType: 'ORGANISATION_ADMIN' },
          'organisation-1',
          'campaign-1',
        ),
      ).rejects.toBe(accessError);

      expect(repositoryMock.findOrganisationCampaignForPortalReporting).not.toHaveBeenCalled();
      expect(repositoryMock.readCampaignPortalReportingFacts).not.toHaveBeenCalled();
    });

    it('uses an indistinguishable not-found result for a Campaign outside the tenant', async () => {
      repositoryMock.findOrganisationCampaignForPortalReporting.mockResolvedValue(null);

      await expect(
        getCampaignPortalReportingFacts(actor, 'organisation-1', 'campaign-in-another-tenant'),
      ).rejects.toEqual(new CampaignPortalReportingServiceError());

      expect(repositoryMock.findOrganisationCampaignForPortalReporting).toHaveBeenCalledWith({
        organisationId: 'organisation-1',
        campaignId: 'campaign-in-another-tenant',
      });
      expect(repositoryMock.readCampaignPortalReportingFacts).not.toHaveBeenCalled();
    });

    it('preserves exact event stages, retry cardinality, later attempts and trainee identity', async () => {
      const facts = [
        campaignReportingFact(),
        campaignReportingFact({ eventType: 'PORTAL_VISITED' }),
        campaignReportingFact({ eventType: 'PORTAL_IDENTIFIER_FIELD_INTERACTED' }),
        campaignReportingFact({ eventType: 'PORTAL_CREDENTIAL_FIELD_INTERACTED' }),
        campaignReportingFact({ eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED' }),
        campaignReportingFact({
          eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
          occurredAt: '2026-09-21T09:05:00.000Z',
        }),
        campaignReportingFact({
          managedPortalLinkId: reportingIds.link2,
          traineeProfileId: reportingIds.trainee2,
          eventType: 'PORTAL_EDUCATIONAL_REVEAL_VIEWED',
          occurredAt: '2026-09-21T09:06:00.000Z',
        }),
      ];
      repositoryMock.readCampaignPortalReportingFacts.mockResolvedValue(facts);

      const result = await getCampaignPortalReportingFacts(actor, 'organisation-1', 'campaign-1');

      expect(result.map((fact) => fact.eventType)).toEqual([
        'MANAGED_LINK_REQUESTED',
        'PORTAL_VISITED',
        'PORTAL_IDENTIFIER_FIELD_INTERACTED',
        'PORTAL_CREDENTIAL_FIELD_INTERACTED',
        'CREDENTIAL_SUBMISSION_ATTEMPTED',
        'CREDENTIAL_SUBMISSION_ATTEMPTED',
        'PORTAL_EDUCATIONAL_REVEAL_VIEWED',
      ]);
      expect(result.filter(({ eventType }) => eventType === 'PORTAL_VISITED')).toHaveLength(1);
      expect(
        result.filter(({ eventType }) => eventType === 'CREDENTIAL_SUBMISSION_ATTEMPTED'),
      ).toHaveLength(2);
      expect(new Set(result.map((fact) => fact.traineeProfileId))).toEqual(
        new Set([reportingIds.trainee1, reportingIds.trainee2]),
      );
    });

    it('returns only canonical fields without sensitive, recipient or aggregate data', async () => {
      repositoryMock.readCampaignPortalReportingFacts.mockResolvedValue([
        campaignReportingFact({ eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED' }),
      ]);

      const [fact] = await getCampaignPortalReportingFacts(actor, 'organisation-1', 'campaign-1');
      const serialized = JSON.stringify(fact);

      expect(Object.keys(fact ?? {}).sort()).toEqual(
        ['managedPortalLinkId', 'traineeProfileId', 'context', 'eventType', 'occurredAt'].sort(),
      );
      expect(serialized).not.toMatch(
        /rawToken|tokenHash|clientEventId|password|credentialValue|formData|fieldValues|metadata|provider|recipient|phone|emailAddress/i,
      );
      expect(fact).not.toHaveProperty('summary');
      expect(fact).not.toHaveProperty('percentage');
      expect(fact).not.toHaveProperty('count');
    });

    it('rejects a repository row that does not match the strict reporting projection', async () => {
      repositoryMock.readCampaignPortalReportingFacts.mockResolvedValue([
        campaignReportingFact({ tokenHash: 'must-not-escape' }),
      ]);

      await expect(
        getCampaignPortalReportingFacts(actor, 'organisation-1', 'campaign-1'),
      ).rejects.toMatchObject({ name: 'ZodError' });
    });
  });

  describe('managed-link creation', () => {
    it('generates a random internal ID and persists only the derived bearer token hash', async () => {
      const result = await createApprovedManagedPortalLink(creationInput(), now);

      expect(tokenHashServiceMock.generateOpaqueToken).toHaveBeenCalledWith(32);
      expect(tokenHashServiceMock.deriveManagedPortalToken).toHaveBeenCalledWith(
        managedPortalLinkId,
      );
      expect(tokenHashServiceMock.hashOpaqueToken).toHaveBeenCalledWith(rawToken);
      expect(repositoryMock.createManagedPortalLink).toHaveBeenCalledWith({
        id: managedPortalLinkId,
        tokenHash: 'hashed-token',
        portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        traineeProfileId: 'trainee-1',
        organisationId: 'organisation-1',
        context: creationInput().context,
        expiresAt,
      });
      expect(result).toEqual({
        token: rawToken,
        managedPortalLinkId,
        expiresAt: expiresAt.toISOString(),
      });
      expect(JSON.stringify(repositoryMock.createManagedPortalLink.mock.calls)).not.toContain(
        rawToken,
      );
      expect(Object.keys(repositoryMock.createManagedPortalLink.mock.calls[0]?.[0] ?? {})).toEqual([
        'id',
        'tokenHash',
        'portalTemplateId',
        'traineeProfileId',
        'organisationId',
        'context',
        'expiresAt',
      ]);
    });

    it('creates a stable occurrence URL without returning the bearer token separately', async () => {
      const result = await getOrCreateManagedPortalForOccurrence(creationInput(), now);

      expect(repositoryMock.findManagedPortalLinkByOccurrence).toHaveBeenCalledWith(
        creationInput().context,
      );
      expect(result).toEqual({
        state: 'ACTIVE',
        managedPortalUrl: `http://localhost:4000/api/public/phishing-portals/${rawToken}`,
      });
      expect(result).not.toHaveProperty('token');
      expect(result).not.toHaveProperty('tokenHash');
    });

    it('re-derives the exact stable occurrence capability without storing bearer material', async () => {
      repositoryMock.findManagedPortalLinkByOccurrence.mockResolvedValue(occurrenceRecord());

      const first = await getOrCreateManagedPortalForOccurrence(creationInput(), now);
      const second = await getOrCreateManagedPortalForOccurrence(creationInput(), now);

      expect(first).toEqual(second);
      expect(tokenHashServiceMock.deriveManagedPortalToken).toHaveBeenCalledTimes(2);
      expect(tokenHashServiceMock.deriveManagedPortalToken).toHaveBeenCalledWith(
        managedPortalLinkId,
      );
      expect(tokenHashServiceMock.opaqueTokenMatches).toHaveBeenCalledWith(
        rawToken,
        'hashed-token',
      );
      expect(tokenHashServiceMock.generateOpaqueToken).not.toHaveBeenCalled();
      expect(repositoryMock.createManagedPortalLink).not.toHaveBeenCalled();
    });

    it('converges on the persisted occurrence after a concurrent uniqueness conflict', async () => {
      repositoryMock.findManagedPortalLinkByOccurrence
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(occurrenceRecord());
      repositoryMock.createManagedPortalLink.mockRejectedValue(
        new repositoryMock.ManagedPortalLinkOccurrenceConflictError(),
      );

      const result = await getOrCreateManagedPortalForOccurrence(creationInput(), now);

      expect(result).toEqual({
        state: 'ACTIVE',
        managedPortalUrl: expect.stringContaining(
          `/api/public/phishing-portals/${rawToken}`,
        ) as string,
      });
      expect(repositoryMock.findManagedPortalLinkByOccurrence).toHaveBeenCalledTimes(2);
    });

    it.each([
      { revokedAt: new Date('2026-09-21T09:00:00.000Z') },
      { expiresAt: new Date('2026-09-21T09:59:59.999Z') },
    ])('does not reissue an inactive occurrence link', async (override) => {
      repositoryMock.findManagedPortalLinkByOccurrence.mockResolvedValue(
        occurrenceRecord(override),
      );

      await expect(getOrCreateManagedPortalForOccurrence(creationInput(), now)).resolves.toEqual({
        state: 'INACTIVE',
      });
      expect(tokenHashServiceMock.deriveManagedPortalToken).not.toHaveBeenCalled();
      expect(repositoryMock.createManagedPortalLink).not.toHaveBeenCalled();
    });

    it('rejects a persisted occurrence whose immutable context does not match', async () => {
      repositoryMock.findManagedPortalLinkByOccurrence.mockResolvedValue(
        occurrenceRecord({ traineeProfileId: 'different-trainee' }),
      );

      await expect(
        getOrCreateManagedPortalForOccurrence(creationInput(), now),
      ).rejects.toMatchObject({ code: 'OCCURRENCE_CONTEXT_CONFLICT' });
      expect(tokenHashServiceMock.deriveManagedPortalToken).not.toHaveBeenCalled();
    });

    it('rejects a derived capability that does not match the persisted token hash', async () => {
      repositoryMock.findManagedPortalLinkByOccurrence.mockResolvedValue(occurrenceRecord());
      tokenHashServiceMock.opaqueTokenMatches.mockReturnValue(false);

      const result = getOrCreateManagedPortalForOccurrence(creationInput(), now);
      await expect(result).rejects.toMatchObject({ code: 'TOKEN_RECOVERY_FAILED' });
      await expect(result).rejects.not.toThrow(rawToken);
    });

    it('returns distinct URL-safe opaque tokens produced by the cryptographic utility', async () => {
      tokenHashServiceMock.generateOpaqueToken
        .mockReturnValueOnce(managedPortalLinkId)
        .mockReturnValueOnce(secondManagedPortalLinkId);
      tokenHashServiceMock.deriveManagedPortalToken
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
        .mockReturnValueOnce(managedPortalLinkId)
        .mockReturnValueOnce(secondManagedPortalLinkId);
      tokenHashServiceMock.deriveManagedPortalToken
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

    it('retries a bounded random internal identifier collision', async () => {
      repositoryMock.createManagedPortalLink
        .mockRejectedValueOnce(new repositoryMock.ManagedPortalLinkIdConflictError())
        .mockResolvedValueOnce(createdLink());
      tokenHashServiceMock.generateOpaqueToken
        .mockReturnValueOnce(managedPortalLinkId)
        .mockReturnValueOnce(secondManagedPortalLinkId);
      tokenHashServiceMock.deriveManagedPortalToken
        .mockReturnValueOnce(rawToken)
        .mockReturnValueOnce(secondRawToken);

      await expect(createApprovedManagedPortalLink(creationInput(), now)).resolves.toMatchObject({
        token: secondRawToken,
      });
      expect(repositoryMock.createManagedPortalLink).toHaveBeenCalledTimes(2);
      expect(repositoryMock.createManagedPortalLink).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ id: managedPortalLinkId }),
      );
      expect(repositoryMock.createManagedPortalLink).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ id: secondManagedPortalLinkId }),
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

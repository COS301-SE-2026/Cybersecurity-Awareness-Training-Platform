import { PORTAL_TEMPLATE_IDS } from '@insightful-phish/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationService } from '../../../src/services/simulation.service.js';
import * as SimulationRepository from '../../../src/repositories/simulation.repository.js';
import { CampaignEligibilityDenialError } from '../../../src/services/campaign-eligibility.service.js';
import * as PhishingPortalService from '../../../src/services/phishing-portal.service.js';

vi.mock('../../../src/repositories/simulation.repository.js', () => ({
  findTraineeProfileByUserId: vi.fn(),
  findSimulatedInboxCampaignItem: vi.fn(),
  findOpenedEmailIds: vi.fn(),
  findSimulatedEmailWithAccess: vi.fn(),
  hasExistingSimulationEmailHistory: vi.fn(),
  recordEmailOpenedEventTx: vi.fn(),
  createSimulationInteractionEventGuarded: vi.fn(),
  findExistingClassificationResponse: vi.fn(),
  createClassificationResponseTx: vi.fn(),
}));

vi.mock('../../../src/services/phishing-portal.service.js', () => ({
  getOrCreateManagedPortalForOccurrence: vi.fn(),
}));

describe('SimulationService', () => {
  let service: SimulationService;
  const userId = '11111111-1111-4111-8111-111111111111';
  const traineeProfileId = '22222222-2222-4222-8222-222222222222';
  const campaignItemId = '33333333-3333-4333-8333-333333333333';
  const campaignId = '44444444-4444-4444-8444-444444444444';
  const assignmentId = '55555555-5555-4555-8555-555555555555';
  const emailId = '66666666-6666-4666-8666-666666666666';
  const redFlagId = '77777777-7777-4777-8777-777777777777';

  const createMockEmailWithAccess = () => ({
    id: emailId,
    inboxId: 'inbox-1',
    senderLabel: 'Security Team',
    senderAddress: 'security@example.com',
    subject: 'Urgent Action Required',
    preview: 'Please update your credentials immediately',
    bodyHtml: '<p>Click here</p>',
    linkAnchorText: 'Review account',
    simulatedLinkTarget: 'https://evil.example.com',
    portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1' as (typeof PORTAL_TEMPLATE_IDS)[number] | null,
    hasAttachment: false,
    receivedAt: new Date('2026-06-01T12:00:00.000Z'),
    difficultyLevel: 'EASY' as const,
    expectedClassification: 'PHISHING' as const,
    redFlags: [
      {
        id: redFlagId,
        redFlagType: 'SENDER' as const,
        label: 'Mismatched domain',
        description: 'Sender domain does not match official company domain',
        severity: 'HIGH' as const,
      },
    ],
    inbox: {
      id: 'inbox-1',
      status: 'ACTIVE' as const,
      simulation: {
        id: 'simulation-1',
        organisationId: null as string | null,
        organisation: null as { id: string; status: 'ACTIVE' | 'INACTIVE' } | null,
        simulationType: 'SIMULATED_INBOX' as const,
        safetyStatus: 'APPROVED' as const,
        campaignItems: [
          {
            id: campaignItemId,
            campaignId,
            simulationId: 'simulation-1',
            itemType: 'COMPONENT',
            componentType: 'SIMULATED_INBOX',
            availabilityStatus: 'AVAILABLE',
            simulation: {
              id: 'simulation-1',
              safetyStatus: 'APPROVED',
              simulatedInbox: { id: 'inbox-1', status: 'ACTIVE' },
            },
            campaign: {
              id: campaignId,
              organisationId: null as string | null,
              status: 'ACTIVE' as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED',
              campaignType: 'PREMADE_GENERAL' as 'PREMADE_GENERAL' | 'ORGANISATION_CUSTOM',
              startDate: null,
              endDate: null as Date | null,
              assignments: [
                {
                  id: assignmentId,
                  campaignId,
                  traineeProfileId,
                  assignmentStatus: 'ASSIGNED' as const,
                  accessType: 'SELF_SELECTED' as 'SELF_SELECTED' | 'ASSIGNED',
                  traineeProfile: {
                    id: traineeProfileId,
                    traineeStatus: 'ACTIVE' as const,
                    user: { authStatus: 'ACTIVE' as const },
                    organisationTraineeProfile: null as {
                      organisationId: string;
                      membershipStatus: 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
                    } | null,
                    generalTraineeProfile: { id: 'general-profile-1' } as {
                      id: string;
                    } | null,
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SimulationService();
    vi.mocked(PhishingPortalService.getOrCreateManagedPortalForOccurrence).mockResolvedValue({
      state: 'ACTIVE',
      managedPortalUrl:
        'http://localhost:5173/api/public/phishing-portals/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    });
  });

  describe('getTraineeProfile', () => {
    it('delegates lookup to repository', async () => {
      vi.mocked(SimulationRepository.findTraineeProfileByUserId).mockResolvedValue({
        id: traineeProfileId,
        userId,
      } as unknown as Awaited<ReturnType<typeof SimulationRepository.findTraineeProfileByUserId>>);

      const profile = await service.getTraineeProfile(userId);
      expect(SimulationRepository.findTraineeProfileByUserId).toHaveBeenCalledWith(userId);
      expect(profile?.id).toBe(traineeProfileId);
    });
  });

  describe('getSimulatedInbox', () => {
    it('returns simulated inbox with opened state mapping for authorized trainee', async () => {
      const emailDate = new Date('2026-06-01T12:00:00.000Z');
      const campaignItem = {
        id: campaignItemId,
        itemType: 'COMPONENT',
        componentType: 'SIMULATED_INBOX',
        availabilityStatus: 'AVAILABLE',
        simulation: {
          safetyStatus: 'APPROVED',
          simulatedInbox: {
            status: 'ACTIVE',
            emails: [
              {
                id: emailId,
                inboxId: 'inbox-1',
                senderLabel: 'HR Team',
                senderAddress: 'hr@example.com',
                subject: 'Policy update',
                preview: 'Check update',
                receivedAt: emailDate,
                difficultyLevel: 'MEDIUM',
              },
            ],
          },
        },
        campaign: {
          id: campaignId,
          status: 'ACTIVE',
          campaignType: 'PREMADE_GENERAL',
          assignments: [{ id: assignmentId }],
        },
      };

      vi.mocked(SimulationRepository.findSimulatedInboxCampaignItem).mockResolvedValue(
        campaignItem as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedInboxCampaignItem>
        >,
      );
      vi.mocked(SimulationRepository.findOpenedEmailIds).mockResolvedValue(new Set([emailId]));

      const result = await service.getSimulatedInbox(campaignItemId, traineeProfileId);

      expect(result).toEqual({
        emails: [
          {
            id: emailId,
            campaignAssignmentId: assignmentId,
            campaignItemId,
            inboxId: 'inbox-1',
            senderLabel: 'HR Team',
            senderAddress: 'hr@example.com',
            subject: 'Policy update',
            preview: 'Check update',
            receivedAt: emailDate.toISOString(),
            difficultyLevel: 'MEDIUM',
            isOpened: true,
          },
        ],
      });
    });

    it('throws NOT_FOUND when campaign item is not found or invalid type/status', async () => {
      vi.mocked(SimulationRepository.findSimulatedInboxCampaignItem).mockResolvedValue(null);

      await expect(service.getSimulatedInbox(campaignItemId, traineeProfileId)).rejects.toThrow(
        'NOT_FOUND',
      );

      const invalidItem = {
        id: campaignItemId,
        itemType: 'COMPONENT',
        componentType: 'SIMULATED_INBOX',
        availabilityStatus: 'AVAILABLE',
        simulation: {
          safetyStatus: 'DRAFT',
          simulatedInbox: { status: 'ACTIVE', emails: [] },
        },
        campaign: { assignments: [{ id: assignmentId }] },
      };

      vi.mocked(SimulationRepository.findSimulatedInboxCampaignItem).mockResolvedValue(
        invalidItem as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedInboxCampaignItem>
        >,
      );

      await expect(service.getSimulatedInbox(campaignItemId, traineeProfileId)).rejects.toThrow(
        'NOT_FOUND',
      );
    });

    it('throws FORBIDDEN when no assignments exist for trainee', async () => {
      const itemWithoutAssignments = {
        id: campaignItemId,
        itemType: 'COMPONENT',
        componentType: 'SIMULATED_INBOX',
        availabilityStatus: 'AVAILABLE',
        simulation: {
          safetyStatus: 'APPROVED',
          simulatedInbox: { status: 'ACTIVE', emails: [] },
        },
        campaign: {
          status: 'ACTIVE',
          campaignType: 'PREMADE_GENERAL',
          assignments: [],
        },
      };

      vi.mocked(SimulationRepository.findSimulatedInboxCampaignItem).mockResolvedValue(
        itemWithoutAssignments as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedInboxCampaignItem>
        >,
      );

      await expect(service.getSimulatedInbox(campaignItemId, traineeProfileId)).rejects.toThrow(
        'FORBIDDEN',
      );
    });

    it('throws FORBIDDEN when campaign eligibility canView is false', async () => {
      const draftCampaignItem = {
        id: campaignItemId,
        itemType: 'COMPONENT',
        componentType: 'SIMULATED_INBOX',
        availabilityStatus: 'AVAILABLE',
        simulation: {
          safetyStatus: 'APPROVED',
          simulatedInbox: { status: 'ACTIVE', emails: [] },
        },
        campaign: {
          status: 'DRAFT',
          campaignType: 'ORGANISATION_CUSTOM',
          assignments: [{ id: assignmentId }],
        },
      };

      vi.mocked(SimulationRepository.findSimulatedInboxCampaignItem).mockResolvedValue(
        draftCampaignItem as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedInboxCampaignItem>
        >,
      );

      await expect(service.getSimulatedInbox(campaignItemId, traineeProfileId)).rejects.toThrow(
        'FORBIDDEN',
      );
    });
  });

  describe('getSimulatedEmail', () => {
    it('returns sanitized pre-classification email detail without leaking red flags or expected classification', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        createMockEmailWithAccess() as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );

      const result = await service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId);

      expect(SimulationRepository.findExistingClassificationResponse).toHaveBeenCalledWith({
        traineeProfileId,
        campaignAssignmentId: assignmentId,
        campaignItemId,
        simulatedEmailId: emailId,
      });
      expect(result).toEqual({
        id: emailId,
        campaignAssignmentId: assignmentId,
        campaignItemId,
        inboxId: 'inbox-1',
        senderLabel: 'Security Team',
        senderAddress: 'security@example.com',
        subject: 'Urgent Action Required',
        preview: 'Please update your credentials immediately',
        bodyHtml: '<p>Click here</p>',
        linkAnchorText: 'Review account',
        simulatedLinkTarget: 'https://evil.example.com',
        portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        managedPortalUrl: null,
        hasAttachment: false,
        receivedAt: '2026-06-01T12:00:00.000Z',
        difficultyLevel: 'EASY',
        classificationResult: null,
      });
      expect(result).not.toHaveProperty('expectedClassification');
      expect(result).not.toHaveProperty('redFlags');
    });

    it.each([null, ...PORTAL_TEMPLATE_IDS] as const)(
      'maps the independent portal snapshot %s without creating a URL',
      async (portalTemplateId) => {
        vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue({
          ...createMockEmailWithAccess(),
          portalTemplateId,
        } as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >);

        const result = await service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId);

        expect(result.portalTemplateId).toBe(portalTemplateId);
        expect(result.managedPortalUrl).toBeNull();
        expect(result.simulatedLinkTarget).toBe('https://evil.example.com');
      },
    );

    it('creates a managed portal from server-owned General Trainee occurrence facts', async () => {
      const email = createMockEmailWithAccess();
      email.bodyHtml = '<p><a href="{{SYSTEM_LINK}}">Review account</a></p>';
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        email as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );

      const result = await service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId);

      expect(PhishingPortalService.getOrCreateManagedPortalForOccurrence).toHaveBeenCalledWith(
        {
          portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
          traineeProfileId,
          organisationId: null,
          context: {
            channel: 'SIMULATED_INBOX',
            campaignAssignmentId: assignmentId,
            campaignItemId,
            simulatedEmailId: emailId,
          },
          expiresAt: new Date('9999-12-31T23:59:59.999Z'),
        },
        expect.any(Date),
      );
      expect(result.managedPortalUrl).toBe(
        'http://localhost:5173/api/public/phishing-portals/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      );
      expect(result.simulatedLinkTarget).toBe('https://evil.example.com');
      expect(result).not.toHaveProperty('organisationId');
    });

    it('preserves organisation ownership and the snapshotted template for an eligible occurrence', async () => {
      const email = createMockEmailWithAccess();
      email.bodyHtml = '<p>{{SYSTEM_LINK}}</p>';
      email.portalTemplateId = 'GENERIC_DOCUMENT_ACCESS_V1';
      email.inbox.simulation.organisationId = 'organisation-1';
      email.inbox.simulation.organisation = {
        id: 'organisation-1',
        status: 'ACTIVE' as const,
      };
      const item = email.inbox.simulation.campaignItems[0];
      item.campaign.organisationId = 'organisation-1';
      item.campaign.campaignType = 'ORGANISATION_CUSTOM';
      item.campaign.endDate = new Date('2099-01-01T00:00:00.000Z');
      const assignment = item.campaign.assignments[0];
      assignment.accessType = 'ASSIGNED';
      assignment.traineeProfile.generalTraineeProfile = null;
      assignment.traineeProfile.organisationTraineeProfile = {
        organisationId: 'organisation-1',
        membershipStatus: 'ACTIVE' as const,
      };
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        email as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );

      await service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId);

      expect(PhishingPortalService.getOrCreateManagedPortalForOccurrence).toHaveBeenCalledWith(
        expect.objectContaining({
          portalTemplateId: 'GENERIC_DOCUMENT_ACCESS_V1',
          traineeProfileId,
          organisationId: 'organisation-1',
          expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        }),
        expect.any(Date),
      );
    });

    it('returns the same managed URL on repeated eligible reads', async () => {
      const email = createMockEmailWithAccess();
      email.bodyHtml = '<p>{{SYSTEM_LINK}}</p>';
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        email as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );

      const first = await service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId);
      const second = await service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId);

      expect(first.managedPortalUrl).toBe(second.managedPortalUrl);
      expect(PhishingPortalService.getOrCreateManagedPortalForOccurrence).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['safe classification', { expectedClassification: 'SAFE' }],
      ['missing template', { portalTemplateId: null }],
      ['missing marker', { bodyHtml: '<p>Review account</p>' }],
      ['unsupported template', { portalTemplateId: 'UNSUPPORTED_TEMPLATE' }],
    ])('does not create a portal for %s', async (_reason, override) => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue({
        ...createMockEmailWithAccess(),
        bodyHtml: '<p>{{SYSTEM_LINK}}</p>',
        ...override,
      } as unknown as Awaited<
        ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
      >);

      const result = await service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId);

      expect(result.managedPortalUrl).toBeNull();
      expect(result.simulatedLinkTarget).toBe('https://evil.example.com');
      expect(PhishingPortalService.getOrCreateManagedPortalForOccurrence).not.toHaveBeenCalled();
    });

    it('returns no managed URL for a revoked or expired occurrence without reissuing it', async () => {
      const email = createMockEmailWithAccess();
      email.bodyHtml = '<p>{{SYSTEM_LINK}}</p>';
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        email as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(PhishingPortalService.getOrCreateManagedPortalForOccurrence).mockResolvedValue({
        state: 'INACTIVE',
      });

      const result = await service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId);

      expect(result.managedPortalUrl).toBeNull();
      expect(PhishingPortalService.getOrCreateManagedPortalForOccurrence).toHaveBeenCalledTimes(1);
    });

    it('rejects cross-tenant occurrence creation before invoking the portal service', async () => {
      const email = createMockEmailWithAccess();
      email.bodyHtml = '<p>{{SYSTEM_LINK}}</p>';
      email.inbox.simulation.organisationId = 'organisation-1';
      email.inbox.simulation.organisation = {
        id: 'organisation-1',
        status: 'ACTIVE' as const,
      };
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        email as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );

      await expect(
        service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId),
      ).rejects.toThrow('FORBIDDEN');
      expect(PhishingPortalService.getOrCreateManagedPortalForOccurrence).not.toHaveBeenCalled();
    });

    it.each([
      [
        'assignment',
        (email: ReturnType<typeof createMockEmailWithAccess>) => {
          email.inbox.simulation.campaignItems[0].campaign.assignments[0].campaignId =
            'different-campaign';
        },
      ],
      [
        'Campaign item',
        (email: ReturnType<typeof createMockEmailWithAccess>) => {
          email.inbox.simulation.campaignItems[0].campaignId = 'different-campaign';
        },
      ],
      [
        'inbox',
        (email: ReturnType<typeof createMockEmailWithAccess>) => {
          email.inbox.simulation.campaignItems[0].simulation.simulatedInbox.id = 'different-inbox';
        },
      ],
    ])('rejects cross-%s occurrence relationships', async (_relationship, mutate) => {
      const email = createMockEmailWithAccess();
      email.bodyHtml = '<p>{{SYSTEM_LINK}}</p>';
      mutate(email);
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        email as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );

      await expect(
        service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId),
      ).rejects.toThrow('FORBIDDEN');
      expect(PhishingPortalService.getOrCreateManagedPortalForOccurrence).not.toHaveBeenCalled();
    });

    it('supports platform-owned General Trainee content without fabricating an organisation', async () => {
      const email = createMockEmailWithAccess();
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        email as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );

      const result = await service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId);

      expect(email.inbox.simulation.organisationId).toBeNull();
      expect(result).not.toHaveProperty('organisationId');
      expect(result.portalTemplateId).toBe('GENERIC_ACCOUNT_LOGIN_V1');
      expect(result.managedPortalUrl).toBeNull();
    });

    it('restores selected types and matched authored flags after classification', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        createMockEmailWithAccess() as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(SimulationRepository.findExistingClassificationResponse).mockResolvedValue({
        id: 'resp-1',
        selectedClassification: 'PHISHING',
        selectedRedFlagTypes: ['SENDER', 'LINK'],
        selectedRedFlags: [{ emailRedFlagId: redFlagId }],
        isCorrect: true,
      } as unknown as Awaited<
        ReturnType<typeof SimulationRepository.findExistingClassificationResponse>
      >);

      const result = await service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId);

      expect(result.classificationResult).toMatchObject({
        selectedRedFlagIds: [redFlagId],
        selectedRedFlagTypes: ['SENDER', 'LINK'],
        expectedClassification: 'PHISHING',
      });
    });

    it('throws NOT_FOUND when email does not exist', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(null);

      await expect(
        service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId),
      ).rejects.toThrow('NOT_FOUND');
    });

    it('does not restore a result without an assignment for the trainee', async () => {
      const emailData = createMockEmailWithAccess();
      emailData.inbox.simulation.campaignItems[0].campaign.assignments = [];
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        emailData as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );

      await expect(
        service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId),
      ).rejects.toThrow('FORBIDDEN');
      expect(SimulationRepository.findExistingClassificationResponse).not.toHaveBeenCalled();
    });

    it('throws FORBIDDEN when simulation inbox is inactive in matching item', async () => {
      const emailData = createMockEmailWithAccess();
      emailData.bodyHtml = '<p>{{SYSTEM_LINK}}</p>';
      emailData.inbox.simulation.campaignItems[0].simulation.simulatedInbox.status = 'INACTIVE';

      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        emailData as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );

      await expect(
        service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId),
      ).rejects.toThrow('FORBIDDEN');
      expect(PhishingPortalService.getOrCreateManagedPortalForOccurrence).not.toHaveBeenCalled();
    });

    it('allows read when campaign is completed or paused if interaction history exists', async () => {
      const emailData = createMockEmailWithAccess();
      emailData.inbox.simulation.campaignItems[0].campaign.status = 'PAUSED';

      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        emailData as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(SimulationRepository.hasExistingSimulationEmailHistory).mockResolvedValue({
        id: 'hist-1',
      });

      const result = await service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId);
      expect(result.id).toBe(emailId);
    });

    it('throws FORBIDDEN when campaign is paused and no interaction history exists', async () => {
      const emailData = createMockEmailWithAccess();
      emailData.inbox.simulation.campaignItems[0].campaign.status = 'PAUSED';

      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        emailData as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(SimulationRepository.hasExistingSimulationEmailHistory).mockResolvedValue(null);

      await expect(
        service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId),
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('recordInteraction', () => {
    it('records SIMULATED_EMAIL_OPENED through transaction', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        createMockEmailWithAccess() as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(SimulationRepository.recordEmailOpenedEventTx).mockResolvedValue({
        allowed: true,
        value: undefined,
      });

      const result = await service.recordInteraction(emailId, campaignItemId, traineeProfileId, {
        eventType: 'SIMULATED_EMAIL_OPENED',
      });

      expect(SimulationRepository.recordEmailOpenedEventTx).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignId,
          traineeProfileId,
          assignmentId,
          itemId: campaignItemId,
          emailId,
        }),
      );
      expect(result).toEqual({
        success: true,
        eventType: 'SIMULATED_EMAIL_OPENED',
      });
    });

    it('records SIMULATED_EMAIL_LINK_CLICKED guarded event', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        createMockEmailWithAccess() as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(SimulationRepository.createSimulationInteractionEventGuarded).mockResolvedValue({
        allowed: true,
        value: { id: 'evt-1' } as unknown as Awaited<
          ReturnType<typeof SimulationRepository.createSimulationInteractionEventGuarded>
        > extends { allowed: true; value: infer V }
          ? V
          : never,
      });

      const result = await service.recordInteraction(emailId, campaignItemId, traineeProfileId, {
        eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
      });

      expect(SimulationRepository.createSimulationInteractionEventGuarded).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignId,
          traineeProfileId,
          campaignAssignmentId: assignmentId,
          campaignItemId,
          eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
          simulatedEmailId: emailId,
        }),
      );
      expect(result).toEqual({
        success: true,
        eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
      });
    });

    it('throws NOT_FOUND when guard reports NOT_FOUND', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        createMockEmailWithAccess() as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(SimulationRepository.recordEmailOpenedEventTx).mockResolvedValue({
        allowed: false,
        reason: 'NOT_FOUND',
      });

      await expect(
        service.recordInteraction(emailId, campaignItemId, traineeProfileId, {
          eventType: 'SIMULATED_EMAIL_OPENED',
        }),
      ).rejects.toThrow('NOT_FOUND');
    });

    it('asserts progress eligibility and throws CampaignEligibilityDenialError when guard reports INELIGIBLE', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        createMockEmailWithAccess() as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(SimulationRepository.recordEmailOpenedEventTx).mockResolvedValue({
        allowed: false,
        reason: 'INELIGIBLE',
        campaign: {
          status: 'PAUSED',
          campaignType: 'ORGANISATION_CUSTOM',
          startDate: null,
          endDate: null,
        },
      });

      await expect(
        service.recordInteraction(emailId, campaignItemId, traineeProfileId, {
          eventType: 'SIMULATED_EMAIL_OPENED',
        }),
      ).rejects.toThrow(CampaignEligibilityDenialError);
    });
  });

  describe('classifyEmail', () => {
    it('classifies correctly and returns feedback and red flags', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        createMockEmailWithAccess() as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(SimulationRepository.findExistingClassificationResponse).mockResolvedValue(null);
      vi.mocked(SimulationRepository.createClassificationResponseTx).mockResolvedValue({
        allowed: true,
        value: { id: 'resp-1' } as unknown as Awaited<
          ReturnType<typeof SimulationRepository.createClassificationResponseTx>
        > extends { allowed: true; value: infer V }
          ? V
          : never,
      });

      const result = await service.classifyEmail(emailId, campaignItemId, traineeProfileId, {
        selectedClassification: 'PHISHING',
        selectedRedFlagIds: [redFlagId],
        freeTextReason: 'Fake urgent security request',
      });

      expect(SimulationRepository.findExistingClassificationResponse).toHaveBeenCalledWith({
        traineeProfileId,
        campaignAssignmentId: assignmentId,
        campaignItemId,
        simulatedEmailId: emailId,
      });
      expect(result).toEqual({
        success: true,
        responseId: 'resp-1',
        selectedClassification: 'PHISHING',
        expectedClassification: 'PHISHING',
        selectedRedFlagIds: [redFlagId],
        selectedRedFlagTypes: ['SENDER'],
        isCorrect: true,
        feedback: 'Great job! You correctly identified the email.',
        redFlags: [
          {
            id: redFlagId,
            redFlagType: 'SENDER',
            label: 'Mismatched domain',
            description: 'Sender domain does not match official company domain',
            severity: 'HIGH',
          },
        ],
      });
    });

    it('retains selected warning types that do not match authored flags', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        createMockEmailWithAccess() as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(SimulationRepository.findExistingClassificationResponse).mockResolvedValue(null);
      vi.mocked(SimulationRepository.createClassificationResponseTx).mockResolvedValue({
        allowed: true,
        value: { id: 'resp-3' } as unknown as Awaited<
          ReturnType<typeof SimulationRepository.createClassificationResponseTx>
        > extends { allowed: true; value: infer V }
          ? V
          : never,
      });

      const result = await service.classifyEmail(emailId, campaignItemId, traineeProfileId, {
        selectedClassification: 'PHISHING',
        selectedRedFlagTypes: ['SENDER', 'LINK'],
      });

      expect(SimulationRepository.createClassificationResponseTx).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedRedFlagIds: [redFlagId],
          selectedRedFlagTypes: ['SENDER', 'LINK'],
        }),
      );
      expect(result.selectedRedFlagIds).toEqual([redFlagId]);
      expect(result.selectedRedFlagTypes).toEqual(['SENDER', 'LINK']);
    });

    it('returns isCorrect false and corrective feedback for incorrect classification', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        createMockEmailWithAccess() as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(SimulationRepository.findExistingClassificationResponse).mockResolvedValue(null);
      vi.mocked(SimulationRepository.createClassificationResponseTx).mockResolvedValue({
        allowed: true,
        value: { id: 'resp-2' } as unknown as Awaited<
          ReturnType<typeof SimulationRepository.createClassificationResponseTx>
        > extends { allowed: true; value: infer V }
          ? V
          : never,
      });

      const result = await service.classifyEmail(emailId, campaignItemId, traineeProfileId, {
        selectedClassification: 'SAFE',
      });

      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toBe('Not quite. Take a closer look at the red flags.');
    });

    it('throws ALREADY_CLASSIFIED when classification exists before tx', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        createMockEmailWithAccess() as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(SimulationRepository.findExistingClassificationResponse).mockResolvedValue({
        id: 'existing-resp',
      } as unknown as Awaited<
        ReturnType<typeof SimulationRepository.findExistingClassificationResponse>
      >);

      await expect(
        service.classifyEmail(emailId, campaignItemId, traineeProfileId, {
          selectedClassification: 'PHISHING',
        }),
      ).rejects.toThrow('ALREADY_CLASSIFIED');
    });

    it('throws VALIDATION_ERROR when selecting nonexistent red flags for that email', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        createMockEmailWithAccess() as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(SimulationRepository.findExistingClassificationResponse).mockResolvedValue(null);

      await expect(
        service.classifyEmail(emailId, campaignItemId, traineeProfileId, {
          selectedClassification: 'PHISHING',
          selectedRedFlagIds: ['non-existent-red-flag-id'],
        }),
      ).rejects.toThrow('VALIDATION_ERROR');
    });

    it('throws ALREADY_CLASSIFIED when tx returns ALREADY_CLASSIFIED', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        createMockEmailWithAccess() as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(SimulationRepository.findExistingClassificationResponse).mockResolvedValue(null);
      vi.mocked(SimulationRepository.createClassificationResponseTx).mockResolvedValue({
        allowed: false,
        reason: 'ALREADY_CLASSIFIED',
      });

      await expect(
        service.classifyEmail(emailId, campaignItemId, traineeProfileId, {
          selectedClassification: 'PHISHING',
        }),
      ).rejects.toThrow('ALREADY_CLASSIFIED');
    });

    it('throws NOT_FOUND when tx reports NOT_FOUND', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        createMockEmailWithAccess() as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );
      vi.mocked(SimulationRepository.findExistingClassificationResponse).mockResolvedValue(null);
      vi.mocked(SimulationRepository.createClassificationResponseTx).mockResolvedValue({
        allowed: false,
        reason: 'NOT_FOUND',
      });

      await expect(
        service.classifyEmail(emailId, campaignItemId, traineeProfileId, {
          selectedClassification: 'PHISHING',
        }),
      ).rejects.toThrow('NOT_FOUND');
    });
  });
});

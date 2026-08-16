import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationService } from '../../../src/services/simulation.service.js';
import * as SimulationRepository from '../../../src/repositories/simulation.repository.js';
import { CampaignEligibilityDenialError } from '../../../src/services/campaign-eligibility.service.js';

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
    simulatedLinkTarget: 'https://evil.example.com',
    hasAttachment: false,
    receivedAt: new Date('2026-06-01T12:00:00.000Z'),
    difficultyLevel: 'BEGINNER' as const,
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
      simulation: {
        campaignItems: [
          {
            id: campaignItemId,
            campaignId,
            itemType: 'COMPONENT',
            componentType: 'SIMULATED_INBOX',
            availabilityStatus: 'AVAILABLE',
            simulation: {
              safetyStatus: 'APPROVED',
              simulatedInbox: { status: 'ACTIVE' },
            },
            campaign: {
              id: campaignId,
              status: 'ACTIVE' as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED',
              campaignType: 'PREMADE_GENERAL' as const,
              assignments: [{ id: assignmentId }],
            },
          },
        ],
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SimulationService();
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
                difficultyLevel: 'INTERMEDIATE',
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
            difficultyLevel: 'INTERMEDIATE',
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
        simulatedLinkTarget: 'https://evil.example.com',
        hasAttachment: false,
        receivedAt: '2026-06-01T12:00:00.000Z',
        difficultyLevel: 'BEGINNER',
      });
      expect(result).not.toHaveProperty('expectedClassification');
      expect(result).not.toHaveProperty('redFlags');
    });

    it('throws NOT_FOUND when email does not exist', async () => {
      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(null);

      await expect(
        service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId),
      ).rejects.toThrow('NOT_FOUND');
    });

    it('throws FORBIDDEN when simulation inbox is inactive in matching item', async () => {
      const emailData = createMockEmailWithAccess();
      emailData.inbox.simulation.campaignItems[0].simulation.simulatedInbox.status = 'INACTIVE';

      vi.mocked(SimulationRepository.findSimulatedEmailWithAccess).mockResolvedValue(
        emailData as unknown as Awaited<
          ReturnType<typeof SimulationRepository.findSimulatedEmailWithAccess>
        >,
      );

      await expect(
        service.getSimulatedEmail(emailId, campaignItemId, traineeProfileId),
      ).rejects.toThrow('FORBIDDEN');
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

      expect(result).toEqual({
        success: true,
        responseId: 'resp-1',
        selectedClassification: 'PHISHING',
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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findTraineeProfileByUserId,
  findSimulatedInboxCampaignItem,
  findOpenedEmailIds,
  findSimulatedEmailWithAccess,
  hasExistingSimulationEmailHistory,
  recordEmailOpenedEventTx,
  createSimulationInteractionEventGuarded,
  findExistingClassificationResponse,
  createClassificationResponseTx,
} from '../../../src/repositories/simulation.repository.js';
import * as guardRepo from '../../../src/repositories/campaign-progress-guard.repository.js';

const txMock = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  interactionEvent: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  emailClassificationResponse: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  traineeProfile: {
    findUnique: vi.fn(),
  },
  campaignItem: {
    findUnique: vi.fn(),
  },
  interactionEvent: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  simulatedEmail: {
    findUnique: vi.fn(),
  },
  emailClassificationResponse: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(async (cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock)),
}));

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../../../src/repositories/campaign-progress-guard.repository.js', () => ({
  enforceProgressWriteGuard: vi.fn(),
}));

describe('simulation repository', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const traineeProfileId = '22222222-2222-4222-8222-222222222222';
  const campaignItemId = '33333333-3333-4333-8333-333333333333';
  const campaignId = '44444444-4444-4444-8444-444444444444';
  const assignmentId = '55555555-5555-4555-8555-555555555555';
  const emailId = '66666666-6666-4666-8666-666666666666';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findTraineeProfileByUserId', () => {
    it('queries traineeProfile with userId', async () => {
      prismaMock.traineeProfile.findUnique.mockResolvedValue({ id: traineeProfileId, userId });

      const result = await findTraineeProfileByUserId(userId);

      expect(prismaMock.traineeProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toEqual({ id: traineeProfileId, userId });
    });
  });

  describe('findSimulatedInboxCampaignItem', () => {
    it('queries campaignItem with simulation inbox emails and filtered assignments', async () => {
      prismaMock.campaignItem.findUnique.mockResolvedValue({
        id: campaignItemId,
        itemType: 'COMPONENT',
        componentType: 'SIMULATED_INBOX',
      });

      await findSimulatedInboxCampaignItem(campaignItemId, traineeProfileId);

      expect(prismaMock.campaignItem.findUnique).toHaveBeenCalledWith({
        where: { id: campaignItemId },
        include: {
          simulation: {
            include: {
              simulatedInbox: {
                include: {
                  emails: {
                    orderBy: { receivedAt: 'desc' },
                  },
                },
              },
            },
          },
          campaign: {
            include: {
              assignments: {
                where: {
                  traineeProfileId,
                  assignmentStatus: {
                    in: ['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'],
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('findOpenedEmailIds', () => {
    it('returns empty set if emailIds array is empty without querying database', async () => {
      const result = await findOpenedEmailIds({
        traineeProfileId,
        campaignAssignmentId: assignmentId,
        campaignItemId,
        emailIds: [],
      });

      expect(result).toEqual(new Set());
      expect(prismaMock.interactionEvent.findMany).not.toHaveBeenCalled();
    });

    it('returns set of opened simulated email ids', async () => {
      prismaMock.interactionEvent.findMany.mockResolvedValue([
        { simulatedEmailId: emailId },
        { simulatedEmailId: null },
      ]);

      const result = await findOpenedEmailIds({
        traineeProfileId,
        campaignAssignmentId: assignmentId,
        campaignItemId,
        emailIds: [emailId, 'other-email-id'],
      });

      expect(prismaMock.interactionEvent.findMany).toHaveBeenCalledWith({
        where: {
          traineeProfileId,
          campaignAssignmentId: assignmentId,
          campaignItemId,
          eventType: 'SIMULATED_EMAIL_OPENED',
          targetType: 'SIMULATED_EMAIL',
          targetId: { in: [emailId, 'other-email-id'] },
          simulatedEmailId: { in: [emailId, 'other-email-id'] },
        },
        select: {
          simulatedEmailId: true,
        },
      });
      expect(result).toEqual(new Set([emailId]));
    });
  });

  describe('findSimulatedEmailWithAccess', () => {
    it('queries simulatedEmail with access relations and redFlags included conditionally', async () => {
      prismaMock.simulatedEmail.findUnique.mockResolvedValue({ id: emailId });

      await findSimulatedEmailWithAccess(emailId, traineeProfileId, true);

      expect(prismaMock.simulatedEmail.findUnique).toHaveBeenCalledWith({
        where: { id: emailId },
        include: {
          redFlags: true,
          inbox: {
            include: {
              simulation: {
                include: {
                  campaignItems: {
                    include: {
                      simulation: {
                        include: {
                          simulatedInbox: true,
                        },
                      },
                      campaign: {
                        include: {
                          assignments: {
                            where: {
                              traineeProfileId,
                              assignmentStatus: {
                                in: ['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'],
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('hasExistingSimulationEmailHistory', () => {
    it('queries interactionEvent for existing email activity', async () => {
      prismaMock.interactionEvent.findFirst.mockResolvedValue({ id: 'evt-1' });

      await hasExistingSimulationEmailHistory({
        traineeProfileId,
        campaignAssignmentId: assignmentId,
        campaignItemId,
        simulatedEmailId: emailId,
      });

      expect(prismaMock.interactionEvent.findFirst).toHaveBeenCalledWith({
        where: {
          traineeProfileId,
          campaignAssignmentId: assignmentId,
          campaignItemId,
          simulatedEmailId: emailId,
        },
        select: {
          id: true,
        },
      });
    });
  });

  describe('recordEmailOpenedEventTx', () => {
    it('executes advisory lock and creates open event on first open', async () => {
      vi.mocked(guardRepo.enforceProgressWriteGuard).mockResolvedValue({ allowed: true });
      txMock.interactionEvent.findFirst.mockResolvedValue(null);
      txMock.interactionEvent.create.mockResolvedValue({ id: 'evt-1' });

      const checkedAt = new Date();
      const result = await recordEmailOpenedEventTx({
        campaignId,
        traineeProfileId,
        assignmentId,
        itemId: campaignItemId,
        emailId,
        checkedAt,
      });

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(txMock.$executeRaw).toHaveBeenCalled();
      expect(guardRepo.enforceProgressWriteGuard).toHaveBeenCalledWith(txMock, {
        campaignId,
        campaignAssignmentId: assignmentId,
        campaignItemId,
        traineeProfileId,
        checkedAt,
        requiredStatus: 'ACTIVE',
      });
      expect(txMock.interactionEvent.create).toHaveBeenCalledWith({
        data: {
          traineeProfileId,
          campaignAssignmentId: assignmentId,
          campaignItemId,
          eventType: 'SIMULATED_EMAIL_OPENED',
          targetType: 'SIMULATED_EMAIL',
          targetId: emailId,
          simulatedEmailId: emailId,
        },
      });
      expect(result).toEqual({ allowed: true, value: undefined });
    });

    it('is idempotent when open event already exists inside transaction', async () => {
      vi.mocked(guardRepo.enforceProgressWriteGuard).mockResolvedValue({ allowed: true });
      txMock.interactionEvent.findFirst.mockResolvedValue({ id: 'existing-evt' });

      const result = await recordEmailOpenedEventTx({
        campaignId,
        traineeProfileId,
        assignmentId,
        itemId: campaignItemId,
        emailId,
        lockKeyA: 123,
        lockKeyB: 456,
        checkedAt: new Date(),
      });

      expect(txMock.interactionEvent.create).not.toHaveBeenCalled();
      expect(result).toEqual({ allowed: true, value: undefined });
    });

    it('returns guard denial when progress write guard rejects', async () => {
      vi.mocked(guardRepo.enforceProgressWriteGuard).mockResolvedValue({
        allowed: false,
        reason: 'NOT_FOUND',
      });

      const result = await recordEmailOpenedEventTx({
        campaignId,
        traineeProfileId,
        assignmentId,
        itemId: campaignItemId,
        emailId,
        checkedAt: new Date(),
      });

      expect(result).toEqual({ allowed: false, reason: 'NOT_FOUND' });
      expect(txMock.interactionEvent.create).not.toHaveBeenCalled();
    });

    it('rethrows error on transaction failure', async () => {
      vi.mocked(guardRepo.enforceProgressWriteGuard).mockRejectedValue(new Error('DB_DEADLOCK'));

      await expect(
        recordEmailOpenedEventTx({
          campaignId,
          traineeProfileId,
          assignmentId,
          itemId: campaignItemId,
          emailId,
          checkedAt: new Date(),
        }),
      ).rejects.toThrow('DB_DEADLOCK');
    });
  });

  describe('createSimulationInteractionEventGuarded', () => {
    it('creates guarded interaction event when allowed', async () => {
      vi.mocked(guardRepo.enforceProgressWriteGuard).mockResolvedValue({ allowed: true });
      const createdEvent = { id: 'evt-link-click' };
      txMock.interactionEvent.create.mockResolvedValue(createdEvent);

      const checkedAt = new Date();
      const result = await createSimulationInteractionEventGuarded({
        campaignId,
        traineeProfileId,
        campaignAssignmentId: assignmentId,
        campaignItemId,
        eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
        simulatedEmailId: emailId,
        checkedAt,
      });

      expect(txMock.interactionEvent.create).toHaveBeenCalledWith({
        data: {
          traineeProfileId,
          campaignAssignmentId: assignmentId,
          campaignItemId,
          eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
          targetType: 'SIMULATED_EMAIL',
          targetId: emailId,
          simulatedEmailId: emailId,
        },
      });
      expect(result).toEqual({ allowed: true, value: createdEvent });
    });

    it('returns guard rejection when progress guard disallows', async () => {
      vi.mocked(guardRepo.enforceProgressWriteGuard).mockResolvedValue({
        allowed: false,
        reason: 'INELIGIBLE',
      });

      const result = await createSimulationInteractionEventGuarded({
        campaignId,
        traineeProfileId,
        campaignAssignmentId: assignmentId,
        campaignItemId,
        eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
        simulatedEmailId: emailId,
        checkedAt: new Date(),
      });

      expect(result).toEqual({ allowed: false, reason: 'INELIGIBLE' });
      expect(txMock.interactionEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('findExistingClassificationResponse', () => {
    it('queries classification response by trainee and email id', async () => {
      prismaMock.emailClassificationResponse.findFirst.mockResolvedValue({ id: 'resp-1' });

      const result = await findExistingClassificationResponse(traineeProfileId, emailId);

      expect(prismaMock.emailClassificationResponse.findFirst).toHaveBeenCalledWith({
        where: {
          traineeProfileId,
          simulatedEmailId: emailId,
        },
      });
      expect(result).toEqual({ id: 'resp-1' });
    });
  });

  describe('createClassificationResponseTx', () => {
    it('creates classification response and classified interaction event in transaction', async () => {
      vi.mocked(guardRepo.enforceProgressWriteGuard).mockResolvedValue({ allowed: true });
      txMock.emailClassificationResponse.findFirst.mockResolvedValue(null);
      const createdResponse = { id: 'resp-1' };
      txMock.emailClassificationResponse.create.mockResolvedValue(createdResponse);
      txMock.interactionEvent.create.mockResolvedValue({ id: 'evt-classified' });

      const checkedAt = new Date();
      const redFlagId = '77777777-7777-4777-8777-777777777777';
      const result = await createClassificationResponseTx({
        campaignId,
        traineeProfileId,
        simulatedEmailId: emailId,
        assignmentId,
        itemId: campaignItemId,
        selectedClassification: 'PHISHING',
        freeTextReason: 'Suspicious sender and urgent tone',
        isCorrect: true,
        selectedRedFlagIds: [redFlagId],
        checkedAt,
      });

      expect(txMock.emailClassificationResponse.create).toHaveBeenCalledWith({
        data: {
          traineeProfileId,
          simulatedEmailId: emailId,
          campaignAssignmentId: assignmentId,
          campaignItemId,
          selectedClassification: 'PHISHING',
          freeTextReason: 'Suspicious sender and urgent tone',
          isCorrect: true,
          selectedRedFlags: {
            create: [{ emailRedFlagId: redFlagId }],
          },
        },
      });
      expect(txMock.interactionEvent.create).toHaveBeenCalledWith({
        data: {
          traineeProfileId,
          campaignAssignmentId: assignmentId,
          campaignItemId,
          eventType: 'SIMULATED_EMAIL_CLASSIFIED',
          targetType: 'SIMULATED_EMAIL',
          targetId: emailId,
          simulatedEmailId: emailId,
          emailClassificationResponseId: 'resp-1',
        },
      });
      expect(result).toEqual({ allowed: true, value: createdResponse });
    });

    it('returns ALREADY_CLASSIFIED if classification exists inside transaction', async () => {
      vi.mocked(guardRepo.enforceProgressWriteGuard).mockResolvedValue({ allowed: true });
      txMock.emailClassificationResponse.findFirst.mockResolvedValue({ id: 'existing-resp' });

      const result = await createClassificationResponseTx({
        campaignId,
        traineeProfileId,
        simulatedEmailId: emailId,
        assignmentId,
        itemId: campaignItemId,
        selectedClassification: 'SAFE',
        isCorrect: false,
        checkedAt: new Date(),
      });

      expect(result).toEqual({ allowed: false, reason: 'ALREADY_CLASSIFIED' });
      expect(txMock.emailClassificationResponse.create).not.toHaveBeenCalled();
    });

    it('returns guard failure if write guard denies progress', async () => {
      vi.mocked(guardRepo.enforceProgressWriteGuard).mockResolvedValue({
        allowed: false,
        reason: 'NOT_FOUND',
      });

      const result = await createClassificationResponseTx({
        campaignId,
        traineeProfileId,
        simulatedEmailId: emailId,
        assignmentId,
        itemId: campaignItemId,
        selectedClassification: 'SAFE',
        isCorrect: false,
        checkedAt: new Date(),
      });

      expect(result).toEqual({ allowed: false, reason: 'NOT_FOUND' });
      expect(txMock.emailClassificationResponse.create).not.toHaveBeenCalled();
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
<<<<<<< HEAD
import {
  executeBulkCampaignAssignment,
  findAssignableCampaignsByIds,
  findCampaignAssignmentsByCampaign,
  findCampaignAssignmentsByTrainee,
  findEligibleTraineesByIds,
} from '../../../src/repositories/campaign-assignment.repository.js';
=======
import { executeBulkCampaignAssignment } from '../../../src/repositories/campaign-assignment.repository.js';
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    campaign: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    organisationTraineeProfile: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    campaignAssignment: {
      findMany: vi.fn(),
<<<<<<< HEAD
=======
      create: vi.fn(),
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
      createMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe('CampaignAssignmentRepository', () => {
  const organisationId = '11111111-1111-4111-8111-111111111111';
  const campaignId = '22222222-2222-4222-8222-222222222222';
  const traineeProfileId = '33333333-3333-4333-8333-333333333333';
  const actorUserId = '44444444-4444-4444-8444-444444444444';

  beforeEach(() => {
    vi.resetAllMocks();
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((cb) => cb(prisma));
  });

<<<<<<< HEAD
  describe('findAssignableCampaignsByIds', () => {
    it('returns empty array when input campaignIds is empty', async () => {
      const result = await findAssignableCampaignsByIds({ organisationId, campaignIds: [] });
      expect(result).toEqual([]);
      expect(prisma.campaign.findMany).not.toHaveBeenCalled();
    });

    it('queries active custom campaigns by campaignIds for organisation', async () => {
      const mockCampaigns = [
        {
          id: campaignId,
          name: 'Checkers Sixty60 Phishing Awareness',
          status: 'ACTIVE',
          campaignType: 'ORGANISATION_CUSTOM',
        },
      ];
      (prisma.campaign.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockCampaigns);

      const result = await findAssignableCampaignsByIds({
        organisationId,
        campaignIds: [campaignId],
      });

      expect(prisma.campaign.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: [campaignId] },
          organisationId,
          campaignType: 'ORGANISATION_CUSTOM',
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          status: true,
          campaignType: true,
        },
      });
      expect(result).toEqual(mockCampaigns);
    });
  });

  describe('findEligibleTraineesByIds', () => {
    it('returns empty array when input traineeProfileIds is empty', async () => {
      const result = await findEligibleTraineesByIds({ organisationId, traineeProfileIds: [] });
      expect(result).toEqual([]);
      expect(prisma.organisationTraineeProfile.findMany).not.toHaveBeenCalled();
    });

    it('queries active organisation trainees by traineeProfileIds', async () => {
      const mockTrainees = [
        {
          id: 'org-t1',
          traineeProfileId,
        },
      ];
      (prisma.organisationTraineeProfile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockTrainees,
      );

      const result = await findEligibleTraineesByIds({
        organisationId,
        traineeProfileIds: [traineeProfileId],
      });

      expect(prisma.organisationTraineeProfile.findMany).toHaveBeenCalledWith({
        where: {
          organisationId,
          traineeProfileId: { in: [traineeProfileId] },
          membershipStatus: 'ACTIVE',
          traineeProfile: {
            traineeStatus: 'ACTIVE',
            user: {
              userType: 'ORGANISATION_TRAINEE',
              authStatus: 'ACTIVE',
            },
          },
        },
        select: {
          id: true,
          traineeProfileId: true,
        },
      });
      expect(result).toEqual(mockTrainees);
    });
  });

  describe('executeBulkCampaignAssignment', () => {
    it('creates missing assignments and separates existing duplicates', async () => {
      (prisma.campaignAssignment.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([]) // initial existing check
        .mockResolvedValueOnce([
          {
            id: 'assign-1',
            campaignId,
            traineeProfileId,
          },
        ]); // after write re-query

      (prisma.campaignAssignment.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
=======
  describe('executeBulkCampaignAssignment', () => {
    it('creates missing assignments when target campaign and trainee are active', async () => {
      (prisma.campaignAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]); // no existing assignments
      (prisma.campaign.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: campaignId,
          organisationId,
          status: 'ACTIVE',
          campaignType: 'ORGANISATION_CUSTOM',
        },
      ]);
      (prisma.organisationTraineeProfile.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          traineeProfileId,
          membershipStatus: 'ACTIVE',
          traineeProfile: {
            traineeStatus: 'ACTIVE',
            user: { userType: 'ORGANISATION_TRAINEE', authStatus: 'ACTIVE' },
          },
        },
      ]);
      (prisma.campaignAssignment.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'assign-1',
        campaignId,
        traineeProfileId,
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
      });

      const result = await executeBulkCampaignAssignment({
        organisationId,
        campaignIds: [campaignId],
        traineeProfileIds: [traineeProfileId],
        actorUserId,
      });

<<<<<<< HEAD
      expect(prisma.campaignAssignment.createMany).toHaveBeenCalledWith({
        data: [
          {
            campaignId,
            traineeProfileId,
            assignedByUserId: actorUserId,
            accessType: 'ASSIGNED',
            assignmentStatus: 'ASSIGNED',
          },
        ],
        skipDuplicates: true,
      });

      expect(result.created).toHaveLength(1);
      expect(result.alreadyAssigned).toHaveLength(0);
      expect(result.summary).toEqual({
        requestedCampaigns: 1,
        requestedTrainees: 1,
        requestedPairs: 1,
        createdCount: 1,
        alreadyAssignedCount: 0,
      });
    });
  });

  describe('findCampaignAssignmentsByCampaign', () => {
    it('returns formatted paginated assignment read rows', async () => {
      const mockRow = {
        id: 'assign-1',
        campaignId,
        traineeProfileId,
        assignedAt: new Date('2026-08-07T12:00:00Z'),
        startedAt: null,
        completedAt: null,
        assignmentStatus: 'ASSIGNED',
        accessType: 'ASSIGNED',
        campaign: {
          name: 'Checkers Sixty60 Phishing Awareness',
          status: 'ACTIVE',
          campaignType: 'ORGANISATION_CUSTOM',
        },
        traineeProfile: {
          traineeStatus: 'ACTIVE',
          user: {
            firstName: 'Sipho',
            lastName: 'Ndlovu',
            email: 'sipho.ndlovu@rustenburg-cyber.co.za',
          },
        },
      };

      (prisma.campaignAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockRow]);
      (prisma.campaignAssignment.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const result = await findCampaignAssignmentsByCampaign({
        organisationId,
        campaignId,
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        assignmentId: 'assign-1',
        campaignId,
        campaignName: 'Checkers Sixty60 Phishing Awareness',
        campaignStatus: 'ACTIVE',
        campaignType: 'ORGANISATION_CUSTOM',
        traineeProfileId,
        firstName: 'Sipho',
        lastName: 'Ndlovu',
        email: 'sipho.ndlovu@rustenburg-cyber.co.za',
        traineeStatus: 'ACTIVE',
        assignmentStatus: 'ASSIGNED',
        accessType: 'ASSIGNED',
        assignedAt: new Date('2026-08-07T12:00:00Z'),
        startedAt: null,
        completedAt: null,
      });
      expect(result.total).toBe(1);
    });
  });

  describe('findCampaignAssignmentsByTrainee', () => {
    it('returns formatted paginated assignment read rows for trainee profile', async () => {
      const mockRow = {
        id: 'assign-1',
        campaignId,
        traineeProfileId,
        assignedAt: new Date('2026-08-07T12:00:00Z'),
        startedAt: null,
        completedAt: null,
        assignmentStatus: 'ASSIGNED',
        accessType: 'ASSIGNED',
        campaign: {
          name: 'Checkers Sixty60 Phishing Awareness',
          status: 'ACTIVE',
          campaignType: 'ORGANISATION_CUSTOM',
        },
        traineeProfile: {
          traineeStatus: 'ACTIVE',
          user: {
            firstName: 'Anika',
            lastName: 'van der Merwe',
            email: 'anika.vdmerwe@pretoria-tech.co.za',
          },
        },
      };

      (prisma.campaignAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockRow]);
      (prisma.campaignAssignment.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const result = await findCampaignAssignmentsByTrainee({
        organisationId,
        traineeProfileId,
        page: 1,
        limit: 20,
      });

      expect(result.items[0]?.firstName).toBe('Anika');
      expect(result.items[0]?.lastName).toBe('van der Merwe');
      expect(result.total).toBe(1);
=======
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.created).toHaveLength(1);
        expect(result.alreadyAssigned).toHaveLength(0);
      }
    });

    it('returns alreadyAssigned when all pairs already exist even if campaign is PAUSED', async () => {
      (prisma.campaignAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { id: 'assign-existing', campaignId, traineeProfileId },
      ]);

      const result = await executeBulkCampaignAssignment({
        organisationId,
        campaignIds: [campaignId],
        traineeProfileIds: [traineeProfileId],
        actorUserId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.created).toHaveLength(0);
        expect(result.alreadyAssigned).toHaveLength(1);
      }
      expect(prisma.campaign.findMany).not.toHaveBeenCalled();
    });

    it('returns CAMPAIGN_INACTIVE when a new assignment is needed for a PAUSED campaign', async () => {
      (prisma.campaignAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]); // no existing assignments
      (prisma.campaign.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: campaignId,
          organisationId,
          status: 'PAUSED',
          campaignType: 'ORGANISATION_CUSTOM',
        },
      ]);

      const result = await executeBulkCampaignAssignment({
        organisationId,
        campaignIds: [campaignId],
        traineeProfileIds: [traineeProfileId],
        actorUserId,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('CAMPAIGN_INACTIVE');
      }
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
    });
  });
});

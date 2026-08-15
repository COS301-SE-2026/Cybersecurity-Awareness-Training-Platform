import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enrolPlatformCampaign,
  listPlatformCampaigns,
  TraineeCampaignForbiddenError,
  TraineeCampaignNotFoundError,
} from '../../../src/services/trainee-campaign.service.js';
import * as CampaignAssignmentRepository from '../../../src/repositories/campaign-assignment.repository.js';
import { CampaignEligibilityDenialError } from '../../../src/services/campaign-eligibility.service.js';

vi.mock('../../../src/repositories/campaign-assignment.repository.js', () => ({
  findGeneralTraineeActorScope: vi.fn(),
  findActiveGeneralTraineeByUserId: vi.fn(),
  findPlatformCampaignsForDiscovery: vi.fn(),
  findPlatformCampaignById: vi.fn(),
  enrolGeneralTraineeInPlatformCampaign: vi.fn(),
}));

describe('Trainee Campaign Service - Platform Campaign Self-Enrolment', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const traineeProfileId = '22222222-2222-4222-8222-222222222222';
  const campaignId = '33333333-3333-4333-8333-333333333333';
  const assignmentId = '44444444-4444-4444-8444-444444444444';

  type ActorScope = Awaited<
    ReturnType<typeof CampaignAssignmentRepository.findGeneralTraineeActorScope>
  >;

  const validActorScope: NonNullable<ActorScope> = {
    id: userId,
    userType: 'GENERAL_TRAINEE',
    authStatus: 'ACTIVE',
    traineeProfile: {
      id: traineeProfileId,
      traineeStatus: 'ACTIVE',
      generalTraineeProfile: {
        id: 'gen-prof-id',
        accessSource: 'SELF_SIGNUP',
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(CampaignAssignmentRepository.findGeneralTraineeActorScope).mockResolvedValue(
      validActorScope,
    );
  });

  describe('listPlatformCampaigns', () => {
    it('returns discoverable platform campaigns with mapped items and pagination', async () => {
      vi.mocked(
        CampaignAssignmentRepository.findPlatformCampaignsForDiscovery,
      ).mockResolvedValueOnce({
        items: [
          {
            id: campaignId,
            name: 'Platform Awareness',
            description: 'Safe summary',
            accentColor: '#10B981',
            campaignType: 'PREMADE_GENERAL',
            difficultyLevel: 'BEGINNER',
            status: 'ACTIVE',
            startDate: new Date('2026-05-16T08:00:00.000Z'),
            endDate: null,
            items: [
              { id: 'item-1', availabilityStatus: 'AVAILABLE' },
              { id: 'item-2', availabilityStatus: 'LOCKED' },
            ],
            assignment: null,
          },
        ],
        total: 1,
      });

      const result = await listPlatformCampaigns(userId, { page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        campaignId,
        name: 'Platform Awareness',
        campaignType: 'PREMADE_GENERAL',
        status: 'ACTIVE',
        isEnrolled: false,
        assignment: null,
        accessType: null,
        itemCount: 2,
        availableItemCount: 1,
        eligibility: {
          canView: true,
          canProgress: true,
          reason: 'AVAILABLE',
        },
      });
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('maps assignment details and isEnrolled true when trainee is already enrolled', async () => {
      vi.mocked(
        CampaignAssignmentRepository.findPlatformCampaignsForDiscovery,
      ).mockResolvedValueOnce({
        items: [
          {
            id: campaignId,
            name: 'Platform Awareness',
            description: 'Safe summary',
            accentColor: '#10B981',
            campaignType: 'PREMADE_GENERAL',
            difficultyLevel: 'BEGINNER',
            status: 'ACTIVE',
            startDate: new Date('2026-05-16T08:00:00.000Z'),
            endDate: null,
            items: [{ id: 'item-1', availabilityStatus: 'AVAILABLE' }],
            assignment: {
              id: assignmentId,
              assignmentStatus: 'ASSIGNED',
              accessType: 'SELF_SELECTED',
              currentCampaignItemId: null,
              assignedAt: new Date('2026-05-16T08:00:00.000Z'),
              dueDate: null,
              startedAt: null,
              completedAt: null,
            },
          },
        ],
        total: 1,
      });

      const result = await listPlatformCampaigns(userId, { page: 1, limit: 10 });

      expect(result.items[0].isEnrolled).toBe(true);
      expect(result.items[0].accessType).toBe('SELF_SELECTED');
      expect(result.items[0].assignment).toMatchObject({
        assignmentId,
        accessType: 'SELF_SELECTED',
        assignmentStatus: 'ASSIGNED',
      });
    });

    it('throws TraineeCampaignForbiddenError when user is not an active general trainee', async () => {
      vi.mocked(CampaignAssignmentRepository.findGeneralTraineeActorScope).mockResolvedValueOnce({
        ...validActorScope,
        userType: 'ORGANISATION_TRAINEE',
        traineeProfile: {
          id: traineeProfileId,
          traineeStatus: 'ACTIVE',
          generalTraineeProfile: null,
        },
      });

      await expect(listPlatformCampaigns(userId, { page: 1, limit: 10 })).rejects.toThrow(
        TraineeCampaignForbiddenError,
      );
    });

    it('throws TraineeCampaignForbiddenError when trainee profile is inactive', async () => {
      vi.mocked(CampaignAssignmentRepository.findGeneralTraineeActorScope).mockResolvedValueOnce({
        ...validActorScope,
        traineeProfile: {
          id: traineeProfileId,
          traineeStatus: 'INACTIVE',
          generalTraineeProfile: { id: 'g-id', accessSource: 'SELF_SIGNUP' },
        },
      });

      await expect(listPlatformCampaigns(userId, { page: 1, limit: 10 })).rejects.toThrow(
        TraineeCampaignForbiddenError,
      );
    });
  });

  describe('enrolPlatformCampaign', () => {
    const activeCampaignFixture = {
      id: campaignId,
      name: 'Platform Awareness',
      description: 'Premade platform training',
      accentColor: '#10B981',
      campaignType: 'PREMADE_GENERAL',
      difficultyLevel: 'BEGINNER',
      status: 'ACTIVE',
      startDate: new Date('2026-05-16T08:00:00.000Z'),
      endDate: null,
      items: [{ id: 'item-1', availabilityStatus: 'AVAILABLE' }],
    };

    it('creates and returns SELF_SELECTED campaign assignment for active general trainee', async () => {
      vi.mocked(
        CampaignAssignmentRepository.enrolGeneralTraineeInPlatformCampaign,
      ).mockResolvedValueOnce({
        success: true,
        isNew: true,
        assignment: {
          id: assignmentId,
          campaignId,
          traineeProfileId,
          assignmentStatus: 'ASSIGNED',
          accessType: 'SELF_SELECTED',
          currentCampaignItemId: null,
          assignedAt: new Date('2026-05-16T08:00:00.000Z'),
          dueDate: null,
          startedAt: null,
          completedAt: null,
        },
        campaign: activeCampaignFixture,
      });

      const result = await enrolPlatformCampaign(userId, campaignId);

      expect(result).toMatchObject({
        campaignId,
        name: 'Platform Awareness',
        campaignType: 'PREMADE_GENERAL',
        status: 'ACTIVE',
        accessType: 'SELF_SELECTED',
        assignment: {
          assignmentId,
          accessType: 'SELF_SELECTED',
          assignmentStatus: 'ASSIGNED',
        },
        itemCount: 1,
        availableItemCount: 1,
        eligibility: {
          canView: true,
          canProgress: true,
          reason: 'AVAILABLE',
        },
      });
    });

    it('returns existing assignment idempotently without error', async () => {
      vi.mocked(
        CampaignAssignmentRepository.enrolGeneralTraineeInPlatformCampaign,
      ).mockResolvedValueOnce({
        success: true,
        isNew: false,
        assignment: {
          id: assignmentId,
          campaignId,
          traineeProfileId,
          assignmentStatus: 'IN_PROGRESS',
          accessType: 'SELF_SELECTED',
          currentCampaignItemId: '55555555-5555-4555-8555-555555555555',
          assignedAt: new Date('2026-05-16T08:00:00.000Z'),
          dueDate: null,
          startedAt: new Date('2026-05-16T08:30:00.000Z'),
          completedAt: null,
        },
        campaign: activeCampaignFixture,
      });

      const result = await enrolPlatformCampaign(userId, campaignId);

      expect(result.assignment).toMatchObject({
        assignmentId,
        assignmentStatus: 'IN_PROGRESS',
        accessType: 'SELF_SELECTED',
      });
    });

    it('preserves existing ASSIGNED accessType when self-enrol is called', async () => {
      vi.mocked(
        CampaignAssignmentRepository.enrolGeneralTraineeInPlatformCampaign,
      ).mockResolvedValueOnce({
        success: true,
        isNew: false,
        assignment: {
          id: assignmentId,
          campaignId,
          traineeProfileId,
          assignmentStatus: 'ASSIGNED',
          accessType: 'ASSIGNED',
          currentCampaignItemId: null,
          assignedAt: new Date('2026-05-16T08:00:00.000Z'),
          dueDate: null,
          startedAt: null,
          completedAt: null,
        },
        campaign: activeCampaignFixture,
      });

      const result = await enrolPlatformCampaign(userId, campaignId);

      expect(result.accessType).toBe('ASSIGNED');
      expect(result.assignment?.accessType).toBe('ASSIGNED');
    });

    it('throws TraineeCampaignNotFoundError when campaign is not found', async () => {
      vi.mocked(
        CampaignAssignmentRepository.enrolGeneralTraineeInPlatformCampaign,
      ).mockResolvedValueOnce({
        success: false,
        error: 'CAMPAIGN_NOT_FOUND',
        message: 'Platform campaign was not found',
      });

      await expect(enrolPlatformCampaign(userId, campaignId)).rejects.toThrow(
        TraineeCampaignNotFoundError,
      );
    });

    it('throws TraineeCampaignForbiddenError when trainee is not eligible', async () => {
      vi.mocked(
        CampaignAssignmentRepository.enrolGeneralTraineeInPlatformCampaign,
      ).mockResolvedValueOnce({
        success: false,
        error: 'TRAINEE_NOT_ELIGIBLE',
        message: 'Trainee is not an active general trainee',
      });

      await expect(enrolPlatformCampaign(userId, campaignId)).rejects.toThrow(
        TraineeCampaignForbiddenError,
      );
    });

    it('throws CampaignEligibilityDenialError when campaign is inactive', async () => {
      vi.mocked(
        CampaignAssignmentRepository.enrolGeneralTraineeInPlatformCampaign,
      ).mockResolvedValueOnce({
        success: false,
        error: 'CAMPAIGN_INACTIVE',
        message: 'Campaign is not active',
      });

      await expect(enrolPlatformCampaign(userId, campaignId)).rejects.toThrow(
        CampaignEligibilityDenialError,
      );
    });
  });
});

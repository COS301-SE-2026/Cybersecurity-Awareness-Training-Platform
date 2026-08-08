import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CampaignAssignmentServiceError,
  createCampaignAssignments,
  getAssignableCampaigns,
<<<<<<< HEAD
  getAssignmentCandidates,
  getCampaignAssignmentsByCampaign,
  getCampaignAssignmentsByTrainee,
=======
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
} from '../../../src/services/campaign-assignment.service.js';

const repoMock = vi.hoisted(() => ({
  findActorOrganisationAdmin: vi.fn(),
  findActorOrganisationTrainee: vi.fn(),
  findAssignableCampaigns: vi.fn(),
  findAssignmentCandidates: vi.fn(),
  findAssignableCampaignsByIds: vi.fn(),
  findEligibleTraineesByIds: vi.fn(),
  findCampaignByIdInOrganisation: vi.fn(),
  findTraineeByIdInOrganisation: vi.fn(),
  executeBulkCampaignAssignment: vi.fn(),
  findCampaignAssignmentsByCampaign: vi.fn(),
  findCampaignAssignmentsByTrainee: vi.fn(),
}));

const auditMock = vi.hoisted(() => ({
  recordAuditLog: vi.fn(),
}));

vi.mock('../../../src/repositories/campaign-assignment.repository.js', () => repoMock);
vi.mock('../../../src/services/audit-log.service.js', () => auditMock);

describe('CampaignAssignmentService', () => {
  const organisationId = '11111111-1111-4111-8111-111111111111';
  const actorUserId = '22222222-2222-4222-8222-222222222222';
  const campaignId1 = '33333333-3333-4333-8333-333333333333';
  const campaignId2 = '44444444-4444-4444-8444-444444444444';
  const traineeProfileId1 = '55555555-5555-4555-8555-555555555555';
  const traineeProfileId2 = '66666666-6666-4666-8666-666666666666';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getAssignableCampaigns', () => {
    it('throws 404 INACCESSIBLE_ORGANISATION if actor is not an admin or trainee of the organisation', async () => {
      repoMock.findActorOrganisationAdmin.mockResolvedValue(null);
      repoMock.findActorOrganisationTrainee.mockResolvedValue(null);

      await expect(
        getAssignableCampaigns(actorUserId, organisationId, { page: 1, limit: 20 }),
      ).rejects.toThrow(CampaignAssignmentServiceError);

      try {
        await getAssignableCampaigns(actorUserId, organisationId, { page: 1, limit: 20 });
      } catch (err: unknown) {
        if (err instanceof CampaignAssignmentServiceError) {
          expect(err.statusCode).toBe(404);
          expect(err.error).toBe('INACCESSIBLE_ORGANISATION');
        } else {
          throw err;
        }
      }
    });

    it('throws 403 FORBIDDEN_ORGANISATION_ROLE if actor is a same-organisation trainee', async () => {
      repoMock.findActorOrganisationAdmin.mockResolvedValue(null);
      repoMock.findActorOrganisationTrainee.mockResolvedValue({
        id: 'trainee-profile-1',
        organisation: { status: 'ACTIVE' },
      });

      try {
        await getAssignableCampaigns(actorUserId, organisationId, { page: 1, limit: 20 });
      } catch (err: unknown) {
        if (err instanceof CampaignAssignmentServiceError) {
          expect(err.statusCode).toBe(403);
          expect(err.error).toBe('FORBIDDEN_ORGANISATION_ROLE');
          expect(err.message).toBe('Trainees cannot manage campaign assignments');
        } else {
          throw err;
        }
      }
    });

    it('throws 403 if organisation is inactive', async () => {
      repoMock.findActorOrganisationAdmin.mockResolvedValue({
        id: 'admin-1',
        organisation: { status: 'INACTIVE' },
        isInitialAdmin: true,
        permissionGrants: [{ organisationPermission: { key: 'ASSIGN_CAMPAIGNS' } }],
      });

      try {
        await getAssignableCampaigns(actorUserId, organisationId, { page: 1, limit: 20 });
      } catch (err: unknown) {
        if (err instanceof CampaignAssignmentServiceError) {
          expect(err.statusCode).toBe(403);
          expect(err.error).toBe('ORGANISATION_NOT_ACTIVE');
        } else {
          throw err;
        }
      }
    });

<<<<<<< HEAD
    it('throws 403 if admin (including initial admin) lacks explicit ASSIGN_CAMPAIGNS grant', async () => {
      repoMock.findActorOrganisationAdmin.mockResolvedValue({
        id: 'admin-1',
        organisation: { status: 'ACTIVE' },
        isInitialAdmin: true,
        permissionGrants: [{ organisationPermission: { key: 'VIEW_ORGANISATION_ADMINS' } }],
      });

      try {
        await getAssignableCampaigns(actorUserId, organisationId, { page: 1, limit: 20 });
      } catch (err: unknown) {
        if (err instanceof CampaignAssignmentServiceError) {
          expect(err.statusCode).toBe(403);
          expect(err.error).toBe('MISSING_ASSIGN_CAMPAIGNS_PERMISSION');
        } else {
          throw err;
        }
      }
    });

=======
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
    it('returns assignable campaigns for authorized admin with explicit grant', async () => {
      repoMock.findActorOrganisationAdmin.mockResolvedValue({
        id: 'admin-1',
        organisation: { status: 'ACTIVE' },
        isInitialAdmin: false,
        permissionGrants: [{ organisationPermission: { key: 'ASSIGN_CAMPAIGNS' } }],
      });
      repoMock.findAssignableCampaigns.mockResolvedValue({
        items: [
          {
            id: campaignId1,
            name: 'Checkers Sixty60 Phishing Awareness',
            description: 'South African retail security training',
            status: 'ACTIVE',
            campaignType: 'ORGANISATION_CUSTOM',
            startDate: new Date('2026-09-01T00:00:00Z'),
            endDate: null,
            itemCount: 5,
            assignmentCount: 10,
          },
        ],
        total: 1,
      });

      const result = await getAssignableCampaigns(actorUserId, organisationId, {
        page: 1,
        limit: 20,
        search: '  Checkers  ',
      });

<<<<<<< HEAD
      expect(repoMock.findAssignableCampaigns).toHaveBeenCalledWith({
        organisationId,
        page: 1,
        limit: 20,
        search: '  Checkers  ',
      });

      expect(result).toEqual({
        items: [
          {
            campaignId: campaignId1,
            name: 'Checkers Sixty60 Phishing Awareness',
            description: 'South African retail security training',
            status: 'ACTIVE',
            type: 'ORGANISATION_CUSTOM',
            itemCount: 5,
            startDate: '2026-09-01T00:00:00.000Z',
            endDate: null,
            assignmentCount: 10,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });
    });
  });

  describe('getAssignmentCandidates', () => {
    it('returns candidates for authorized admin with explicit grant', async () => {
      repoMock.findActorOrganisationAdmin.mockResolvedValue({
        id: 'admin-1',
        organisation: { status: 'ACTIVE' },
        isInitialAdmin: true,
        permissionGrants: [{ organisationPermission: { key: 'ASSIGN_CAMPAIGNS' } }],
      });
      repoMock.findAssignmentCandidates.mockResolvedValue({
        items: [
          {
            id: 'org-trainee-1',
            traineeProfileId: traineeProfileId1,
            userId: 'user-1',
            firstName: 'Sipho',
            lastName: 'Ndlovu',
            email: 'sipho.ndlovu@rustenburg-cyber.co.za',
            membershipStatus: 'ACTIVE',
          },
        ],
        total: 1,
      });

      const result = await getAssignmentCandidates(actorUserId, organisationId, {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({
        items: [
          {
            traineeProfileId: traineeProfileId1,
            organisationTraineeProfileId: 'org-trainee-1',
            userId: 'user-1',
            displayName: 'Sipho Ndlovu',
            email: 'sipho.ndlovu@rustenburg-cyber.co.za',
            active: true,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });
=======
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.name).toBe('Checkers Sixty60 Phishing Awareness');
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
    });
  });

  describe('createCampaignAssignments', () => {
    it('successfully creates assignments for all valid targets and records audit log', async () => {
      repoMock.findActorOrganisationAdmin.mockResolvedValue({
        id: 'admin-1',
        organisation: { status: 'ACTIVE' },
        permissionGrants: [{ organisationPermission: { key: 'ASSIGN_CAMPAIGNS' } }],
      });
<<<<<<< HEAD
      repoMock.findAssignableCampaignsByIds.mockResolvedValue([
        { id: campaignId1, name: 'Checkers Sixty60 Phishing Awareness' },
      ]);
      repoMock.findEligibleTraineesByIds.mockResolvedValue([
        { id: 'org-t1', traineeProfileId: traineeProfileId1 },
      ]);
      repoMock.executeBulkCampaignAssignment.mockResolvedValue({
=======
      repoMock.executeBulkCampaignAssignment.mockResolvedValue({
        success: true,
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
        created: [
          {
            assignmentId: 'assign-1',
            campaignId: campaignId1,
            traineeProfileId: traineeProfileId1,
          },
        ],
        alreadyAssigned: [],
        summary: {
          requestedCampaigns: 1,
          requestedTrainees: 1,
          requestedPairs: 1,
          createdCount: 1,
          alreadyAssignedCount: 0,
        },
      });

      const result = await createCampaignAssignments(actorUserId, organisationId, {
        campaignIds: [campaignId1],
        traineeProfileIds: [traineeProfileId1],
      });

<<<<<<< HEAD
      expect(repoMock.findAssignableCampaignsByIds).toHaveBeenCalledWith({
        organisationId,
        campaignIds: [campaignId1],
      });
      expect(repoMock.findEligibleTraineesByIds).toHaveBeenCalledWith({
        organisationId,
        traineeProfileIds: [traineeProfileId1],
      });
=======
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
      expect(repoMock.executeBulkCampaignAssignment).toHaveBeenCalledWith({
        organisationId,
        campaignIds: [campaignId1],
        traineeProfileIds: [traineeProfileId1],
        actorUserId,
      });

      expect(auditMock.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId,
          actorType: 'ORGANISATION_ADMIN',
          organisationId,
          targetType: 'CAMPAIGN',
          actionType: 'CREATED',
          outcome: 'SUCCESS',
        }),
      );

      expect(result.created).toHaveLength(1);
      expect(result.summary.createdCount).toBe(1);
    });

<<<<<<< HEAD
    it('all-or-nothing: throws 404 CAMPAIGN_NOT_FOUND when any requested campaign is missing or ineligible', async () => {
=======
    it('throws 404 CAMPAIGN_NOT_FOUND when repo signals missing/foreign campaign', async () => {
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
      repoMock.findActorOrganisationAdmin.mockResolvedValue({
        id: 'admin-1',
        organisation: { status: 'ACTIVE' },
        permissionGrants: [{ organisationPermission: { key: 'ASSIGN_CAMPAIGNS' } }],
      });
<<<<<<< HEAD
      repoMock.findAssignableCampaignsByIds.mockResolvedValue([
        { id: campaignId1, name: 'Checkers Sixty60 Phishing Awareness' },
      ]); // campaignId2 missing!

      await expect(
        createCampaignAssignments(actorUserId, organisationId, {
          campaignIds: [campaignId1, campaignId2],
          traineeProfileIds: [traineeProfileId1],
        }),
      ).rejects.toThrow(CampaignAssignmentServiceError);

      expect(repoMock.executeBulkCampaignAssignment).not.toHaveBeenCalled();
    });

    it('all-or-nothing: throws 404 TRAINEE_NOT_FOUND when any requested trainee is missing or inactive', async () => {
=======
      repoMock.executeBulkCampaignAssignment.mockResolvedValue({
        success: false,
        error: 'CAMPAIGN_NOT_FOUND',
        message: 'Campaign not found in organisation',
      });

      try {
        await createCampaignAssignments(actorUserId, organisationId, {
          campaignIds: [campaignId1, campaignId2],
          traineeProfileIds: [traineeProfileId1],
        });
      } catch (err: unknown) {
        if (err instanceof CampaignAssignmentServiceError) {
          expect(err.statusCode).toBe(404);
          expect(err.error).toBe('CAMPAIGN_NOT_FOUND');
        } else {
          throw err;
        }
      }
    });

    it('throws 409 CAMPAIGN_INACTIVE when repo signals inactive campaign needed for new assignment', async () => {
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
      repoMock.findActorOrganisationAdmin.mockResolvedValue({
        id: 'admin-1',
        organisation: { status: 'ACTIVE' },
        permissionGrants: [{ organisationPermission: { key: 'ASSIGN_CAMPAIGNS' } }],
      });
<<<<<<< HEAD
      repoMock.findAssignableCampaignsByIds.mockResolvedValue([
        { id: campaignId1, name: 'Checkers Sixty60 Phishing Awareness' },
      ]);
      repoMock.findEligibleTraineesByIds.mockResolvedValue([
        { id: 'org-t1', traineeProfileId: traineeProfileId1 },
      ]); // traineeProfileId2 missing!

      await expect(
        createCampaignAssignments(actorUserId, organisationId, {
          campaignIds: [campaignId1],
          traineeProfileIds: [traineeProfileId1, traineeProfileId2],
        }),
      ).rejects.toThrow(CampaignAssignmentServiceError);

      expect(repoMock.executeBulkCampaignAssignment).not.toHaveBeenCalled();
    });
  });

  describe('getCampaignAssignmentsByCampaign', () => {
    it('throws 404 CAMPAIGN_NOT_FOUND if campaign is not in organisation', async () => {
=======
      repoMock.executeBulkCampaignAssignment.mockResolvedValue({
        success: false,
        error: 'CAMPAIGN_INACTIVE',
        message: 'One or more specified campaigns are inactive',
      });

      try {
        await createCampaignAssignments(actorUserId, organisationId, {
          campaignIds: [campaignId1],
          traineeProfileIds: [traineeProfileId1],
        });
      } catch (err: unknown) {
        if (err instanceof CampaignAssignmentServiceError) {
          expect(err.statusCode).toBe(409);
          expect(err.error).toBe('CAMPAIGN_INACTIVE');
        } else {
          throw err;
        }
      }
    });

    it('throws 409 TRAINEE_DISABLED when repo signals disabled trainee needed for new assignment', async () => {
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
      repoMock.findActorOrganisationAdmin.mockResolvedValue({
        id: 'admin-1',
        organisation: { status: 'ACTIVE' },
        permissionGrants: [{ organisationPermission: { key: 'ASSIGN_CAMPAIGNS' } }],
      });
<<<<<<< HEAD
      repoMock.findCampaignByIdInOrganisation.mockResolvedValue(null);

      await expect(
        getCampaignAssignmentsByCampaign(actorUserId, organisationId, campaignId1, {
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(CampaignAssignmentServiceError);
    });

    it('returns paginated assignments for existing campaign', async () => {
      repoMock.findActorOrganisationAdmin.mockResolvedValue({
        id: 'admin-1',
        organisation: { status: 'ACTIVE' },
        permissionGrants: [{ organisationPermission: { key: 'ASSIGN_CAMPAIGNS' } }],
      });
      repoMock.findCampaignByIdInOrganisation.mockResolvedValue({ id: campaignId1 });
      repoMock.findCampaignAssignmentsByCampaign.mockResolvedValue({
        items: [
          {
            assignmentId: 'assign-1',
            campaignId: campaignId1,
            campaignName: 'Checkers Sixty60 Phishing Awareness',
            campaignStatus: 'ACTIVE',
            campaignType: 'ORGANISATION_CUSTOM',
            traineeProfileId: traineeProfileId1,
            firstName: 'Anika',
            lastName: 'van der Merwe',
            email: 'anika.vdmerwe@pretoria-tech.co.za',
            traineeStatus: 'ACTIVE',
            assignmentStatus: 'ASSIGNED',
            accessType: 'ASSIGNED',
            assignedAt: new Date('2026-08-07T12:00:00Z'),
            startedAt: null,
            completedAt: null,
          },
        ],
        total: 1,
      });

      const result = await getCampaignAssignmentsByCampaign(
        actorUserId,
        organisationId,
        campaignId1,
        {
          page: 1,
          limit: 20,
          search: 'Anika',
        },
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.displayName).toBe('Anika van der Merwe');
      expect(result.items[0]?.email).toBe('anika.vdmerwe@pretoria-tech.co.za');
    });
  });

  describe('getCampaignAssignmentsByTrainee', () => {
    it('throws 404 TRAINEE_NOT_FOUND if trainee profile is not in organisation', async () => {
      repoMock.findActorOrganisationAdmin.mockResolvedValue({
        id: 'admin-1',
        organisation: { status: 'ACTIVE' },
        permissionGrants: [{ organisationPermission: { key: 'ASSIGN_CAMPAIGNS' } }],
      });
      repoMock.findTraineeByIdInOrganisation.mockResolvedValue(null);

      await expect(
        getCampaignAssignmentsByTrainee(actorUserId, organisationId, traineeProfileId1, {
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(CampaignAssignmentServiceError);
    });

    it('returns paginated assignments for existing trainee profile', async () => {
      repoMock.findActorOrganisationAdmin.mockResolvedValue({
        id: 'admin-1',
        organisation: { status: 'ACTIVE' },
        permissionGrants: [{ organisationPermission: { key: 'ASSIGN_CAMPAIGNS' } }],
      });
      repoMock.findTraineeByIdInOrganisation.mockResolvedValue({ id: 'org-t1' });
      repoMock.findCampaignAssignmentsByTrainee.mockResolvedValue({
        items: [
          {
            assignmentId: 'assign-1',
            campaignId: campaignId1,
            campaignName: 'Checkers Sixty60 Phishing Awareness',
            campaignStatus: 'ACTIVE',
            campaignType: 'ORGANISATION_CUSTOM',
            traineeProfileId: traineeProfileId1,
            firstName: 'Sipho',
            lastName: 'Ndlovu',
            email: 'sipho.ndlovu@rustenburg-cyber.co.za',
            traineeStatus: 'ACTIVE',
            assignmentStatus: 'ASSIGNED',
            accessType: 'ASSIGNED',
            assignedAt: new Date('2026-08-07T12:00:00Z'),
            startedAt: null,
            completedAt: null,
          },
        ],
        total: 1,
      });

      const result = await getCampaignAssignmentsByTrainee(
        actorUserId,
        organisationId,
        traineeProfileId1,
        {
          page: 1,
          limit: 20,
        },
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.campaignName).toBe('Checkers Sixty60 Phishing Awareness');
=======
      repoMock.executeBulkCampaignAssignment.mockResolvedValue({
        success: false,
        error: 'TRAINEE_DISABLED',
        message: 'One or more specified trainees are disabled',
      });

      try {
        await createCampaignAssignments(actorUserId, organisationId, {
          campaignIds: [campaignId1],
          traineeProfileIds: [traineeProfileId2],
        });
      } catch (err: unknown) {
        if (err instanceof CampaignAssignmentServiceError) {
          expect(err.statusCode).toBe(409);
          expect(err.error).toBe('TRAINEE_DISABLED');
        } else {
          throw err;
        }
      }
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CampaignAssignmentServiceError,
  getAssignableCampaigns,
  getAssignmentCandidates,
} from '../../../src/services/campaign-assignment.service.js';

const repoMock = vi.hoisted(() => ({
  findActorOrganisationAdmin: vi.fn(),
  findAssignableCampaigns: vi.fn(),
  findAssignmentCandidates: vi.fn(),
}));

vi.mock('../../../src/repositories/campaign-assignment.repository.js', () => repoMock);

describe('CampaignAssignmentService', () => {
  const organisationId = '11111111-1111-4111-8111-111111111111';
  const actorUserId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getAssignableCampaigns', () => {
    it('throws 404 INACCESSIBLE_ORGANISATION if actor is not an admin of the organisation', async () => {
      repoMock.findActorOrganisationAdmin.mockResolvedValue(null);

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
            id: 'camp-1',
            name: 'Security 101',
            description: 'Basic security training',
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
        search: '  Security  ',
      });

      expect(repoMock.findAssignableCampaigns).toHaveBeenCalledWith({
        organisationId,
        page: 1,
        limit: 20,
        search: '  Security  ',
      });

      expect(result).toEqual({
        items: [
          {
            campaignId: 'camp-1',
            name: 'Security 101',
            description: 'Basic security training',
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
            traineeProfileId: 'trainee-prof-1',
            userId: 'user-1',
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'alice@example.test',
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
            traineeProfileId: 'trainee-prof-1',
            organisationTraineeProfileId: 'org-trainee-1',
            userId: 'user-1',
            displayName: 'Alice Smith',
            email: 'alice@example.test',
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
    });
  });
});

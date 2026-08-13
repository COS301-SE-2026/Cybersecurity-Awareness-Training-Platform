import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as CampaignManagementService from '../../../src/services/campaign-management.service.js';
import * as CampaignManagementRepository from '../../../src/repositories/campaign-management.repository.js';
import * as OrganisationScopeRepository from '../../../src/repositories/organisation-scope.repository.js';

vi.mock('../../../src/repositories/campaign-management.repository.js');
vi.mock('../../../src/repositories/organisation-scope.repository.js');

describe('CampaignManagementService Unit Tests', () => {
  const adminActor: CampaignManagementService.UserActorContext = {
    userId: 'user-admin-1',
    userType: 'ORGANISATION_ADMIN',
  };

  const platformActor: CampaignManagementService.UserActorContext = {
    userId: 'user-ip-1',
    userType: 'IP_ADMIN',
  };

  const orgId = 'org-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects draft creation if endDate is before startDate', async () => {
    vi.mocked(OrganisationScopeRepository.findOrganisationAdminActorScope).mockResolvedValue({
      id: 'admin-prof-1',
      userId: adminActor.userId,
      organisationId: orgId,
      adminStatus: 'ACTIVE',
      organisation: { id: orgId, name: 'Test Org', status: 'ACTIVE' },
      permissionGrants: [{ organisationPermission: { key: 'MANAGE_CAMPAIGNS' } }],
    } as any);

    await expect(
      CampaignManagementService.createOrganisationCampaignDraft(adminActor, orgId, {
        name: 'Invalid Date Campaign',
        accentColor: '#123456',
        startDate: '2026-06-10T10:00:00Z',
        endDate: '2026-06-01T10:00:00Z',
        items: [],
      }),
    ).rejects.toThrowError(CampaignManagementService.CampaignManagementServiceError);
  });

  it('rejects platform campaign draft if dates are provided', async () => {
    vi.mocked(OrganisationScopeRepository.findActiveIpAdminScope).mockResolvedValue({
      id: 'ip-admin-1',
      userId: platformActor.userId,
      adminStatus: 'ACTIVE',
      platformAdminRole: 'SUPER_ADMIN',
    });

    await expect(
      CampaignManagementService.createPlatformCampaignDraft(platformActor, {
        name: 'Platform Campaign with Date',
        accentColor: '#123456',
        startDate: '2026-06-01T10:00:00Z',
        items: [],
      }),
    ).rejects.toThrowError(CampaignManagementService.CampaignManagementServiceError);
  });

  it('allows organisation admin with VIEW_CAMPAIGNS to fetch campaign list', async () => {
    vi.mocked(OrganisationScopeRepository.findOrganisationAdminActorScope).mockResolvedValue({
      id: 'admin-prof-1',
      userId: adminActor.userId,
      organisationId: orgId,
      adminStatus: 'ACTIVE',
      organisation: { id: orgId, name: 'Test Org', status: 'ACTIVE' },
      permissionGrants: [{ organisationPermission: { key: 'VIEW_CAMPAIGNS' } }],
    } as any);

    vi.mocked(CampaignManagementRepository.findCampaigns).mockResolvedValue({
      items: [
        {
          id: 'camp-1',
          organisationId: orgId,
          name: 'Security 101',
          description: 'Basic security',
          accentColor: '#0055FF',
          campaignType: 'ORGANISATION_CUSTOM',
          status: 'DRAFT',
          itemCount: 2,
          startDate: null,
          endDate: null,
          createdBy: { id: 'u1', displayName: 'Admin User', email: 'admin@example.com' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
    });

    const res = await CampaignManagementService.getOrganisationCampaigns(adminActor, orgId, {
      page: 1,
      limit: 10,
    });

    expect(res.items).toHaveLength(1);
    expect(res.items[0].allowedActions).toEqual(['VIEW']);
  });
});

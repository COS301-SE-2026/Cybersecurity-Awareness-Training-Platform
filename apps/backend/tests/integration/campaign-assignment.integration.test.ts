import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { activateOrganisationAdminUser } from '../../src/repositories/setup.repository.js';
import {
  findActorOrganisationAdmin,
  findAssignableCampaigns,
  findAssignmentCandidates,
} from '../../src/repositories/campaign-assignment.repository.js';
import {
  CampaignAssignmentServiceError,
  getAssignableCampaigns,
} from '../../src/services/campaign-assignment.service.js';

const app = createApp();
const NOW = new Date('2026-08-01T08:00:00.000Z');
const CREDENTIAL_HASH = ['scrypt', 'campaign-assignment', 'fixture'].join('$');

function testId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function testEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@example.test`;
}

async function createOrganisation(
  namePrefix: string,
  status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE',
): Promise<string> {
  const organisationId = testId('org');
  await prisma.organisation.create({
    data: {
      id: organisationId,
      name: `${namePrefix} ${randomUUID()}`,
      status,
      updatedAt: NOW,
    },
  });

  const permissionKeys = [
    'VIEW_ORGANISATION_ADMINS',
    'INVITE_ORGANISATION_ADMINS',
    'REMOVE_ORGANISATION_ADMINS',
    'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
    'CHANGE_ORGANISATION_SECURITY_SETTINGS',
    'VIEW_ORGANISATION_TRAINEES',
    'INVITE_ORGANISATION_TRAINEES',
    'REMOVE_ORGANISATION_TRAINEES',
    'ASSIGN_CAMPAIGNS',
  ] as const;

  for (const key of permissionKeys) {
    await prisma.organisationPermission.create({
      data: {
        id: ['organisation-permission', organisationId, key].join('-'),
        organisationId,
        key,
        displayName: key,
        description: `${key} permission`,
        isCritical: false,
      },
    });
  }

  return organisationId;
}

async function createAdminUser(input: {
  organisationId: string;
  isInitialAdmin?: boolean;
  grantAssignCampaigns?: boolean;
  authStatus?: 'ACTIVE' | 'DISABLED';
  userType?: 'ORGANISATION_ADMIN' | 'ORGANISATION_TRAINEE';
}) {
  const userId = testId('user-admin');
  const email = testEmail('admin');

  await prisma.user.create({
    data: {
      id: userId,
      email,
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: CREDENTIAL_HASH,
      userType: input.userType ?? 'ORGANISATION_ADMIN',
      authStatus: input.authStatus ?? 'ACTIVE',
      emailVerifiedAt: NOW,
    },
  });

  const adminProfile = await prisma.organisationAdminProfile.create({
    data: {
      id: testId('org-admin'),
      userId,
      organisationId: input.organisationId,
      adminStatus: 'ACTIVE',
      isInitialAdmin: input.isInitialAdmin ?? false,
    },
  });

  if (input.grantAssignCampaigns) {
    const permission = await prisma.organisationPermission.findFirstOrThrow({
      where: { organisationId: input.organisationId, key: 'ASSIGN_CAMPAIGNS' },
    });

    await prisma.organisationAdminPermission.create({
      data: {
        id: testId('grant'),
        organisationId: input.organisationId,
        organisationAdminId: adminProfile.id,
        organisationPermissionId: permission.id,
      },
    });
  }

  return { userId, adminProfileId: adminProfile.id, email };
}

async function createTraineeUser(input: {
  organisationId: string;
  firstName: string;
  lastName: string;
  emailPrefix?: string;
  userType?: 'ORGANISATION_TRAINEE' | 'ORGANISATION_ADMIN';
  authStatus?: 'ACTIVE' | 'DISABLED';
  traineeStatus?: 'ACTIVE' | 'INACTIVE';
  membershipStatus?: 'ACTIVE' | 'DISABLED';
}) {
  const userId = testId('user-trainee');
  const email = testEmail(input.emailPrefix ?? 'trainee');

  await prisma.user.create({
    data: {
      id: userId,
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: CREDENTIAL_HASH,
      userType: input.userType ?? 'ORGANISATION_TRAINEE',
      authStatus: input.authStatus ?? 'ACTIVE',
      emailVerifiedAt: NOW,
    },
  });

  const traineeProfile = await prisma.traineeProfile.create({
    data: {
      id: testId('trainee-prof'),
      userId,
      traineeStatus: input.traineeStatus ?? 'ACTIVE',
    },
  });

  const orgTraineeProfile = await prisma.organisationTraineeProfile.create({
    data: {
      id: testId('org-trainee-prof'),
      organisationId: input.organisationId,
      traineeProfileId: traineeProfile.id,
      membershipStatus: input.membershipStatus ?? 'ACTIVE',
    },
  });

  return {
    userId,
    traineeProfileId: traineeProfile.id,
    orgTraineeProfileId: orgTraineeProfile.id,
    email,
  };
}

async function createCampaign(input: {
  organisationId: string;
  name: string;
  description?: string;
  status?: 'ACTIVE' | 'DRAFT' | 'COMPLETED';
  campaignType?: 'ORGANISATION_CUSTOM' | 'PREMADE_GENERAL';
}) {
  return prisma.campaign.create({
    data: {
      id: testId('camp'),
      organisationId: input.organisationId,
      name: input.name,
      description: input.description ?? 'Test campaign description',
      status: input.status ?? 'ACTIVE',
      campaignType: input.campaignType ?? 'ORGANISATION_CUSTOM',
      startDate: NOW,
    },
  });
}

describe('Campaign Assignment Integration Tests', () => {
  describe('1. Initial Administrator Setup & Explicit Permission Granting', () => {
    it('grants ASSIGN_CAMPAIGNS explicitly during initial-admin setup, while custom admin does not get it', async () => {
      const orgId = await createOrganisation('Org Setup');
      const userId = testId('setup-initial-admin');

      await prisma.user.create({
        data: {
          id: userId,
          email: testEmail('initial-admin-setup'),
          firstName: 'Initial',
          lastName: 'Admin',
          passwordHash: CREDENTIAL_HASH,
          userType: 'ORGANISATION_ADMIN',
          authStatus: 'DISABLED',
        },
      });

      await activateOrganisationAdminUser(
        {
          userId,
          firstName: 'Activated',
          lastName: 'Initial',
          passwordHash: CREDENTIAL_HASH,
          organisationId: orgId,
          isInitialAdmin: true,
        },
        prisma,
      );

      const adminProfile = await prisma.organisationAdminProfile.findUniqueOrThrow({
        where: { userId },
        include: {
          permissionGrants: {
            include: { organisationPermission: true },
          },
        },
      });

      expect(adminProfile.isInitialAdmin).toBe(true);
      const grantedKeys = adminProfile.permissionGrants.map((g) => g.organisationPermission.key);
      expect(grantedKeys).toContain('ASSIGN_CAMPAIGNS');

      // Create a custom non-initial admin
      const customAdmin = await createAdminUser({
        organisationId: orgId,
        isInitialAdmin: false,
        grantAssignCampaigns: false,
      });

      const customAdminProfile = await prisma.organisationAdminProfile.findUniqueOrThrow({
        where: { userId: customAdmin.userId },
        include: {
          permissionGrants: {
            include: { organisationPermission: true },
          },
        },
      });

      expect(customAdminProfile.isInitialAdmin).toBe(false);
      const customGrantedKeys = customAdminProfile.permissionGrants.map(
        (g) => g.organisationPermission.key,
      );
      expect(customGrantedKeys).not.toContain('ASSIGN_CAMPAIGNS');
    });
  });

  describe('2. Timing Attack & Resource Existence Protection', () => {
    it('returns exact same 404 INACCESSIBLE_ORGANISATION for existing foreign org ID and nonexistent UUID', async () => {
      const orgAId = await createOrganisation('Org A');
      const orgBId = await createOrganisation('Org B');
      const nonExistentUuid = randomUUID();

      const adminA = await createAdminUser({
        organisationId: orgAId,
        grantAssignCampaigns: true,
      });

      // Query foreign Org B
      let foreignErr: CampaignAssignmentServiceError | null = null;
      try {
        await getAssignableCampaigns(adminA.userId, orgBId, { page: 1, limit: 20 });
      } catch (err: unknown) {
        if (err instanceof CampaignAssignmentServiceError) {
          foreignErr = err;
        }
      }

      // Query non-existent UUID
      let nonExistentErr: CampaignAssignmentServiceError | null = null;
      try {
        await getAssignableCampaigns(adminA.userId, nonExistentUuid, { page: 1, limit: 20 });
      } catch (err: unknown) {
        if (err instanceof CampaignAssignmentServiceError) {
          nonExistentErr = err;
        }
      }

      expect(foreignErr).not.toBeNull();
      expect(nonExistentErr).not.toBeNull();
      expect(foreignErr?.statusCode).toBe(404);
      expect(nonExistentErr?.statusCode).toBe(404);
      expect(foreignErr?.error).toBe('INACCESSIBLE_ORGANISATION');
      expect(nonExistentErr?.error).toBe('INACCESSIBLE_ORGANISATION');
      expect(foreignErr?.message).toBe('Inaccessible organisation');
      expect(nonExistentErr?.message).toBe('Inaccessible organisation');
    });
  });

  describe('3. Promoted Administrator Exclusion', () => {
    it('excludes promoted administrators from candidate items list and total count', async () => {
      const orgId = await createOrganisation('Org Promoted Candidate');

      const trainee = await createTraineeUser({
        organisationId: orgId,
        firstName: 'Promoted',
        lastName: 'Trainee',
      });

      // Before promotion, candidate is returned
      const beforeResult = await findAssignmentCandidates({
        organisationId: orgId,
        page: 1,
        limit: 20,
      });
      expect(beforeResult.total).toBe(1);
      expect(beforeResult.items[0].userId).toBe(trainee.userId);

      // Promote trainee to ORGANISATION_ADMIN
      await prisma.user.update({
        where: { id: trainee.userId },
        data: { userType: 'ORGANISATION_ADMIN' },
      });

      // After promotion, candidate must be excluded from items and total count
      const afterResult = await findAssignmentCandidates({
        organisationId: orgId,
        page: 1,
        limit: 20,
      });
      expect(afterResult.total).toBe(0);
      expect(afterResult.items).toHaveLength(0);
    });
  });

  describe('4. Actor Bounded Isolation & Active State Constraints', () => {
    it('rejects disabled users, trainee users, and cross-organisation admins', async () => {
      const orgAId = await createOrganisation('Org Actor State A');
      const orgBId = await createOrganisation('Org Actor State B');

      const disabledAdmin = await createAdminUser({
        organisationId: orgAId,
        authStatus: 'DISABLED',
        grantAssignCampaigns: true,
      });

      const traineeAsActor = await createTraineeUser({
        organisationId: orgAId,
        firstName: 'Trainee',
        lastName: 'Actor',
      });

      // Disabled admin actor lookup returns null
      const disabledLookup = await findActorOrganisationAdmin({
        userId: disabledAdmin.userId,
        organisationId: orgAId,
      });
      expect(disabledLookup).toBeNull();

      // Trainee user actor lookup returns null
      const traineeLookup = await findActorOrganisationAdmin({
        userId: traineeAsActor.userId,
        organisationId: orgAId,
      });
      expect(traineeLookup).toBeNull();

      // Cross-organisation admin lookup returns null
      const adminA = await createAdminUser({
        organisationId: orgAId,
        grantAssignCampaigns: true,
      });
      const crossOrgLookup = await findActorOrganisationAdmin({
        userId: adminA.userId,
        organisationId: orgBId,
      });
      expect(crossOrgLookup).toBeNull();
    });
  });

  describe('5. Real-Database Campaign & Candidate Filtering, Sorting & Pagination', () => {
    it('filters campaigns by organisation, custom type, and active status with pagination and search', async () => {
      const orgAId = await createOrganisation('Org Filter A');
      const orgBId = await createOrganisation('Org Filter B');

      // Matching active custom campaign in Org A
      const camp1 = await createCampaign({
        organisationId: orgAId,
        name: 'Alpha Cyber Safety',
        status: 'ACTIVE',
        campaignType: 'ORGANISATION_CUSTOM',
      });

      const camp2 = await createCampaign({
        organisationId: orgAId,
        name: 'Beta Phishing Defense',
        status: 'ACTIVE',
        campaignType: 'ORGANISATION_CUSTOM',
      });

      // Excluded: Draft status
      await createCampaign({
        organisationId: orgAId,
        name: 'Draft Campaign',
        status: 'DRAFT',
        campaignType: 'ORGANISATION_CUSTOM',
      });

      // Excluded: Premade type
      await createCampaign({
        organisationId: orgAId,
        name: 'Premade General',
        status: 'ACTIVE',
        campaignType: 'PREMADE_GENERAL',
      });

      // Excluded: Foreign Org B campaign
      await createCampaign({
        organisationId: orgBId,
        name: 'Foreign Org B Campaign',
        status: 'ACTIVE',
        campaignType: 'ORGANISATION_CUSTOM',
      });

      // Query Org A campaigns
      const resAll = await findAssignableCampaigns({
        organisationId: orgAId,
        page: 1,
        limit: 20,
      });

      expect(resAll.total).toBe(2);
      expect(resAll.items).toHaveLength(2);
      expect(resAll.items[0].id).toBe(camp1.id);
      expect(resAll.items[1].id).toBe(camp2.id);

      // Search query filter
      const resSearch = await findAssignableCampaigns({
        organisationId: orgAId,
        page: 1,
        limit: 20,
        search: '  phishing  ',
      });

      expect(resSearch.total).toBe(1);
      expect(resSearch.items[0].id).toBe(camp2.id);

      // Page beyond total pages returns empty items
      const resEmptyPage = await findAssignableCampaigns({
        organisationId: orgAId,
        page: 5,
        limit: 20,
      });

      expect(resEmptyPage.total).toBe(2);
      expect(resEmptyPage.items).toHaveLength(0);
    });

    it('sorts candidates deterministically by firstName asc, lastName asc, id asc and handles pagination', async () => {
      const orgId = await createOrganisation('Org Candidates Sort');

      const t1 = await createTraineeUser({
        organisationId: orgId,
        firstName: 'Alice',
        lastName: 'Smith',
      });

      const t2 = await createTraineeUser({
        organisationId: orgId,
        firstName: 'Alice',
        lastName: 'Zimmer',
      });

      const t3 = await createTraineeUser({
        organisationId: orgId,
        firstName: 'Bob',
        lastName: 'Brown',
      });

      const page1 = await findAssignmentCandidates({
        organisationId: orgId,
        page: 1,
        limit: 2,
      });

      expect(page1.total).toBe(3);
      expect(page1.items).toHaveLength(2);
      expect(page1.items[0].userId).toBe(t1.userId);
      expect(page1.items[1].userId).toBe(t2.userId);

      const page2 = await findAssignmentCandidates({
        organisationId: orgId,
        page: 2,
        limit: 2,
      });

      expect(page2.total).toBe(3);
      expect(page2.items).toHaveLength(1);
      expect(page2.items[0].userId).toBe(t3.userId);
    });
  });

  describe('6. End-to-End Route Validation', () => {
    it('returns 401 UNAUTHENTICATED when requesting options endpoints unauthenticated', async () => {
      const orgId = await createOrganisation('Org E2E Unauth');

      const res1 = await request(app).get(`/organisations/${orgId}/campaigns/assignable`);
      expect(res1.status).toBe(401);

      const res2 = await request(app).get(`/organisations/${orgId}/campaign-assignment-candidates`);
      expect(res2.status).toBe(401);
    });
  });
});

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  AdminStatus,
  AuthStatus,
  CampaignStatus,
  CampaignType,
  OrganisationStatus,
  OrganisationUserStatus,
  PlatformAdminRole,
  TraineeStatus,
  UserType,
} from '../../src/generated/prisma/enums.js';
import { seedOrganisationAdminPermissions } from '../../prisma/seed-data/organisationPermissionSeed.js';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';
import { clearCampaignAssignmentRateLimitStores } from '../../src/routes/campaign-assignment.routes.js';
import { createCampaign, createOrganisation, generateTestEmail } from '../helpers/factories.js';

const app = createApp();
const PASSWORD = 'Password123!';
const precalculatedHash = [
  'scrypt$16384$8$1$fe5b63f10eb85027cc0bb85210efc592$',
  '2b8c42c34456dc85c1cb018557067b2b1ea06e5a39e9a9a3a5892cc3e67899c34e7cf0ff478844589efff6c517d8fc08ca9f4ef12caf413b799d15978b0ce3ba',
].join('');

async function loginAsOrgAdmin(
  input: {
    organisationId?: string;
    grantAssignCampaigns?: boolean;
    organisationStatus?: OrganisationStatus;
    userAuthStatus?: AuthStatus;
  } = {},
) {
  let organisation;
  if (input.organisationId) {
    organisation = await prisma.organisation.findUniqueOrThrow({
      where: { id: input.organisationId },
    });
  } else {
    organisation = await createOrganisation({
      status: input.organisationStatus ?? OrganisationStatus.ACTIVE,
    });
  }

  await seedOrganisationAdminPermissions(prisma);

  const email = generateTestEmail('admin');
  const userId = randomUUID();

  const user = await prisma.user.create({
    data: {
      id: userId,
      firstName: 'Admin',
      lastName: 'User',
      email,
      passwordHash: precalculatedHash,
      userType: UserType.ORGANISATION_ADMIN,
      authStatus: input.userAuthStatus ?? AuthStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  const adminProfile = await prisma.organisationAdminProfile.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      organisationId: organisation.id,
      adminStatus: AdminStatus.ACTIVE,
      isInitialAdmin: true,
      joinedAt: new Date(),
    },
  });

  if (input.grantAssignCampaigns !== false) {
    const permission = await prisma.organisationPermission.findFirstOrThrow({
      where: { organisationId: organisation.id, key: 'ASSIGN_CAMPAIGNS' },
    });

    await prisma.organisationAdminPermission.create({
      data: {
        id: randomUUID(),
        organisationId: organisation.id,
        organisationAdminId: adminProfile.id,
        organisationPermissionId: permission.id,
      },
    });
  }

  const loginRes = await request(app).post('/auth/login').send({ email, password: PASSWORD });

  const token = (loginRes.body.token as string) ?? '';

  return { organisation, user, adminProfile, token };
}

async function loginAsTrainee(input: { organisationId: string }) {
  const email = generateTestEmail('trainee');
  const userId = randomUUID();

  const user = await prisma.user.create({
    data: {
      id: userId,
      firstName: 'Trainee',
      lastName: 'User',
      email,
      passwordHash: precalculatedHash,
      userType: UserType.ORGANISATION_TRAINEE,
      authStatus: AuthStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  const traineeProfile = await prisma.traineeProfile.create({
    data: {
      id: randomUUID(),
      userId,
      traineeStatus: TraineeStatus.ACTIVE,
    },
  });

  const orgTraineeProfile = await prisma.organisationTraineeProfile.create({
    data: {
      id: randomUUID(),
      traineeProfileId: traineeProfile.id,
      organisationId: input.organisationId,
      membershipStatus: OrganisationUserStatus.ACTIVE,
    },
  });

  const loginRes = await request(app).post('/auth/login').send({ email, password: PASSWORD });

  const token = (loginRes.body.token as string) ?? '';

  return { user, traineeProfile, orgTraineeProfile, token };
}

async function loginAsPlatformSuperAdmin() {
  const email = generateTestEmail('superadmin');
  const userId = randomUUID();

  const user = await prisma.user.create({
    data: {
      id: userId,
      firstName: 'Super',
      lastName: 'Admin',
      email,
      passwordHash: precalculatedHash,
      userType: UserType.IP_ADMIN,
      authStatus: AuthStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.ipAdminProfile.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      adminStatus: AdminStatus.ACTIVE,
      platformAdminRole: PlatformAdminRole.SUPER_ADMIN,
    },
  });

  const loginRes = await request(app).post('/auth/login').send({ email, password: PASSWORD });

  return { user, token: (loginRes.body.token as string) ?? '' };
}

describe('Campaign Assignment API Integration Tests', () => {
  beforeEach(async () => {
    clearAuthRateLimitStore();
    await clearCampaignAssignmentRateLimitStores();
  });

  describe('1. Real Onboarding & Initial Administrator Setup Workflow', () => {
    it('grants ASSIGN_CAMPAIGNS explicitly during real onboarding setup, allowing campaign options HTTP access', async () => {
      // 1. Submit organisation registration request
      const registrationRes = await request(app)
        .post('/organisation-registration-requests')
        .send({
          submittedOrganisationName: `Acme Corp ${randomUUID()}`,
          representativeFirstName: 'Initial',
          representativeLastName: 'Admin',
          representativeEmail: generateTestEmail('initial-admin'),
        });

      expect(registrationRes.status).toBe(201);
      const requestId = registrationRes.body.request.id as string;

      // 2. Approve request as platform super admin
      const superAdmin = await loginAsPlatformSuperAdmin();
      const approveRes = await request(app)
        .post(`/platform/organisation-requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${superAdmin.token}`)
        .send({});

      expect(approveRes.status).toBe(200);
      const organisationId = approveRes.body.organisation.id as string;

      // 3. Find setup action token created for registration
      const actionToken = await prisma.actionToken.findFirstOrThrow({
        where: { organisationRegistrationRequestId: requestId },
      });

      const setupContextRes = await request(app).get(`/setup/token/${actionToken.id}/context`);
      expect(setupContextRes.status).toBe(200);

      // 4. Complete initial admin setup
      const completeRes = await request(app)
        .post(`/setup/token/${actionToken.id}/complete`)
        .send({ password: 'Password123!' });

      expect(completeRes.status).toBe(201);
      const adminEmail = completeRes.body.user.email as string;

      // 5. Log in as initial admin
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: adminEmail, password: 'Password123!' });

      expect(loginRes.status).toBe(200);
      const token = loginRes.body.token as string;

      // 6. Access campaign options endpoint over HTTP
      const optionsRes = await request(app)
        .get(`/organisations/${organisationId}/campaigns/assignable`)
        .set('Authorization', `Bearer ${token}`);

      expect(optionsRes.status).toBe(200);
      expect(optionsRes.body).toHaveProperty('items');
      expect(optionsRes.body).toHaveProperty('pagination');
    });
  });

  describe('2. Authenticated HTTP Endpoints Success & Serialization', () => {
    it('returns 200 OK with assignable campaigns, serialized dates, and pagination meta restricted to organisation', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgAId = adminFixture.organisation.id;
      const orgBId = (await createOrganisation()).id;

      // Campaign in Org A (eligible)
      const campaignA = await createCampaign({
        organisationId: orgAId,
        name: 'Alpha Phishing Training',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
        startDate: new Date('2026-09-01T00:00:00.000Z'),
      });

      // Campaign in Org B (foreign - should not be included)
      await createCampaign({
        organisationId: orgBId,
        name: 'Beta Foreign Training',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const response = await request(app)
        .get(`/organisations/${orgAId}/campaigns/assignable`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        items: [
          expect.objectContaining({
            campaignId: campaignA.id,
            name: 'Alpha Phishing Training',
            status: 'ACTIVE',
            type: 'ORGANISATION_CUSTOM',
            startDate: '2026-09-01T00:00:00.000Z',
          }),
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('returns 200 OK with candidate options, displayName, email, active: true, and excludes promoted admins', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;

      // Trainee A in Org
      const traineeUser = await prisma.user.create({
        data: {
          id: randomUUID(),
          firstName: 'Alice',
          lastName: 'Candidate',
          email: generateTestEmail('candidate'),
          passwordHash: precalculatedHash,
          userType: UserType.ORGANISATION_TRAINEE,
          authStatus: AuthStatus.ACTIVE,
        },
      });
      const traineeProfile = await prisma.traineeProfile.create({
        data: { id: randomUUID(), userId: traineeUser.id, traineeStatus: TraineeStatus.ACTIVE },
      });
      const orgTraineeProfile = await prisma.organisationTraineeProfile.create({
        data: {
          id: randomUUID(),
          traineeProfileId: traineeProfile.id,
          organisationId: orgId,
          membershipStatus: OrganisationUserStatus.ACTIVE,
        },
      });

      // Promoted admin (should be excluded from candidates)
      const promotedUser = await prisma.user.create({
        data: {
          id: randomUUID(),
          firstName: 'Promoted',
          lastName: 'Admin',
          email: generateTestEmail('promoted'),
          passwordHash: precalculatedHash,
          userType: UserType.ORGANISATION_ADMIN,
          authStatus: AuthStatus.ACTIVE,
        },
      });
      const promotedTraineeProfile = await prisma.traineeProfile.create({
        data: { id: randomUUID(), userId: promotedUser.id, traineeStatus: TraineeStatus.ACTIVE },
      });
      await prisma.organisationTraineeProfile.create({
        data: {
          id: randomUUID(),
          traineeProfileId: promotedTraineeProfile.id,
          organisationId: orgId,
          membershipStatus: OrganisationUserStatus.ACTIVE,
        },
      });

      const response = await request(app)
        .get(`/organisations/${orgId}/campaign-assignment-candidates`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        items: [
          {
            traineeProfileId: traineeProfile.id,
            organisationTraineeProfileId: orgTraineeProfile.id,
            userId: traineeUser.id,
            displayName: 'Alice Candidate',
            email: traineeUser.email,
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

  describe('3. Role Distinction & Indistinguishable Concealment (403 vs 404)', () => {
    it('returns 403 FORBIDDEN_ORGANISATION_ROLE when a same-organisation trainee requests options endpoints', async () => {
      const adminFixture = await loginAsOrgAdmin();
      const orgId = adminFixture.organisation.id;
      const traineeFixture = await loginAsTrainee({ organisationId: orgId });

      const campaignRes = await request(app)
        .get(`/organisations/${orgId}/campaigns/assignable`)
        .set('Authorization', `Bearer ${traineeFixture.token}`);

      expect(campaignRes.status).toBe(403);
      expect(campaignRes.body).toEqual({
        error: 'FORBIDDEN_ORGANISATION_ROLE',
        message: 'Trainees cannot manage campaign assignments',
      });

      const candidateRes = await request(app)
        .get(`/organisations/${orgId}/campaign-assignment-candidates`)
        .set('Authorization', `Bearer ${traineeFixture.token}`);

      expect(candidateRes.status).toBe(403);
      expect(candidateRes.body).toEqual({
        error: 'FORBIDDEN_ORGANISATION_ROLE',
        message: 'Trainees cannot manage campaign assignments',
      });
    });

    it('returns 403 MISSING_ASSIGN_CAMPAIGNS_PERMISSION when admin lacks explicit grant', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: false });
      const orgId = adminFixture.organisation.id;

      const response = await request(app)
        .get(`/organisations/${orgId}/campaigns/assignable`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'MISSING_ASSIGN_CAMPAIGNS_PERMISSION',
        message: 'Assign campaigns permission is required',
      });
    });

    it('returns exact same 404 INACCESSIBLE_ORGANISATION for foreign org ID and nonexistent org UUID', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const foreignOrgId = (await createOrganisation()).id;
      const nonexistentUuid = randomUUID();

      const foreignRes = await request(app)
        .get(`/organisations/${foreignOrgId}/campaigns/assignable`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      const nonexistentRes = await request(app)
        .get(`/organisations/${nonexistentUuid}/campaigns/assignable`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(foreignRes.status).toBe(404);
      expect(nonexistentRes.status).toBe(404);
      expect(foreignRes.body).toEqual({
        error: 'INACCESSIBLE_ORGANISATION',
        message: 'Inaccessible organisation',
      });
      expect(nonexistentRes.body).toEqual({
        error: 'INACCESSIBLE_ORGANISATION',
        message: 'Inaccessible organisation',
      });
    });
  });

  describe('4. Active State & Unauthenticated Enforcement', () => {
    it('returns 401 UNAUTHENTICATED when requesting options endpoints unauthenticated', async () => {
      const orgId = (await createOrganisation()).id;

      const response = await request(app).get(`/organisations/${orgId}/campaigns/assignable`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('returns 403 ORGANISATION_NOT_ACTIVE when organisation is suspended', async () => {
      const adminFixture = await loginAsOrgAdmin({
        organisationStatus: OrganisationStatus.SUSPENDED,
      });
      const orgId = adminFixture.organisation.id;

      const response = await request(app)
        .get(`/organisations/${orgId}/campaigns/assignable`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'ORGANISATION_NOT_ACTIVE',
        message: 'Organisation is not active',
      });
    });
  });

  describe('5. Filtering, Pagination & Search HTTP Endpoints', () => {
    it('supports search, page, and limit query parameters over HTTP', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;

      await createCampaign({
        organisationId: orgId,
        name: 'Target Phishing Alpha',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      await createCampaign({
        organisationId: orgId,
        name: 'Other Training',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const response = await request(app)
        .get(`/organisations/${orgId}/campaigns/assignable?search=Target&page=1&limit=10`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].name).toBe('Target Phishing Alpha');
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });
});

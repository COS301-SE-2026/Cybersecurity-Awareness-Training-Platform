import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
import { hashOpaqueToken } from '../../src/services/token-hash.service.js';

const { sendMailMock, nodemailerMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn();
  return {
    sendMailMock,
    nodemailerMock: {
      createTransport: vi.fn().mockReturnValue({
        sendMail: sendMailMock,
      }),
    },
  };
});

vi.mock('nodemailer', () => ({ default: nodemailerMock }));

const app = createApp();
const PASSWORD = 'password';
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
      firstName: 'Thabo',
      lastName: 'Mbeki',
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

async function loginAsTrainee(input: {
  organisationId: string;
  firstName?: string;
  lastName?: string;
}) {
  const email = generateTestEmail('trainee');
  const userId = randomUUID();

  const user = await prisma.user.create({
    data: {
      id: userId,
      firstName: input.firstName ?? 'Sipho',
      lastName: input.lastName ?? 'Ndlovu',
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
    vi.clearAllMocks();
    sendMailMock.mockResolvedValue({ messageId: 'smtpmessage01' });
    clearAuthRateLimitStore();
    await clearCampaignAssignmentRateLimitStores();
  });

  describe('1. Real Onboarding & Initial Administrator Setup Workflow', () => {
    it('grants ASSIGN_CAMPAIGNS explicitly during real onboarding setup, allowing campaign options HTTP access', async () => {
      const adminEmail = generateTestEmail('initial-admin');
      const registrationRes = await request(app)
        .post('/organisation-registration-requests')
        .send({
          organisationName: `Pretoria Tech ${randomUUID()}`,
          organisationDescription: 'South African Security Platform',
          organisationSize: 50,
          organisationWebsiteUrl: 'https://pretoria-tech.co.za',
          representativeFirstName: 'Initial',
          representativeLastName: 'Admin',
          representativeEmail: adminEmail,
        });

      expect(registrationRes.status).toBe(201);
      const requestId = registrationRes.body.requestId as string;

      const superAdmin = await loginAsPlatformSuperAdmin();
      const approveRes = await request(app)
        .post(`/platform/organisation-requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${superAdmin.token}`)
        .send({ initialAdminEmail: adminEmail });

      expect(approveRes.status).toBe(200);
      const organisationId = approveRes.body.approvedOrganisation.id as string;

      const rawToken = ['setup-test', randomUUID()].join('-');
      const actionTokenRecord = await prisma.actionToken.findFirstOrThrow({
        where: { organisationRegistrationRequestId: requestId },
      });
      await prisma.actionToken.update({
        where: { id: actionTokenRecord.id },
        data: { tokenHash: hashOpaqueToken(rawToken) },
      });

      const setupContextRes = await request(app).get(`/setup/token/${rawToken}/context`);
      expect(setupContextRes.status).toBe(200);

      const setupPass = 'Password12345!';
      const completeRes = await request(app).post(`/setup/token/${rawToken}/complete`).send({
        firstName: 'Initial',
        lastName: 'Admin',
        password: setupPass,
        confirmPassword: setupPass,
      });

      expect(completeRes.status).toBe(201);
      const completedAdminEmail = completeRes.body.user.email as string;

      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: completedAdminEmail, password: setupPass });

      expect(loginRes.status).toBe(200);
      const token = loginRes.body.token as string;

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

      const campaignA = await createCampaign({
        organisationId: orgAId,
        name: 'Checkers Sixty60 Phishing Training',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
        startDate: new Date('2026-09-01T00:00:00.000Z'),
      });

      await createCampaign({
        organisationId: orgBId,
        name: 'Foreign Org Campaign',
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
            name: 'Checkers Sixty60 Phishing Training',
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

    it('returns 200 OK with candidate options, displayName, email, active: true', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;

      const traineeUser = await prisma.user.create({
        data: {
          id: randomUUID(),
          firstName: 'Anika',
          lastName: 'van der Merwe',
          email: generateTestEmail('anika'),
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
            displayName: 'Anika van der Merwe',
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

  describe('3. Bulk Campaign Assignment Mutation (POST /organisations/:organisationId/campaign-assignments)', () => {
    it('creates bulk campaign assignments transactionally and returns 200 OK with summary counts', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;

      const campaign = await createCampaign({
        organisationId: orgId,
        name: 'Rustenburg Retail Security Awareness',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const trainee1 = await loginAsTrainee({
        organisationId: orgId,
        firstName: 'Sipho',
        lastName: 'Ndlovu',
      });
      const trainee2 = await loginAsTrainee({
        organisationId: orgId,
        firstName: 'Johan',
        lastName: 'Botha',
      });

      const res = await request(app)
        .post(`/organisations/${orgId}/campaign-assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`)
        .send({
          campaignIds: [campaign.id],
          traineeProfileIds: [trainee1.traineeProfile.id, trainee2.traineeProfile.id],
        });

      expect(res.status).toBe(200);
      expect(res.body.created).toHaveLength(2);
      expect(res.body.alreadyAssigned).toHaveLength(0);
      expect(res.body.summary).toEqual({
        requestedCampaigns: 1,
        requestedTrainees: 2,
        requestedPairs: 2,
        createdCount: 2,
        alreadyAssignedCount: 0,
      });

      const dbAssignments = await prisma.campaignAssignment.findMany({
        where: { campaignId: campaign.id },
      });
      expect(dbAssignments).toHaveLength(2);
    });

<<<<<<< HEAD
    it('handles duplicate assignments idempotently without mutating progress', async () => {
=======
    it('allows duplicate retries even after campaign becomes PAUSED or trainee becomes INACTIVE', async () => {
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;

      const campaign = await createCampaign({
        organisationId: orgId,
        name: 'Rustenburg Retail Security Awareness',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const trainee = await loginAsTrainee({ organisationId: orgId });

<<<<<<< HEAD
=======
      // First call creates assignment
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
      const firstRes = await request(app)
        .post(`/organisations/${orgId}/campaign-assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`)
        .send({
          campaignIds: [campaign.id],
          traineeProfileIds: [trainee.traineeProfile.id],
        });

      expect(firstRes.status).toBe(200);
<<<<<<< HEAD
      expect(firstRes.body.created).toHaveLength(1);

=======

      // Now campaign becomes PAUSED and trainee becomes INACTIVE
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: CampaignStatus.PAUSED },
      });
      await prisma.traineeProfile.update({
        where: { id: trainee.traineeProfile.id },
        data: { traineeStatus: TraineeStatus.INACTIVE },
      });

      // Retrying the duplicate request succeeds with 200 OK in alreadyAssigned
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
      const retryRes = await request(app)
        .post(`/organisations/${orgId}/campaign-assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`)
        .send({
          campaignIds: [campaign.id],
          traineeProfileIds: [trainee.traineeProfile.id],
        });

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.created).toHaveLength(0);
      expect(retryRes.body.alreadyAssigned).toHaveLength(1);
<<<<<<< HEAD
      expect(retryRes.body.summary).toEqual({
        requestedCampaigns: 1,
        requestedTrainees: 1,
        requestedPairs: 1,
        createdCount: 0,
        alreadyAssignedCount: 1,
      });
    });

    it('all-or-nothing: rejects request with 404 and writes zero assignments if any campaign is foreign or invalid', async () => {
=======
    });

    it('returns 409 TRAINEE_DISABLED when a mixed request contains an existing pair AND a new pair with an inactive trainee', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;

      const campaign = await createCampaign({
        organisationId: orgId,
        name: 'Active Campaign',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const activeTrainee = await loginAsTrainee({ organisationId: orgId });
      const inactiveTrainee = await loginAsTrainee({ organisationId: orgId });

      // Mark second trainee as inactive
      await prisma.traineeProfile.update({
        where: { id: inactiveTrainee.traineeProfile.id },
        data: { traineeStatus: TraineeStatus.INACTIVE },
      });

      // Assign active trainee first
      await request(app)
        .post(`/organisations/${orgId}/campaign-assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`)
        .send({
          campaignIds: [campaign.id],
          traineeProfileIds: [activeTrainee.traineeProfile.id],
        });

      // Mixed request: activeTrainee (already assigned) + inactiveTrainee (needs new assignment)
      const res = await request(app)
        .post(`/organisations/${orgId}/campaign-assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`)
        .send({
          campaignIds: [campaign.id],
          traineeProfileIds: [activeTrainee.traineeProfile.id, inactiveTrainee.traineeProfile.id],
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('TRAINEE_DISABLED');

      // Verify DB still has only 1 assignment
      const dbAssignments = await prisma.campaignAssignment.findMany({
        where: { campaignId: campaign.id },
      });
      expect(dbAssignments).toHaveLength(1);
    });

    it('returns 409 CAMPAIGN_INACTIVE when a NEW assignment is needed for a PAUSED campaign', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;

      const pausedCampaign = await createCampaign({
        organisationId: orgId,
        name: 'Paused Campaign',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.PAUSED,
      });

      const trainee = await loginAsTrainee({ organisationId: orgId });

      const res = await request(app)
        .post(`/organisations/${orgId}/campaign-assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`)
        .send({
          campaignIds: [pausedCampaign.id],
          traineeProfileIds: [trainee.traineeProfile.id],
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CAMPAIGN_INACTIVE');
    });

    it('handles concurrent requests properly without false created classification', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;

      const campaign = await createCampaign({
        organisationId: orgId,
        name: 'Concurrent Test Campaign',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const trainee = await loginAsTrainee({ organisationId: orgId });

      // Run 2 simultaneous requests
      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/organisations/${orgId}/campaign-assignments`)
          .set('Authorization', `Bearer ${adminFixture.token}`)
          .send({
            campaignIds: [campaign.id],
            traineeProfileIds: [trainee.traineeProfile.id],
          }),
        request(app)
          .post(`/organisations/${orgId}/campaign-assignments`)
          .set('Authorization', `Bearer ${adminFixture.token}`)
          .send({
            campaignIds: [campaign.id],
            traineeProfileIds: [trainee.traineeProfile.id],
          }),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const dbRows = await prisma.campaignAssignment.findMany({
        where: { campaignId: campaign.id, traineeProfileId: trainee.traineeProfile.id },
      });
      expect(dbRows).toHaveLength(1);

      const createdCounts = [res1.body.summary.createdCount, res2.body.summary.createdCount];
      const alreadyAssignedCounts = [
        res1.body.summary.alreadyAssignedCount,
        res2.body.summary.alreadyAssignedCount,
      ];

      expect(createdCounts.sort()).toEqual([0, 1]);
      expect(alreadyAssignedCounts.sort()).toEqual([0, 1]);
    });
  });

  describe('4. Dual-Sided Tenant Isolation on Read Endpoints', () => {
    it('excludes cross-linked assignments from campaign-centric and trainee-centric items and total count', async () => {
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgAId = adminFixture.organisation.id;
      const orgBId = (await createOrganisation()).id;

<<<<<<< HEAD
      const validCampaign = await createCampaign({
        organisationId: orgAId,
        name: 'Valid Campaign',
=======
      const campaignA = await createCampaign({
        organisationId: orgAId,
        name: 'Org A Campaign',
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

<<<<<<< HEAD
      const foreignCampaign = await createCampaign({
        organisationId: orgBId,
        name: 'Foreign Campaign',
=======
      const campaignB = await createCampaign({
        organisationId: orgBId,
        name: 'Org B Campaign',
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

<<<<<<< HEAD
      const trainee = await loginAsTrainee({ organisationId: orgAId });

      const res = await request(app)
        .post(`/organisations/${orgAId}/campaign-assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`)
        .send({
          campaignIds: [validCampaign.id, foreignCampaign.id],
          traineeProfileIds: [trainee.traineeProfile.id],
        });

      expect(res.status).toBe(404);

      const dbAssignments = await prisma.campaignAssignment.findMany({
        where: { campaignId: validCampaign.id },
      });
      expect(dbAssignments).toHaveLength(0);
    });
  });

  describe('4. Paginated Assignment Read Endpoints', () => {
    it('GET /organisations/:organisationId/campaigns/:campaignId/assignments returns paginated items', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;

      const campaign = await createCampaign({
        organisationId: orgId,
        name: 'Pretoria Cyber Defense Training',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const trainee = await loginAsTrainee({
        organisationId: orgId,
        firstName: 'Lindiwe',
        lastName: 'Sisulu',
      });

      await request(app)
        .post(`/organisations/${orgId}/campaign-assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`)
        .send({
          campaignIds: [campaign.id],
          traineeProfileIds: [trainee.traineeProfile.id],
        });

      const res = await request(app)
        .get(`/organisations/${orgId}/campaigns/${campaign.id}/assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toEqual(
        expect.objectContaining({
          campaignId: campaign.id,
          campaignName: 'Pretoria Cyber Defense Training',
          displayName: 'Lindiwe Sisulu',
          assignmentStatus: 'ASSIGNED',
          accessType: 'ASSIGNED',
        }),
      );
    });

    it('GET /organisations/:organisationId/trainees/:traineeProfileId/campaign-assignments returns paginated items', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;

      const campaign = await createCampaign({
        organisationId: orgId,
        name: 'Pretoria Cyber Defense Training',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const trainee = await loginAsTrainee({
        organisationId: orgId,
        firstName: 'Bongani',
        lastName: 'Khumalo',
      });

      await request(app)
        .post(`/organisations/${orgId}/campaign-assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`)
        .send({
          campaignIds: [campaign.id],
          traineeProfileIds: [trainee.traineeProfile.id],
        });

      const res = await request(app)
        .get(`/organisations/${orgId}/trainees/${trainee.traineeProfile.id}/campaign-assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toEqual(
        expect.objectContaining({
          campaignId: campaign.id,
          campaignName: 'Pretoria Cyber Defense Training',
          displayName: 'Bongani Khumalo',
          assignmentStatus: 'ASSIGNED',
          accessType: 'ASSIGNED',
        }),
      );
=======
      const traineeA = await loginAsTrainee({ organisationId: orgAId });
      const traineeB = await loginAsTrainee({ organisationId: orgBId });

      // Manually insert malformed cross-linked rows
      // 1. Org A campaign linked to Org B trainee
      await prisma.campaignAssignment.create({
        data: {
          id: randomUUID(),
          campaignId: campaignA.id,
          traineeProfileId: traineeB.traineeProfile.id,
          assignedByUserId: adminFixture.user.id,
          accessType: 'ASSIGNED',
          assignmentStatus: 'ASSIGNED',
        },
      });

      // 2. Org B campaign linked to Org A trainee
      await prisma.campaignAssignment.create({
        data: {
          id: randomUUID(),
          campaignId: campaignB.id,
          traineeProfileId: traineeA.traineeProfile.id,
          assignedByUserId: adminFixture.user.id,
          accessType: 'ASSIGNED',
          assignmentStatus: 'ASSIGNED',
        },
      });

      // Query Org A campaign assignments -> should exclude cross-linked Org B trainee
      const campaignRes = await request(app)
        .get(`/organisations/${orgAId}/campaigns/${campaignA.id}/assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(campaignRes.status).toBe(200);
      expect(campaignRes.body.items).toHaveLength(0);
      expect(campaignRes.body.pagination.total).toBe(0);

      // Query Org A trainee assignments -> should exclude cross-linked Org B campaign
      const traineeRes = await request(app)
        .get(
          `/organisations/${orgAId}/trainees/${traineeA.traineeProfile.id}/campaign-assignments`,
        )
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(traineeRes.status).toBe(200);
      expect(traineeRes.body.items).toHaveLength(0);
      expect(traineeRes.body.pagination.total).toBe(0);
>>>>>>> a14d5b721 (feat: manage organisation campaign assignments transactionally (#407))
    });
  });
});

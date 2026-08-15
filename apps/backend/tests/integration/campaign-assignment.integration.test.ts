import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  AdminStatus,
  AuthStatus,
  CampaignAccessType,
  CampaignStatus,
  CampaignType,
  EmailClassification,
  InteractionEventType,
  InteractionTargetType,
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

  const email = generateTestEmail(`admin-${randomUUID()}`);
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
  const email = generateTestEmail(`trainee-${randomUUID()}`);
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

async function loginAsGeneralTrainee(
  input: {
    firstName?: string;
    lastName?: string;
    traineeStatus?: TraineeStatus;
    authStatus?: AuthStatus;
  } = {},
) {
  const email = generateTestEmail(`gen-trainee-${randomUUID()}`);
  const userId = randomUUID();

  const user = await prisma.user.create({
    data: {
      id: userId,
      firstName: input.firstName ?? 'General',
      lastName: input.lastName ?? 'Trainee',
      email,
      passwordHash: precalculatedHash,
      userType: UserType.GENERAL_TRAINEE,
      authStatus: input.authStatus ?? AuthStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  const traineeProfile = await prisma.traineeProfile.create({
    data: {
      id: randomUUID(),
      userId,
      traineeStatus: input.traineeStatus ?? TraineeStatus.ACTIVE,
    },
  });

  const generalTraineeProfile = await prisma.generalTraineeProfile.create({
    data: {
      id: randomUUID(),
      traineeProfileId: traineeProfile.id,
      accessSource: 'SELF_SIGNUP',
    },
  });

  const loginRes = await request(app).post('/auth/login').send({ email, password: PASSWORD });
  const token = (loginRes.body.token as string) ?? '';

  return { user, traineeProfile, generalTraineeProfile, token };
}

async function loginAsPlatformSuperAdmin() {
  const email = generateTestEmail(`superadmin-${randomUUID()}`);
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
    vi.setConfig({ testTimeout: 30000 });
    vi.clearAllMocks();
    sendMailMock.mockResolvedValue({ messageId: 'smtpmessage01' });
    clearAuthRateLimitStore();
    await clearCampaignAssignmentRateLimitStores();
  });

  describe('1. Real Onboarding & Initial Administrator Setup Workflow', () => {
    it('grants ASSIGN_CAMPAIGNS explicitly during real onboarding setup, allowing campaign options HTTP access', async () => {
      const adminEmail = generateTestEmail(`initial-admin-${randomUUID()}`);
      const uniqueId = randomUUID();

      const registrationRes = await request(app)
        .post('/organisation-registration-requests')
        .send({
          organisationName: `Pretoria Tech ${uniqueId}`,
          organisationDescription: 'South African Security Platform',
          organisationSize: 50,
          organisationWebsiteUrl: `https://pretoria-tech-${uniqueId}.co.za`,
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

    it('returns 404 when submitting an existing assignment that belongs entirely to another organisation', async () => {
      const adminOrgA = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgAId = adminOrgA.organisation.id;
      const orgBId = (await createOrganisation()).id;

      const campaignB = await createCampaign({
        organisationId: orgBId,
        name: 'Org B Campaign',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });
      const traineeB = await loginAsTrainee({ organisationId: orgBId });

      // Create pre-existing assignment in Org B
      await prisma.campaignAssignment.create({
        data: {
          id: randomUUID(),
          campaignId: campaignB.id,
          traineeProfileId: traineeB.traineeProfile.id,
          assignedByUserId: adminOrgA.user.id,
          accessType: 'ASSIGNED',
          assignmentStatus: 'ASSIGNED',
        },
      });

      // Org A admin tries to submit Org B's existing campaign & trainee
      const res = await request(app)
        .post(`/organisations/${orgAId}/campaign-assignments`)
        .set('Authorization', `Bearer ${adminOrgA.token}`)
        .send({
          campaignIds: [campaignB.id],
          traineeProfileIds: [traineeB.traineeProfile.id],
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('CAMPAIGN_NOT_FOUND');
      expect(res.body).not.toHaveProperty('created');
      expect(res.body).not.toHaveProperty('alreadyAssigned');
    });

    it('allows duplicate retries even after campaign becomes PAUSED or trainee becomes INACTIVE', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;

      const campaign = await createCampaign({
        organisationId: orgId,
        name: 'Rustenburg Retail Security Awareness',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const trainee = await loginAsTrainee({ organisationId: orgId });

      // First call creates assignment
      const firstRes = await request(app)
        .post(`/organisations/${orgId}/campaign-assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`)
        .send({
          campaignIds: [campaign.id],
          traineeProfileIds: [trainee.traineeProfile.id],
        });

      expect(firstRes.status).toBe(200);

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

    it('handles concurrent requests properly with partial overlap without false created classification', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;

      const campaign1 = await createCampaign({
        organisationId: orgId,
        name: 'Concurrent Campaign 1',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });
      const campaign2 = await createCampaign({
        organisationId: orgId,
        name: 'Concurrent Campaign 2',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const trainee = await loginAsTrainee({ organisationId: orgId });

      // Run 2 simultaneous partially-overlapping requests:
      // Request A requests [campaign1, campaign2]
      // Request B rquests [campaign1]
      const [resA, resB] = await Promise.all([
        request(app)
          .post(`/organisations/${orgId}/campaign-assignments`)
          .set('Authorization', `Bearer ${adminFixture.token}`)
          .send({
            campaignIds: [campaign1.id, campaign2.id],
            traineeProfileIds: [trainee.traineeProfile.id],
          }),
        request(app)
          .post(`/organisations/${orgId}/campaign-assignments`)
          .set('Authorization', `Bearer ${adminFixture.token}`)
          .send({
            campaignIds: [campaign1.id],
            traineeProfileIds: [trainee.traineeProfile.id],
          }),
      ]);

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);

      const dbRows = await prisma.campaignAssignment.findMany({
        where: {
          campaignId: { in: [campaign1.id, campaign2.id] },
          traineeProfileId: trainee.traineeProfile.id,
        },
      });
      expect(dbRows).toHaveLength(2);

      // Total created count across both responses must equal exact total DB rows created (2)
      const totalCreated = resA.body.summary.createdCount + resB.body.summary.createdCount;
      expect(totalCreated).toBe(2);

      // Neither response should falsely classify a row as created if it didn't create it
      const resAAlreadyAssignedCount = resA.body.summary.alreadyAssignedCount;
      const resBAlreadyAssignedCount = resB.body.summary.alreadyAssignedCount;
      expect(resAAlreadyAssignedCount + resBAlreadyAssignedCount).toBe(1);
    });
  });

  describe('4. Dual-Sided Tenant Isolation on Read Endpoints', () => {
    it('excludes cross-linked assignments from campaign-centric and trainee-centric items and total count, including with search filters', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgAId = adminFixture.organisation.id;
      const orgBId = (await createOrganisation()).id;

      const campaignA = await createCampaign({
        organisationId: orgAId,
        name: 'Org A Campaign',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const campaignB = await createCampaign({
        organisationId: orgBId,
        name: 'Foreign Campaign Org B',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const traineeA = await loginAsTrainee({ organisationId: orgAId });
      const traineeB = await loginAsTrainee({
        organisationId: orgBId,
        firstName: 'ForeignTraineeFirst',
        lastName: 'ForeignTraineeLast',
      });

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

      // Query Org A campaign assignments WITH search term matching foreign trainee
      const campaignSearchRes = await request(app)
        .get(`/organisations/${orgAId}/campaigns/${campaignA.id}/assignments?search=ForeignTrainee`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(campaignSearchRes.status).toBe(200);
      expect(campaignSearchRes.body.items).toHaveLength(0);
      expect(campaignSearchRes.body.pagination.total).toBe(0);

      // Query Org A trainee assignments -> should exclude cross-linked Org B campaign
      const traineeRes = await request(app)
        .get(`/organisations/${orgAId}/trainees/${traineeA.traineeProfile.id}/campaign-assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(traineeRes.status).toBe(200);
      expect(traineeRes.body.items).toHaveLength(0);
      expect(traineeRes.body.pagination.total).toBe(0);

      // Query Org A trainee assignments WITH search term matching foreign campaign
      const traineeSearchRes = await request(app)
        .get(
          `/organisations/${orgAId}/trainees/${traineeA.traineeProfile.id}/campaign-assignments?search=Foreign`,
        )
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(traineeSearchRes.status).toBe(200);
      expect(traineeSearchRes.body.items).toHaveLength(0);
      expect(traineeSearchRes.body.pagination.total).toBe(0);
    });
  });

  describe('5. Unassignment and Destructive Cleanup Workflow', () => {
    async function createFullCampaignProgressFixture(input: {
      organisationId: string;
      traineeProfileId: string;
      assignedByUserId: string;
      campaignName?: string;
    }) {
      const campaign = await createCampaign({
        organisationId: input.organisationId,
        name: input.campaignName ?? 'Capitec Phishing Awareness',
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const quiz = await prisma.quiz.create({
        data: {
          id: randomUUID(),
          title: 'South African Security Quiz',
          passThresholdPercentage: 80,
        },
      });

      const quizQuestion = await prisma.quizQuestion.create({
        data: {
          id: randomUUID(),
          quizId: quiz.id,
          prompt: 'Spot the malicious link in the banking notice',
          position: 1,
        },
      });

      const answerOption = await prisma.answerOption.create({
        data: {
          id: randomUUID(),
          questionId: quizQuestion.id,
          label: 'A',
          text: 'http://capitec-verification.co.za',
          isCorrect: true,
          position: 1,
        },
      });

      const item = await prisma.campaignItem.create({
        data: {
          id: randomUUID(),
          campaignId: campaign.id,
          itemType: 'COMPONENT',
          componentType: 'QUIZ',
          title: 'Quiz Item',
          position: 1,
          quizId: quiz.id,
        },
      });

      const assignment = await prisma.campaignAssignment.create({
        data: {
          id: randomUUID(),
          campaignId: campaign.id,
          traineeProfileId: input.traineeProfileId,
          assignedByUserId: input.assignedByUserId,
          currentCampaignItemId: item.id,
          assignmentStatus: 'IN_PROGRESS',
          accessType: CampaignAccessType.ASSIGNED,
          startedAt: new Date(),
        },
      });

      const quizAttempt = await prisma.quizAttempt.create({
        data: {
          id: randomUUID(),
          traineeProfileId: input.traineeProfileId,
          quizId: quiz.id,
          campaignAssignmentId: assignment.id,
          campaignItemId: item.id,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      const attemptAnswer = await prisma.attemptAnswer.create({
        data: {
          id: randomUUID(),
          attemptId: quizAttempt.id,
          questionId: quizQuestion.id,
          isCorrect: true,
          awardedPoints: 1,
        },
      });

      await prisma.attemptAnswerOption.create({
        data: {
          id: randomUUID(),
          attemptAnswerId: attemptAnswer.id,
          answerOptionId: answerOption.id,
        },
      });

      await prisma.quizResult.create({
        data: {
          id: randomUUID(),
          attemptId: quizAttempt.id,
          scorePercentage: 100,
          passed: true,
        },
      });

      const simulation = await prisma.simulation.create({
        data: {
          id: randomUUID(),
          simulationType: 'SIMULATED_INBOX',
          title: 'FNB Alert Simulation',
        },
      });

      const inbox = await prisma.simulatedInbox.create({
        data: {
          id: randomUUID(),
          simulationId: simulation.id,
          title: 'FNB Inbox',
        },
      });

      const simulatedEmail = await prisma.simulatedEmail.create({
        data: {
          id: randomUUID(),
          inboxId: inbox.id,
          senderLabel: 'FNB Security',
          senderAddress: 'alert@fnb-verify.co.za',
          subject: 'Action Required',
          bodyHtml: '<p>Click link to protect ZAR account.</p>',
          expectedClassification: EmailClassification.PHISHING,
        },
      });

      const redFlag = await prisma.emailRedFlag.create({
        data: {
          id: randomUUID(),
          simulatedEmailId: simulatedEmail.id,
          redFlagType: 'DOMAIN',
          label: 'Fake Domain',
        },
      });

      const classificationResponse = await prisma.emailClassificationResponse.create({
        data: {
          id: randomUUID(),
          traineeProfileId: input.traineeProfileId,
          simulatedEmailId: simulatedEmail.id,
          campaignAssignmentId: assignment.id,
          campaignItemId: item.id,
          selectedClassification: EmailClassification.PHISHING,
          isCorrect: true,
        },
      });

      await prisma.emailClassificationSelectedRedFlag.create({
        data: {
          id: randomUUID(),
          emailClassificationResponseId: classificationResponse.id,
          emailRedFlagId: redFlag.id,
        },
      });

      const event1 = await prisma.interactionEvent.create({
        data: {
          id: randomUUID(),
          traineeProfileId: input.traineeProfileId,
          campaignAssignmentId: assignment.id,
          campaignItemId: item.id,
          eventType: InteractionEventType.CAMPAIGN_STARTED,
          targetType: InteractionTargetType.CAMPAIGN,
          targetId: campaign.id,
        },
      });

      const event2 = await prisma.interactionEvent.create({
        data: {
          id: randomUUID(),
          traineeProfileId: input.traineeProfileId,
          campaignAssignmentId: assignment.id,
          campaignItemId: item.id,
          eventType: InteractionEventType.QUIZ_STARTED,
          targetType: InteractionTargetType.QUIZ_ATTEMPT,
          targetId: quizAttempt.id,
          quizAttemptId: quizAttempt.id,
        },
      });

      return {
        campaign,
        item,
        assignment,
        quizAttempt,
        classificationResponse,
        events: [event1, event2],
      };
    }

    it('permanently deletes selected employee campaign assignment and progress while preserving unrelated progress and creating REVOKED audit record', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;

      const targetTrainee = await loginAsTrainee({
        organisationId: orgId,
        firstName: 'Sipho',
        lastName: 'Ndlovu',
      });
      const otherTrainee = await loginAsTrainee({
        organisationId: orgId,
        firstName: 'Lerato',
        lastName: 'Khumalo',
      });

      const targetFixture = await createFullCampaignProgressFixture({
        organisationId: orgId,
        traineeProfileId: targetTrainee.traineeProfile.id,
        assignedByUserId: adminFixture.user.id,
        campaignName: 'Target Employee Campaign',
      });

      const otherFixture = await createFullCampaignProgressFixture({
        organisationId: orgId,
        traineeProfileId: otherTrainee.traineeProfile.id,
        assignedByUserId: adminFixture.user.id,
        campaignName: 'Other Employee Campaign',
      });

      const res = await request(app)
        .delete(`/organisations/${orgId}/campaign-assignments/${targetFixture.assignment.id}`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        assignmentId: targetFixture.assignment.id,
        campaignId: targetFixture.campaign.id,
        traineeProfileId: targetTrainee.traineeProfile.id,
        unassigned: true,
        deletedProgress: {
          quizAttempts: 1,
          emailClassificationResponses: 1,
          interactionEvents: 2,
        },
      });

      // Assert target progress rows are gone
      const deletedAssignment = await prisma.campaignAssignment.findUnique({
        where: { id: targetFixture.assignment.id },
      });
      expect(deletedAssignment).toBeNull();

      const deletedAttempts = await prisma.quizAttempt.findMany({
        where: { campaignAssignmentId: targetFixture.assignment.id },
      });
      expect(deletedAttempts).toHaveLength(0);

      const deletedClassifications = await prisma.emailClassificationResponse.findMany({
        where: { campaignAssignmentId: targetFixture.assignment.id },
      });
      expect(deletedClassifications).toHaveLength(0);

      const deletedEvents = await prisma.interactionEvent.findMany({
        where: { campaignAssignmentId: targetFixture.assignment.id },
      });
      expect(deletedEvents).toHaveLength(0);

      // Assert audit log record created with REVOKED action type
      const auditEntry = await prisma.auditLogEntry.findFirst({
        where: {
          organisationId: orgId,
          targetId: targetFixture.campaign.id,
          actionType: 'REVOKED',
        },
      });
      expect(auditEntry).not.toBeNull();
      expect(auditEntry?.outcome).toBe('SUCCESS');

      // Assert unrelated trainee progress remains byte-for-byte intact
      const otherAssignment = await prisma.campaignAssignment.findUnique({
        where: { id: otherFixture.assignment.id },
      });
      expect(otherAssignment).not.toBeNull();

      const otherAttempts = await prisma.quizAttempt.findMany({
        where: { campaignAssignmentId: otherFixture.assignment.id },
      });
      expect(otherAttempts).toHaveLength(1);
    });

    it('allows clean reassignment of the same campaign after unassignment without rediscovering old progress', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;
      const trainee = await loginAsTrainee({ organisationId: orgId });

      const progressFixture = await createFullCampaignProgressFixture({
        organisationId: orgId,
        traineeProfileId: trainee.traineeProfile.id,
        assignedByUserId: adminFixture.user.id,
      });

      // Perform unassignment
      await request(app)
        .delete(`/organisations/${orgId}/campaign-assignments/${progressFixture.assignment.id}`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      // Reassign the same campaign
      const reassignRes = await request(app)
        .post(`/organisations/${orgId}/campaign-assignments`)
        .set('Authorization', `Bearer ${adminFixture.token}`)
        .send({
          campaignIds: [progressFixture.campaign.id],
          traineeProfileIds: [trainee.traineeProfile.id],
        });

      expect(reassignRes.status).toBe(200);
      expect(reassignRes.body.summary.createdCount).toBe(1);

      const newAssignmentId = reassignRes.body.created[0].assignmentId;
      expect(newAssignmentId).not.toBe(progressFixture.assignment.id);

      const newAssignmentInDb = await prisma.campaignAssignment.findUniqueOrThrow({
        where: { id: newAssignmentId },
      });
      expect(newAssignmentInDb.assignmentStatus).toBe('ASSIGNED');
      expect(newAssignmentInDb.startedAt).toBeNull();
      expect(newAssignmentInDb.completedAt).toBeNull();
      expect(newAssignmentInDb.currentCampaignItemId).toBeNull();

      // Ensure no attempts or classification responses exist for trainee on this campaign
      const attempts = await prisma.quizAttempt.findMany({
        where: {
          traineeProfileId: trainee.traineeProfile.id,
          quizId: progressFixture.item.quizId!,
        },
      });
      expect(attempts).toHaveLength(0);
    });

    it('allows unassignment of an inactive or disabled employee same-organisation assignment', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;
      const trainee = await loginAsTrainee({ organisationId: orgId });

      const progressFixture = await createFullCampaignProgressFixture({
        organisationId: orgId,
        traineeProfileId: trainee.traineeProfile.id,
        assignedByUserId: adminFixture.user.id,
      });

      // Disable organisation trainee profile
      await prisma.organisationTraineeProfile.update({
        where: { id: trainee.orgTraineeProfile.id },
        data: {
          membershipStatus: OrganisationUserStatus.DISABLED,
          disabledAt: new Date(),
        },
      });

      const res = await request(app)
        .delete(`/organisations/${orgId}/campaign-assignments/${progressFixture.assignment.id}`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(res.status).toBe(200);
      expect(res.body.unassigned).toBe(true);
    });

    it('returns 404 when trying to delete a SELF_SELECTED enrolment', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;
      const trainee = await loginAsTrainee({ organisationId: orgId });

      const campaign = await createCampaign({
        organisationId: orgId,
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const selfSelectedAssignment = await prisma.campaignAssignment.create({
        data: {
          id: randomUUID(),
          campaignId: campaign.id,
          traineeProfileId: trainee.traineeProfile.id,
          assignedByUserId: adminFixture.user.id,
          accessType: CampaignAccessType.SELF_SELECTED,
          assignmentStatus: 'ASSIGNED',
        },
      });

      const res = await request(app)
        .delete(`/organisations/${orgId}/campaign-assignments/${selfSelectedAssignment.id}`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ASSIGNMENT_NOT_FOUND');

      // Assert row still exists
      const existing = await prisma.campaignAssignment.findUnique({
        where: { id: selfSelectedAssignment.id },
      });
      expect(existing).not.toBeNull();
    });

    it('returns 404 for cross-organisation assignment deletion attempts without revealing existence', async () => {
      const adminFixtureA = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgAId = adminFixtureA.organisation.id;
      const orgBId = (await createOrganisation()).id;

      const traineeB = await loginAsTrainee({ organisationId: orgBId });
      const campaignB = await createCampaign({
        organisationId: orgBId,
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
      });

      const assignmentB = await prisma.campaignAssignment.create({
        data: {
          id: randomUUID(),
          campaignId: campaignB.id,
          traineeProfileId: traineeB.traineeProfile.id,
          accessType: CampaignAccessType.ASSIGNED,
          assignmentStatus: 'ASSIGNED',
        },
      });

      // Admin A attempts to delete Org B's assignment using Org A path
      const res = await request(app)
        .delete(`/organisations/${orgAId}/campaign-assignments/${assignmentB.id}`)
        .set('Authorization', `Bearer ${adminFixtureA.token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ASSIGNMENT_NOT_FOUND');

      // Verify Org B's assignment was NOT deleted
      const checkAssignment = await prisma.campaignAssignment.findUnique({
        where: { id: assignmentB.id },
      });
      expect(checkAssignment).not.toBeNull();
    });

    it('returns 403 when authenticated admin lacks ASSIGN_CAMPAIGNS permission', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: false });
      const orgId = adminFixture.organisation.id;

      const res = await request(app)
        .delete(`/organisations/${orgId}/campaign-assignments/${randomUUID()}`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('MISSING_ASSIGN_CAMPAIGNS_PERMISSION');
    });

    it('returns 422 UNPROCESSABLE ENTITY when assignmentId path parameter is not a valid UUID', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;

      const res = await request(app)
        .delete(`/organisations/${orgId}/campaign-assignments/not-a-uuid`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('safely handles two simultaneous unassignment requests via row locking without unhandled errors', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;
      const trainee = await loginAsTrainee({ organisationId: orgId });

      const progressFixture = await createFullCampaignProgressFixture({
        organisationId: orgId,
        traineeProfileId: trainee.traineeProfile.id,
        assignedByUserId: adminFixture.user.id,
      });

      const [res1, res2] = await Promise.all([
        request(app)
          .delete(`/organisations/${orgId}/campaign-assignments/${progressFixture.assignment.id}`)
          .set('Authorization', `Bearer ${adminFixture.token}`),
        request(app)
          .delete(`/organisations/${orgId}/campaign-assignments/${progressFixture.assignment.id}`)
          .set('Authorization', `Bearer ${adminFixture.token}`),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 404]);

      const successfulRes = res1.status === 200 ? res1 : res2;
      expect(successfulRes.body.unassigned).toBe(true);

      const notFoundRes = res1.status === 404 ? res1 : res2;
      expect(notFoundRes.body.error).toBe('ASSIGNMENT_NOT_FOUND');
    });

    it('cleans up legacy and null-assignment progress matching trainee and campaign items', async () => {
      const adminFixture = await loginAsOrgAdmin({ grantAssignCampaigns: true });
      const orgId = adminFixture.organisation.id;
      const trainee = await loginAsTrainee({ organisationId: orgId });

      const progressFixture = await createFullCampaignProgressFixture({
        organisationId: orgId,
        traineeProfileId: trainee.traineeProfile.id,
        assignedByUserId: adminFixture.user.id,
      });

      // Create null-assignment progress records for this trainee and campaign item
      await prisma.interactionEvent.create({
        data: {
          id: randomUUID(),
          traineeProfileId: trainee.traineeProfile.id,
          campaignAssignmentId: null,
          campaignItemId: progressFixture.item.id,
          eventType: InteractionEventType.TRAINING_VIEWED,
          targetType: InteractionTargetType.TRAINING_DOCUMENT,
          targetId: randomUUID(),
        },
      });

      await request(app)
        .delete(`/organisations/${orgId}/campaign-assignments/${progressFixture.assignment.id}`)
        .set('Authorization', `Bearer ${adminFixture.token}`);

      // Assert no progress exists for trainee on this campaign item
      const itemEvents = await prisma.interactionEvent.findMany({
        where: {
          traineeProfileId: trainee.traineeProfile.id,
          campaignItemId: progressFixture.item.id,
        },
      });
      expect(itemEvents).toHaveLength(0);
    });
  });

  describe('12. General Trainee Platform Campaign Discovery and Self-Enrolment Integration', () => {
    it('discovers only active premade platform campaigns with pagination and search', async () => {
      const generalTrainee = await loginAsGeneralTrainee();
      const orgAdmin = await loginAsOrgAdmin();

      // 1. Create active premade general platform campaign
      const platformActive = await createCampaign({
        name: `Premade Platform Security ${randomUUID()}`,
        campaignType: CampaignType.PREMADE_GENERAL,
        status: CampaignStatus.ACTIVE,
      });

      // 2. Create draft premade general platform campaign (should not be discoverable)
      await createCampaign({
        name: `Premade Draft ${randomUUID()}`,
        campaignType: CampaignType.PREMADE_GENERAL,
        status: CampaignStatus.DRAFT,
      });

      // 3. Create archived premade general platform campaign (should not be discoverable)
      await createCampaign({
        name: `Premade Archived ${randomUUID()}`,
        campaignType: CampaignType.PREMADE_GENERAL,
        status: CampaignStatus.ARCHIVED,
      });

      // 4. Create active organisation custom campaign (should not be discoverable by general trainee)
      await createCampaign({
        name: `Org Custom ${randomUUID()}`,
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
        organisationId: orgAdmin.organisation.id,
      });

      const res = await request(app)
        .get('/trainee/platform-campaigns?page=1&limit=50')
        .set('Authorization', `Bearer ${generalTrainee.token}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.items).toBeInstanceOf(Array);

      const foundCampaignIds = res.body.items.map((i: any) => i.campaignId);
      expect(foundCampaignIds).toContain(platformActive.id);

      // Verify no draft, archived, or custom campaigns leak in
      const allFound = res.body.items;
      for (const item of allFound) {
        expect(item.campaignType).toBe('PREMADE_GENERAL');
        expect(item.status).toBe('ACTIVE');
      }

      // Search filter
      const searchRes = await request(app)
        .get(`/trainee/platform-campaigns?search=${encodeURIComponent(platformActive.name.slice(0, 15))}`)
        .set('Authorization', `Bearer ${generalTrainee.token}`);

      expect(searchRes.status).toBe(200);
      const searchIds = searchRes.body.items.map((i: any) => i.campaignId);
      expect(searchIds).toContain(platformActive.id);
    });

    it('denies organisation trainees from accessing platform campaign discovery with 403', async () => {
      const orgAdmin = await loginAsOrgAdmin();
      const orgTrainee = await loginAsTrainee({ organisationId: orgAdmin.organisation.id });

      const res = await request(app)
        .get('/trainee/platform-campaigns')
        .set('Authorization', `Bearer ${orgTrainee.token}`);

      expect(res.status).toBe(403);
    });

    it('enrols general trainee in platform campaign with SELF_SELECTED access and visible in trainee campaign list', async () => {
      const generalTrainee = await loginAsGeneralTrainee();

      const platformCampaign = await createCampaign({
        name: `Platform Self-Enrol Campaign ${randomUUID()}`,
        campaignType: CampaignType.PREMADE_GENERAL,
        status: CampaignStatus.ACTIVE,
      });

      // 1. Initial discovery shows isEnrolled: false
      const discoveryRes1 = await request(app)
        .get(`/trainee/platform-campaigns?search=${encodeURIComponent(platformCampaign.name)}`)
        .set('Authorization', `Bearer ${generalTrainee.token}`);

      expect(discoveryRes1.status).toBe(200);
      const itemBefore = discoveryRes1.body.items.find((i: any) => i.campaignId === platformCampaign.id);
      expect(itemBefore).toBeDefined();
      expect(itemBefore.isEnrolled).toBe(false);
      expect(itemBefore.assignment).toBeNull();

      // 2. Perform self-enrolment
      const enrolRes = await request(app)
        .post(`/trainee/platform-campaigns/${platformCampaign.id}/enrol`)
        .set('Authorization', `Bearer ${generalTrainee.token}`);

      expect(enrolRes.status).toBe(200);
      expect(enrolRes.body.campaignId).toBe(platformCampaign.id);
      expect(enrolRes.body.accessType).toBe('SELF_SELECTED');
      expect(enrolRes.body.assignment).toMatchObject({
        accessType: 'SELF_SELECTED',
        assignmentStatus: 'ASSIGNED',
      });

      // Verify in database
      const dbAssignment = await prisma.campaignAssignment.findUnique({
        where: {
          campaignId_traineeProfileId: {
            campaignId: platformCampaign.id,
            traineeProfileId: generalTrainee.traineeProfile.id,
          },
        },
      });
      expect(dbAssignment).not.toBeNull();
      expect(dbAssignment?.accessType).toBe(CampaignAccessType.SELF_SELECTED);
      expect(dbAssignment?.assignedByUserId).toBeNull();

      // 3. Discovery now shows isEnrolled: true
      const discoveryRes2 = await request(app)
        .get(`/trainee/platform-campaigns?search=${encodeURIComponent(platformCampaign.name)}`)
        .set('Authorization', `Bearer ${generalTrainee.token}`);

      const itemAfter = discoveryRes2.body.items.find((i: any) => i.campaignId === platformCampaign.id);
      expect(itemAfter.isEnrolled).toBe(true);
      expect(itemAfter.accessType).toBe('SELF_SELECTED');
      expect(itemAfter.assignment).toBeDefined();

      // 4. Campaign list (GET /trainee/campaigns) contains the enrolled campaign
      const traineeCampaignsRes = await request(app)
        .get('/trainee/campaigns')
        .set('Authorization', `Bearer ${generalTrainee.token}`);

      expect(traineeCampaignsRes.status).toBe(200);
      const enrolledInList = traineeCampaignsRes.body.campaigns.find(
        (c: any) => c.campaignId === platformCampaign.id,
      );
      expect(enrolledInList).toBeDefined();
      expect(enrolledInList.accessType).toBe('SELF_SELECTED');

      // 5. Campaign detail (GET /trainee/campaigns/:campaignId) is accessible
      const traineeDetailRes = await request(app)
        .get(`/trainee/campaigns/${platformCampaign.id}`)
        .set('Authorization', `Bearer ${generalTrainee.token}`);

      expect(traineeDetailRes.status).toBe(200);
      expect(traineeDetailRes.body.campaignId).toBe(platformCampaign.id);
      expect(traineeDetailRes.body.accessType).toBe('SELF_SELECTED');
    });

    it('is idempotent on duplicate enrolment and does not reset progress', async () => {
      const generalTrainee = await loginAsGeneralTrainee();

      const platformCampaign = await createCampaign({
        name: `Idempotent Platform Campaign ${randomUUID()}`,
        campaignType: CampaignType.PREMADE_GENERAL,
        status: CampaignStatus.ACTIVE,
      });

      // First enrolment
      const enrolRes1 = await request(app)
        .post(`/trainee/platform-campaigns/${platformCampaign.id}/enrol`)
        .set('Authorization', `Bearer ${generalTrainee.token}`);

      expect(enrolRes1.status).toBe(200);
      const assignmentId = enrolRes1.body.assignment.assignmentId;

      // Simulate progress update on assignment
      await prisma.campaignAssignment.update({
        where: { id: assignmentId },
        data: {
          assignmentStatus: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      // Second enrolment (idempotent duplicate)
      const enrolRes2 = await request(app)
        .post(`/trainee/platform-campaigns/${platformCampaign.id}/enrol`)
        .set('Authorization', `Bearer ${generalTrainee.token}`);

      expect(enrolRes2.status).toBe(200);
      expect(enrolRes2.body.assignment.assignmentId).toBe(assignmentId);
      expect(enrolRes2.body.assignment.assignmentStatus).toBe('IN_PROGRESS');

      // Assert total assignments count in DB is still 1
      const count = await prisma.campaignAssignment.count({
        where: {
          campaignId: platformCampaign.id,
          traineeProfileId: generalTrainee.traineeProfile.id,
        },
      });
      expect(count).toBe(1);
    });

    it('preserves existing ASSIGNED accessType when trainee self-enrols in an admin-assigned platform campaign', async () => {
      const generalTrainee = await loginAsGeneralTrainee();
      const adminFixture = await loginAsOrgAdmin();

      const platformCampaign = await createCampaign({
        name: `Admin Pre-assigned Platform Campaign ${randomUUID()}`,
        campaignType: CampaignType.PREMADE_GENERAL,
        status: CampaignStatus.ACTIVE,
      });

      // Admin assigns campaign
      const existingAssignment = await prisma.campaignAssignment.create({
        data: {
          id: randomUUID(),
          campaignId: platformCampaign.id,
          traineeProfileId: generalTrainee.traineeProfile.id,
          assignedByUserId: adminFixture.user.id,
          accessType: CampaignAccessType.ASSIGNED,
          assignmentStatus: 'ASSIGNED',
        },
      });

      // Trainee calls self-enrol
      const enrolRes = await request(app)
        .post(`/trainee/platform-campaigns/${platformCampaign.id}/enrol`)
        .set('Authorization', `Bearer ${generalTrainee.token}`);

      expect(enrolRes.status).toBe(200);
      expect(enrolRes.body.accessType).toBe('ASSIGNED');
      expect(enrolRes.body.assignment.accessType).toBe('ASSIGNED');

      // Verify DB record is unchanged
      const refreshed = await prisma.campaignAssignment.findUniqueOrThrow({
        where: { id: existingAssignment.id },
      });
      expect(refreshed.accessType).toBe(CampaignAccessType.ASSIGNED);
      expect(refreshed.assignedByUserId).toBe(adminFixture.user.id);
    });

    it('rejects enrolment in organisation-owned custom campaigns with 404', async () => {
      const generalTrainee = await loginAsGeneralTrainee();
      const orgAdmin = await loginAsOrgAdmin();

      const orgCampaign = await createCampaign({
        name: `Private Org Campaign ${randomUUID()}`,
        campaignType: CampaignType.ORGANISATION_CUSTOM,
        status: CampaignStatus.ACTIVE,
        organisationId: orgAdmin.organisation.id,
      });

      const enrolRes = await request(app)
        .post(`/trainee/platform-campaigns/${orgCampaign.id}/enrol`)
        .set('Authorization', `Bearer ${generalTrainee.token}`);

      expect(enrolRes.status).toBe(404);
      expect(enrolRes.body.error).toBe('CAMPAIGN_NOT_FOUND');
    });

    it('handles concurrent enrol requests safely with exactly 1 assignment created', async () => {
      const generalTrainee = await loginAsGeneralTrainee();

      const platformCampaign = await createCampaign({
        name: `Concurrent Platform Campaign ${randomUUID()}`,
        campaignType: CampaignType.PREMADE_GENERAL,
        status: CampaignStatus.ACTIVE,
      });

      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/trainee/platform-campaigns/${platformCampaign.id}/enrol`)
          .set('Authorization', `Bearer ${generalTrainee.token}`),
        request(app)
          .post(`/trainee/platform-campaigns/${platformCampaign.id}/enrol`)
          .set('Authorization', `Bearer ${generalTrainee.token}`),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.assignment.assignmentId).toBe(res2.body.assignment.assignmentId);

      const dbAssignments = await prisma.campaignAssignment.findMany({
        where: {
          campaignId: platformCampaign.id,
          traineeProfileId: generalTrainee.traineeProfile.id,
        },
      });
      expect(dbAssignments).toHaveLength(1);
    });
  });
});


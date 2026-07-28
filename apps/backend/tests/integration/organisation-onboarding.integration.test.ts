import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOrganisationRegistrationRequest,
  approveOrganisationRequest,
} from '../../src/services/organisation-registration-request.service.js';
import { completeSetupWithToken } from '../../src/services/setup.service.js';
import { acceptInvitationWithToken } from '../../src/services/invitation.service.js';
import {
  createOrganisationTraineeInvitation,
  listOrganisationTrainees,
} from '../../src/services/organisation-trainee.service.js';
import { prisma } from '../../src/lib/prisma.js';
import { createOrganisation, createTrainee, generateTestEmail } from '../helpers/factories.js';
import { hashOpaqueToken } from '../../src/services/token-hash.service.js';

const sendMailMock = vi.hoisted(() => vi.fn());
const nodemailerMock = vi.hoisted(() => ({
  createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
}));

vi.mock('nodemailer', () => ({ default: nodemailerMock }));

function extractSetupTokenFromEmail(): string {
  const lastCall = sendMailMock.mock.calls[sendMailMock.mock.calls.length - 1]?.[0];
  const body = `${lastCall?.text ?? ''}\n${lastCall?.html ?? ''}`;
  const match = body.match(/(?:\/setup\/token\/|\/accept-invite\?token=)([A-Za-z0-9_-]+)/);

  if (!match?.[1]) {
    throw new Error(`Unable to extract setup token from email body: ${body}`);
  }

  return match[1];
}

async function createPlatformAdminUser(email: string) {
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      firstName: 'Platform',
      lastName: 'Admin',
      email,
      passwordHash: ['scrypt', 'platform', 'fixture'].join('$'),
      userType: 'IP_ADMIN',
      authStatus: 'ACTIVE',
    },
  });

  await prisma.ipAdminProfile.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      adminStatus: 'ACTIVE',
    },
  });

  return user;
}

async function createInvitationTokenFixture(input: {
  organisationId: string;
  email: string;
  rawToken: string;
  purpose: 'ORGANISATION_ADMIN_PROMOTION' | 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION';
  invitationId?: string | null;
}) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const actionToken = await prisma.actionToken.create({
    data: {
      id: randomUUID(),
      tokenHash: hashOpaqueToken(input.rawToken),
      purpose: input.purpose,
      invitationId: input.invitationId ?? null,
      targetEmail: input.email,
      expiresAt,
    },
  });

  return actionToken;
}

describe('organisation onboarding and role transition integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMailMock.mockResolvedValue({ messageId: 'smtpmessage01' });
  });

  it('approves a new organisation, provisions trainee permissions, completes setup, and allows trainee management access', async () => {
    const platformAdmin = await createPlatformAdminUser(generateTestEmail('platform-admin'));
    const initialAdminEmail = generateTestEmail('initial-admin');
    const uniqueOrgName = `Permissioned Org ${randomUUID()}`;
    const uniqueWebsite = `https://permissioned-${randomUUID().slice(0, 8)}.example.test`;
    const request = await createOrganisationRegistrationRequest({
      organisationName: uniqueOrgName,
      organisationDescription: 'Organisation created after migration state is present.',
      organisationSize: 25,
      organisationWebsiteUrl: uniqueWebsite,
      representativeFirstName: 'Riley',
      representativeLastName: 'Representative',
      representativeEmail: initialAdminEmail,
    });

    const approved = await approveOrganisationRequest(platformAdmin.id, request.requestId, {
      organisationName: uniqueOrgName,
      initialAdminEmail,
    });

    const setupToken = extractSetupTokenFromEmail();
    const setupResult = await completeSetupWithToken(setupToken, {
      firstName: 'Riley',
      lastName: 'Representative',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const adminUser = await prisma.user.findUniqueOrThrow({
      where: { id: setupResult.user.id },
      include: {
        organisationAdminProfile: true,
      },
    });

    const permissionRows = await prisma.organisationPermission.findMany({
      where: { organisationId: approved.approvedOrganisation.id },
      orderBy: { key: 'asc' },
    });
    const grantedRows = await prisma.organisationAdminPermission.findMany({
      where: { organisationAdminId: adminUser.organisationAdminProfile!.id },
      include: {
        organisationPermission: true,
      },
      orderBy: {
        organisationPermission: { key: 'asc' },
      },
    });

    expect(permissionRows.map((permission) => permission.key)).toEqual(
      expect.arrayContaining([
        'VIEW_ORGANISATION_TRAINEES',
        'INVITE_ORGANISATION_TRAINEES',
        'REMOVE_ORGANISATION_TRAINEES',
      ]),
    );
    expect(grantedRows.map((grant) => grant.organisationPermission.key)).toEqual(
      expect.arrayContaining([
        'VIEW_ORGANISATION_TRAINEES',
        'INVITE_ORGANISATION_TRAINEES',
        'REMOVE_ORGANISATION_TRAINEES',
      ]),
    );

    await expect(
      listOrganisationTrainees(adminUser.id, approved.approvedOrganisation.id),
    ).resolves.toBeDefined();
    await expect(
      createOrganisationTraineeInvitation(adminUser.id, approved.approvedOrganisation.id, {
        email: generateTestEmail('new-trainee'),
        firstName: 'New',
        lastName: 'Trainee',
      }),
    ).resolves.toMatchObject({ success: true });
  });

  it('rejects setup completion when the existing trainee profile belongs to another organisation', async () => {
    const orgA = await createOrganisation({ name: `Setup Org A ${randomUUID()}` });
    const orgB = await createOrganisation({ name: `Setup Org B ${randomUUID()}` });
    const trainee = await createTrainee({
      user: { email: generateTestEmail('cross-org') },
      organisationProfile: { organisationId: orgB.id },
    });

    const rawToken = ['setup', 'cross', randomUUID()].join('-');
    const invitation = await prisma.invitation.create({
      data: {
        id: randomUUID(),
        organisationId: orgA.id,
        recipientEmail: trainee.user.email,
        recipientFirstName: 'Cross',
        recipientLastName: 'Org',
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.actionToken.create({
      data: {
        id: randomUUID(),
        tokenHash: hashOpaqueToken(rawToken),
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        invitationId: invitation.id,
        targetEmail: trainee.user.email,
        expiresAt: invitation.expiresAt,
      },
    });

    await expect(
      completeSetupWithToken(rawToken, {
        firstName: 'Cross',
        lastName: 'Org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      error: 'SETUP_ROLE_CONFLICT',
    });

    const persistedMembership = await prisma.organisationTraineeProfile.findUniqueOrThrow({
      where: { traineeProfileId: trainee.traineeProfile.id },
    });
    expect(persistedMembership.organisationId).toBe(orgB.id);
  });

  it('rejects setup completion when the existing trainee membership is disabled', async () => {
    const organisation = await createOrganisation({ name: `Disabled Setup Org ${randomUUID()}` });
    const trainee = await createTrainee({
      user: { email: generateTestEmail('disabled-membership') },
      organisationProfile: { organisationId: organisation.id, membershipStatus: 'DISABLED' },
    });

    await prisma.organisationTraineeProfile.update({
      where: { id: trainee.organisationTraineeProfile!.id },
      data: {
        disabledAt: new Date(),
        disabledReason: 'Disabled before setup',
      },
    });

    const rawToken = ['setup', 'disabled', randomUUID()].join('-');
    const invitation = await prisma.invitation.create({
      data: {
        id: randomUUID(),
        organisationId: organisation.id,
        recipientEmail: trainee.user.email,
        recipientFirstName: 'Disabled',
        recipientLastName: 'Member',
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.actionToken.create({
      data: {
        id: randomUUID(),
        tokenHash: hashOpaqueToken(rawToken),
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        invitationId: invitation.id,
        targetEmail: trainee.user.email,
        expiresAt: invitation.expiresAt,
      },
    });

    await expect(
      completeSetupWithToken(rawToken, {
        firstName: 'Disabled',
        lastName: 'Member',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      error: 'SETUP_ROLE_CONFLICT',
    });

    const persistedMembership = await prisma.organisationTraineeProfile.findUniqueOrThrow({
      where: { traineeProfileId: trainee.traineeProfile.id },
    });
    expect(persistedMembership.membershipStatus).toBe('DISABLED');
  });

  it('marks the replaced organisation trainee profile inactive after promotion to organisation admin', async () => {
    const organisation = await createOrganisation({ name: `Promotion Org ${randomUUID()}` });
    const trainee = await createTrainee({
      user: { email: generateTestEmail('promotion-target') },
      organisationProfile: { organisationId: organisation.id },
    });

    const rawToken = ['promo', 'org', randomUUID()].join('-');
    const invitation = await prisma.invitation.create({
      data: {
        id: randomUUID(),
        organisationId: organisation.id,
        targetUserId: trainee.user.id,
        recipientEmail: trainee.user.email,
        recipientFirstName: trainee.user.firstName,
        recipientLastName: trainee.user.lastName,
        purpose: 'ORGANISATION_ADMIN_PROMOTION',
        status: 'SENT',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await createInvitationTokenFixture({
      organisationId: organisation.id,
      email: trainee.user.email,
      rawToken,
      purpose: 'ORGANISATION_ADMIN_PROMOTION',
      invitationId: invitation.id,
    });

    await acceptInvitationWithToken(
      rawToken,
      { confirmRoleChange: true },
      { email: trainee.user.email, userId: trainee.user.id },
    );

    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: trainee.user.id },
      include: {
        traineeProfile: {
          include: {
            organisationTraineeProfile: true,
          },
        },
        organisationAdminProfile: true,
      },
    });

    expect(updatedUser.userType).toBe('ORGANISATION_ADMIN');
    expect(updatedUser.traineeProfile).toBeTruthy();
    expect(updatedUser.traineeProfile?.traineeStatus).toBe('INACTIVE');
    expect(updatedUser.traineeProfile?.organisationTraineeProfile?.membershipStatus).toBe(
      'INACTIVE',
    );
    expect(updatedUser.organisationAdminProfile?.adminStatus).toBe('ACTIVE');
  });

  it('marks the replaced general trainee profile inactive after platform admin upgrade', async () => {
    const trainee = await createTrainee({
      user: { email: generateTestEmail('platform-upgrade') },
    });

    const rawToken = ['promo', 'platform', randomUUID()].join('-');
    await createInvitationTokenFixture({
      organisationId: trainee.traineeProfile.id,
      email: trainee.user.email,
      rawToken,
      purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
    });

    await acceptInvitationWithToken(
      rawToken,
      {},
      { email: trainee.user.email, userId: trainee.user.id },
    );

    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: trainee.user.id },
      include: {
        traineeProfile: true,
        ipAdminProfile: true,
      },
    });

    expect(updatedUser.userType).toBe('IP_ADMIN');
    expect(updatedUser.traineeProfile).toBeTruthy();
    expect(updatedUser.traineeProfile?.traineeStatus).toBe('INACTIVE');
    expect(updatedUser.ipAdminProfile?.adminStatus).toBe('ACTIVE');
  });
});

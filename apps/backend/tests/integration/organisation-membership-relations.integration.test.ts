import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';

const TEST_HASHED_CREDENTIAL = ['scrypt', 'membership', 'fixture'].join('$');
const EXPIRES_AT = new Date('2026-07-29T08:00:00.000Z');

function testId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

function testEmail(prefix: string) {
  return `${prefix}-${randomUUID()}@example.test`;
}

async function createOrganisation(namePrefix: string) {
  return prisma.organisation.create({
    data: {
      id: testId('org'),
      name: `${namePrefix} ${randomUUID()}`,
      status: 'ACTIVE',
    },
  });
}

async function createUser(emailPrefix: string) {
  return prisma.user.create({
    data: {
      id: testId('user'),
      firstName: 'Test',
      lastName: 'Member',
      email: testEmail(emailPrefix),
      passwordHash: TEST_HASHED_CREDENTIAL,
      userType: 'ORGANISATION_TRAINEE',
      authStatus: 'ACTIVE',
    },
  });
}

async function createTraineeProfile(userId: string) {
  return prisma.traineeProfile.create({
    data: {
      id: testId('trainee-profile'),
      userId,
      traineeStatus: 'ACTIVE',
    },
  });
}

async function createInvitation(input: {
  organisationId: string;
  targetUserId: string;
  emailPrefix: string;
}) {
  return prisma.invitation.create({
    data: {
      id: testId('invitation'),
      organisationId: input.organisationId,
      targetUserId: input.targetUserId,
      recipientEmail: testEmail(input.emailPrefix),
      recipientFirstName: 'Invited',
      recipientLastName: 'Member',
      purpose: 'ORGANISATION_TRAINEE_INVITE',
      status: 'SENT',
      expiresAt: EXPIRES_AT,
    },
  });
}

describe('organisation membership Prisma relations', () => {
  it('resolves invitation action-token and email-log relations', async () => {
    const organisation = await createOrganisation('Membership Relations');
    const targetUser = await createUser('member-target');
    const invitation = await createInvitation({
      organisationId: organisation.id,
      targetUserId: targetUser.id,
      emailPrefix: 'member-invite',
    });

    const actionToken = await prisma.actionToken.create({
      data: {
        id: testId('action-token'),
        tokenHash: `sha256:${randomUUID()}`,
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        invitationId: invitation.id,
        targetEmail: invitation.recipientEmail,
        expiresAt: EXPIRES_AT,
      },
    });

    const emailDeliveryLog = await prisma.emailDeliveryLog.create({
      data: {
        id: testId('email-log'),
        recipientEmail: invitation.recipientEmail,
        emailType: 'ORGANISATION_TRAINEE_INVITE',
        actionTokenId: actionToken.id,
        organisationId: organisation.id,
        invitationId: invitation.id,
        deliveryStatus: 'PENDING',
      },
    });

    const storedInvitation = await prisma.invitation.findUniqueOrThrow({
      where: { id: invitation.id },
      include: {
        actionTokens: true,
        emailDeliveryLogs: true,
      },
    });

    expect(storedInvitation.actionTokens).toMatchObject([{ id: actionToken.id }]);
    expect(storedInvitation.emailDeliveryLogs).toMatchObject([{ id: emailDeliveryLog.id }]);
  });

  it('links accepted invitations to organisation-scoped trainee memberships', async () => {
    const organisation = await createOrganisation('Accepted Membership');
    const targetUser = await createUser('accepted-member');
    const traineeProfile = await createTraineeProfile(targetUser.id);
    const invitation = await createInvitation({
      organisationId: organisation.id,
      targetUserId: targetUser.id,
      emailPrefix: 'accepted-invite',
    });

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'COMPLETED',
        acceptedAt: new Date('2026-07-01T08:00:00.000Z'),
      },
    });

    const membership = await prisma.organisationTraineeProfile.create({
      data: {
        id: testId('membership'),
        traineeProfileId: traineeProfile.id,
        organisationId: organisation.id,
        membershipStatus: 'ACTIVE',
        createdFromInvitationId: invitation.id,
      },
    });

    const storedInvitation = await prisma.invitation.findUniqueOrThrow({
      where: { id: invitation.id },
      include: {
        acceptedOrganisationTraineeProfile: true,
      },
    });

    expect(storedInvitation.status).toBe('COMPLETED');
    expect(storedInvitation.acceptedOrganisationTraineeProfile).toMatchObject({
      id: membership.id,
      organisationId: organisation.id,
      createdFromInvitationId: invitation.id,
      membershipStatus: 'ACTIVE',
    });
  });

  it.each([
    'PENDING',
    'SENT',
    'FAILED_TO_SEND',
    'ACCEPTED',
    'COMPLETED',
    'EXPIRED',
    'REVOKED',
    'REJECTED',
  ] as const)('can represent invitation status %s', async (status) => {
    const organisation = await createOrganisation(`Status ${status}`);
    const targetUser = await createUser(`status-${status.toLowerCase()}`);

    const invitation = await prisma.invitation.create({
      data: {
        id: testId('invitation-status'),
        organisationId: organisation.id,
        targetUserId: targetUser.id,
        recipientEmail: testEmail(`status-${status.toLowerCase()}`),
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        status,
        expiresAt: EXPIRES_AT,
      },
    });

    expect(invitation.status).toBe(status);
    expect(invitation.purpose).toBe('ORGANISATION_TRAINEE_INVITE');
  });

  it('rejects linking a membership to an invitation from another organisation', async () => {
    const invitationOrganisation = await createOrganisation('Invitation Organisation');
    const membershipOrganisation = await createOrganisation('Membership Organisation');
    const targetUser = await createUser('cross-org-member');
    const traineeProfile = await createTraineeProfile(targetUser.id);
    const invitation = await createInvitation({
      organisationId: invitationOrganisation.id,
      targetUserId: targetUser.id,
      emailPrefix: 'cross-org-invite',
    });

    await expect(
      prisma.organisationTraineeProfile.create({
        data: {
          id: testId('cross-org-membership'),
          traineeProfileId: traineeProfile.id,
          organisationId: membershipOrganisation.id,
          membershipStatus: 'ACTIVE',
          createdFromInvitationId: invitation.id,
        },
      }),
    ).rejects.toThrow();
  });
});

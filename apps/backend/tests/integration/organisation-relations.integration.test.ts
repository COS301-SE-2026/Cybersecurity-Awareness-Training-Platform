import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';

const NOW = new Date('2026-06-23T08:00:00.000Z');
const EXPIRES_AT = new Date('2026-06-30T08:00:00.000Z');
const PASSWORD_HASH = ['scrypt', 'fixture', 'hash'].join('$');
const ACTION_TOKEN_HASH = ['sha256', 'fixture', 'initial-admin-setup'].join(':');

type OnboardingFixture = {
  readonly organisationId: string;
  readonly requestId: string;
  readonly invitationId: string;
  readonly actionTokenId: string;
  readonly emailDeliveryLogId: string;
  readonly contactedByIpAdminId: string;
  readonly approvedByIpAdminId: string;
  readonly rejectedByIpAdminId: string;
};

async function createPlatformAdmin(id: string, email: string): Promise<string> {
  const userId = `${id}-user`;

  await prisma.$executeRaw`
    INSERT INTO "User" (
      "id",
      "firstName",
      "lastName",
      "email",
      "passwordHash",
      "userType",
      "authStatus",
      "updatedAt"
    )
    VALUES (
      ${userId},
      'Platform',
      'Admin',
      ${email},
      ${PASSWORD_HASH},
      'IP_ADMIN',
      'ACTIVE',
      ${NOW}
    )
  `;

  await prisma.$executeRaw`
    INSERT INTO "IpAdminProfile" (
      "id",
      "userId",
      "adminStatus",
      "platformAdminRole",
      "updatedAt"
    )
    VALUES (
      ${id},
      ${userId},
      'ACTIVE',
      'NORMAL_ADMIN',
      ${NOW}
    )
  `;

  return id;
}

async function createOrganisation(id: string): Promise<string> {
  await prisma.$executeRaw`
    INSERT INTO "Organisation" (
      "id",
      "name",
      "status",
      "updatedAt"
    )
    VALUES (
      ${id},
      'Example Training Ltd',
      'ACTIVE',
      ${NOW}
    )
  `;

  return id;
}

async function createRegistrationRequest(
  id: string,
  fixture: Pick<
    OnboardingFixture,
    'organisationId' | 'contactedByIpAdminId' | 'approvedByIpAdminId'
  >,
): Promise<string> {
  await prisma.$executeRaw`
    INSERT INTO "OrganisationRegistrationRequest" (
      "id",
      "submittedOrganisationName",
      "submittedWebsite",
      "submittedIndustry",
      "submittedEmployeeCount",
      "submittedPrimaryDomain",
      "representativeFirstName",
      "representativeLastName",
      "representativeEmail",
      "representativePhone",
      "status",
      "contactedByIpAdminId",
      "approvedByIpAdminId",
      "approvedOrganisationId",
      "contactedAt",
      "approvedAt",
      "updatedAt"
    )
    VALUES (
      ${id},
      'Example Training Ltd',
      'https://example.test',
      'Education',
      42,
      'example.test',
      'Riley',
      'Representative',
      'riley.representative@example.test',
      '+27000000000',
      'APPROVED',
      ${fixture.contactedByIpAdminId},
      ${fixture.approvedByIpAdminId},
      ${fixture.organisationId},
      ${NOW},
      ${NOW},
      ${NOW}
    )
  `;

  return id;
}

async function createRejectedRegistrationRequest(
  id: string,
  rejectedByIpAdminId: string,
): Promise<string> {
  await prisma.$executeRaw`
    INSERT INTO "OrganisationRegistrationRequest" (
      "id",
      "submittedOrganisationName",
      "representativeFirstName",
      "representativeLastName",
      "representativeEmail",
      "status",
      "rejectedByIpAdminId",
      "rejectedAt",
      "rejectionReason",
      "updatedAt"
    )
    VALUES (
      ${id},
      'Rejected Example Ltd',
      'Casey',
      'Representative',
      'casey.representative@example.test',
      'REJECTED',
      ${rejectedByIpAdminId},
      ${NOW},
      'Representative could not verify organisation ownership.',
      ${NOW}
    )
  `;

  return id;
}

async function createInvitation(fixture: OnboardingFixture): Promise<string> {
  await prisma.$executeRaw`
    INSERT INTO "Invitation" (
      "id",
      "organisationId",
      "organisationRegistrationRequestId",
      "recipientEmail",
      "recipientFirstName",
      "recipientLastName",
      "purpose",
      "status",
      "expiresAt",
      "updatedAt"
    )
    VALUES (
      ${fixture.invitationId},
      ${fixture.organisationId},
      ${fixture.requestId},
      'initial.admin@example.test',
      'Initial',
      'Admin',
      'INITIAL_ORGANISATION_ADMIN_SETUP',
      'PENDING',
      ${EXPIRES_AT},
      ${NOW}
    )
  `;

  return fixture.invitationId;
}

async function createActionToken(fixture: OnboardingFixture): Promise<string> {
  await prisma.$executeRaw`
    INSERT INTO "ActionToken" (
      "id",
      "tokenHash",
      "purpose",
      "invitationId",
      "organisationRegistrationRequestId",
      "targetEmail",
      "expiresAt",
      "updatedAt"
    )
    VALUES (
      ${fixture.actionTokenId},
      ${ACTION_TOKEN_HASH},
      'INITIAL_ORGANISATION_ADMIN_SETUP',
      ${fixture.invitationId},
      ${fixture.requestId},
      'initial.admin@example.test',
      ${EXPIRES_AT},
      ${NOW}
    )
  `;

  return fixture.actionTokenId;
}

async function createEmailDeliveryLog(fixture: OnboardingFixture): Promise<string> {
  await prisma.$executeRaw`
    INSERT INTO "EmailDeliveryLog" (
      "id",
      "recipientEmail",
      "emailType",
      "relatedEntityType",
      "relatedEntityId",
      "actionTokenId",
      "organisationId",
      "organisationRegistrationRequestId",
      "invitationId",
      "deliveryStatus",
      "updatedAt"
    )
    VALUES (
      ${fixture.emailDeliveryLogId},
      'initial.admin@example.test',
      'INITIAL_ORGANISATION_ADMIN_SETUP',
      NULL,
      NULL,
      ${fixture.actionTokenId},
      ${fixture.organisationId},
      ${fixture.requestId},
      ${fixture.invitationId},
      'PENDING',
      ${NOW}
    )
  `;

  return fixture.emailDeliveryLogId;
}

async function createOnboardingFixture(): Promise<OnboardingFixture> {
  const fixture: OnboardingFixture = {
    organisationId: 'org-onboarding-organisation',
    requestId: 'org-onboarding-request',
    invitationId: 'org-onboarding-invitation',
    actionTokenId: 'org-onboarding-action-token',
    emailDeliveryLogId: 'org-onboarding-email-log',
    contactedByIpAdminId: 'org-onboarding-contacted-admin',
    approvedByIpAdminId: 'org-onboarding-approved-admin',
    rejectedByIpAdminId: 'org-onboarding-rejected-admin',
  };

  await createPlatformAdmin(fixture.contactedByIpAdminId, 'contacted.admin@example.test');
  await createPlatformAdmin(fixture.approvedByIpAdminId, 'approved.admin@example.test');
  await createPlatformAdmin(fixture.rejectedByIpAdminId, 'rejected.admin@example.test');
  await createOrganisation(fixture.organisationId);
  await createRegistrationRequest(fixture.requestId, fixture);
  await createRejectedRegistrationRequest(
    'org-onboarding-rejected-request',
    fixture.rejectedByIpAdminId,
  );
  await createInvitation(fixture);
  await createActionToken(fixture);
  await createEmailDeliveryLog(fixture);

  return fixture;
}

describe('organisation onboarding Prisma relations', () => {
  it('creates onboarding records with lifecycle actor relations', async () => {
    const fixture = await createOnboardingFixture();

    const rows = await prisma.$queryRaw<
      Array<{
        request_id: string;
        contacted_by: string | null;
        approved_by: string | null;
        rejected_by: string | null;
      }>
    >`
      SELECT
        approved."id" AS request_id,
        contacted_admin."id" AS contacted_by,
        approved_admin."id" AS approved_by,
        rejected_admin."id" AS rejected_by
      FROM "OrganisationRegistrationRequest" approved
      LEFT JOIN "IpAdminProfile" contacted_admin
        ON contacted_admin."id" = approved."contactedByIpAdminId"
      LEFT JOIN "IpAdminProfile" approved_admin
        ON approved_admin."id" = approved."approvedByIpAdminId"
      LEFT JOIN "OrganisationRegistrationRequest" rejected
        ON rejected."id" = 'org-onboarding-rejected-request'
      LEFT JOIN "IpAdminProfile" rejected_admin
        ON rejected_admin."id" = rejected."rejectedByIpAdminId"
      WHERE approved."id" = ${fixture.requestId}
    `;

    expect(rows).toEqual([
      {
        request_id: fixture.requestId,
        contacted_by: fixture.contactedByIpAdminId,
        approved_by: fixture.approvedByIpAdminId,
        rejected_by: fixture.rejectedByIpAdminId,
      },
    ]);
  });

  it('links approved request, organisation, invitation, action token, and email log', async () => {
    const fixture = await createOnboardingFixture();

    const rows = await prisma.$queryRaw<
      Array<{
        request_id: string;
        organisation_id: string;
        invitation_id: string;
        action_token_id: string;
        email_log_id: string;
        fallback_type: string | null;
        fallback_id: string | null;
      }>
    >`
      SELECT
        request."id" AS request_id,
        organisation."id" AS organisation_id,
        invitation."id" AS invitation_id,
        action_token."id" AS action_token_id,
        email_log."id" AS email_log_id,
        email_log."relatedEntityType" AS fallback_type,
        email_log."relatedEntityId" AS fallback_id
      FROM "OrganisationRegistrationRequest" request
      INNER JOIN "Organisation" organisation
        ON organisation."id" = request."approvedOrganisationId"
      INNER JOIN "Invitation" invitation
        ON invitation."organisationId" = organisation."id"
        AND invitation."organisationRegistrationRequestId" = request."id"
      INNER JOIN "ActionToken" action_token
        ON action_token."invitationId" = invitation."id"
        AND action_token."organisationRegistrationRequestId" = request."id"
      INNER JOIN "EmailDeliveryLog" email_log
        ON email_log."invitationId" = invitation."id"
        AND email_log."organisationRegistrationRequestId" = request."id"
        AND email_log."organisationId" = organisation."id"
        AND email_log."actionTokenId" = action_token."id"
      WHERE request."id" = ${fixture.requestId}
    `;

    expect(rows).toEqual([
      {
        request_id: fixture.requestId,
        organisation_id: fixture.organisationId,
        invitation_id: fixture.invitationId,
        action_token_id: fixture.actionTokenId,
        email_log_id: fixture.emailDeliveryLogId,
        fallback_type: null,
        fallback_id: null,
      },
    ]);
  });
});

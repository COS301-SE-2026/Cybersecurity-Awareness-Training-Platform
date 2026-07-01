import type {
  OrganisationAdminPermissionUpdateRequestDto,
  OrganisationAdminPromotionRequestDto,
  OrganisationAdminRemoveRequestDto,
} from '@insightful-phish/shared';
import { OrganisationPermissionKey } from '../generated/prisma/enums.js';
import type { OrganisationPermissionKey as OrganisationPermissionKeyValue } from '../generated/prisma/enums.js';
import { issueActionToken } from './action-token.service.js';
import { verifyPassword } from './password.service.js';
import {
  countActiveOrganisationAdminsWithPermission,
  createInvitationPermissionGrants,
  createOrganisationAdminPromotionInvitation,
  deleteOrganisationAdminPermissionGrants,
  disableOrganisationAdmin,
  findActiveOrganisationTraineeByEmail,
  findActorOrganisationAdmin,
  findOrganisationAdminById,
  findOrganisationAdminByUserId,
  findOrganisationPermissionsByKeys,
  findPendingOrganisationAdminPromotionInvitation,
  listOrganisationAdminsWithPermissions,
  listOrganisationPermissions,
  replaceOrganisationAdminPermissionGrants,
  runOrganisationAdminTransaction,
} from '../repositories/organisation-admin.repository.js';

const ORGANISATION_ADMIN_PROMOTION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ADMIN_VIEW_PERMISSION = OrganisationPermissionKey.VIEW_ORGANISATION_ADMINS;
const ADMIN_INVITE_PERMISSION = OrganisationPermissionKey.INVITE_ORGANISATION_ADMINS;
const ADMIN_REMOVE_PERMISSION = OrganisationPermissionKey.REMOVE_ORGANISATION_ADMINS;
const ADMIN_CHANGE_PERMISSION = OrganisationPermissionKey.CHANGE_ORGANISATION_ADMIN_PERMISSIONS;

const CRITICAL_ADMIN_PERMISSION_KEYS = [ADMIN_INVITE_PERMISSION, ADMIN_CHANGE_PERMISSION] as const;

const ORGANISATION_PERMISSION_KEY_VALUES = new Set<string>(
  Object.values(OrganisationPermissionKey),
);

export class OrganisationAdminServiceError extends Error {
  constructor(
    public readonly statusCode: 403 | 404 | 409 | 422,
    public readonly error: string,
    message: string,
  ) {
    super(message);
    this.name = 'OrganisationAdminServiceError';
  }
}

export async function getOrganisationAdmins(actorUserId: string, organisationId: string) {
  const actor = await requireActorAdmin(actorUserId, organisationId);
  const actorPermissionKeys = permissionKeysForAdmin(actor);

  requirePermission(actorPermissionKeys, ADMIN_VIEW_PERMISSION);

  const [admins, availablePermissions] = await Promise.all([
    listOrganisationAdminsWithPermissions(organisationId),
    listOrganisationPermissions(organisationId),
  ]);

  return {
    admins: admins.map((admin) => ({
      id: admin.id,
      userId: admin.userId,
      firstName: admin.user.firstName,
      lastName: admin.user.lastName,
      email: admin.user.email,
      adminStatus: admin.adminStatus,
      isInitialAdmin: admin.isInitialAdmin,
      joinedAt: admin.joinedAt.toISOString(),
      disabledAt: admin.disabledAt?.toISOString() ?? null,
      permissions: admin.permissionGrants
        .map((grant) => ({
          key: grant.organisationPermission.key,
          displayName: grant.organisationPermission.displayName,
        }))
        .sort((first, second) => first.key.localeCompare(second.key)),
    })),
    availablePermissions: availablePermissions.map((permission) => ({
      key: permission.key,
      displayName: permission.displayName,
      description: permission.description,
      isCritical: permission.isCritical,
    })),
    actorPermissions: actorPermissionKeys.sort(),
  };
}

export async function createAdminPromotion(
  actorUserId: string,
  organisationId: string,
  input: OrganisationAdminPromotionRequestDto,
) {
  const actor = await requireActorAdmin(actorUserId, organisationId);
  requirePermission(permissionKeysForAdmin(actor), ADMIN_INVITE_PERMISSION);

  assertOrganisationAllowsMutation(actor.organisation.status);

  const permissionKeys = normalisePermissionKeys(input.permissionKeys);
  const permissions = await requireOrganisationPermissions(organisationId, permissionKeys);
  const targetUser = await findActiveOrganisationTraineeByEmail({
    organisationId,
    email: input.traineeEmail,
  });

  if (!targetUser) {
    throw new OrganisationAdminServiceError(
      409,
      'ORG_ADMIN_TARGET_TRAINEE_REQUIRED',
      'Target user must be an active organisation trainee in this organisation',
    );
  }

  const existingAdmin = await findOrganisationAdminByUserId({
    organisationId,
    userId: targetUser.id,
  });

  if (existingAdmin?.adminStatus === 'ACTIVE') {
    throw new OrganisationAdminServiceError(
      409,
      'ORG_ADMIN_TARGET_ALREADY_ADMIN',
      'Target user is already an active organisation admin',
    );
  }

  const pendingInvite = await findPendingOrganisationAdminPromotionInvitation({
    organisationId,
    targetUserId: targetUser.id,
  });

  if (pendingInvite) {
    throw new OrganisationAdminServiceError(
      409,
      'ORG_ADMIN_PROMOTION_INVITE_EXISTS',
      'A pending organisation admin promotion invitation already exists for this user',
    );
  }

  const expiresAt = new Date(Date.now() + ORGANISATION_ADMIN_PROMOTION_TTL_MS);

  const promotion = await runOrganisationAdminTransaction(async (tx) => {
    const invitation = await createOrganisationAdminPromotionInvitation(
      {
        organisationId,
        targetUserId: targetUser.id,
        recipientEmail: targetUser.email,
        recipientFirstName: targetUser.firstName,
        recipientLastName: targetUser.lastName,
        expiresAt,
      },
      tx,
    );

    await createInvitationPermissionGrants(
      {
        organisationId,
        invitationId: invitation.id,
        organisationPermissionIds: permissions.map((permission) => permission.id),
      },
      tx,
    );

    const actionToken = await issueActionToken(
      {
        purpose: 'ORGANISATION_ADMIN_PROMOTION',
        userId: targetUser.id,
        invitationId: invitation.id,
        targetEmail: targetUser.email,
        expiresAt,
      },
      tx,
    );

    return {
      invitation,
      actionToken: actionToken.token,
    };
  });

  return {
    invitationId: promotion.invitation.id,
    actionTokenId: promotion.actionToken.id,
    status: promotion.invitation.status,
    expiresAt: promotion.invitation.expiresAt.toISOString(),
    permissionKeys,
  };
}

export async function changeAdminPermissions(
  actorUserId: string,
  organisationId: string,
  adminId: string,
  input: OrganisationAdminPermissionUpdateRequestDto,
) {
  const actor = await requireActorAdmin(actorUserId, organisationId);
  requirePermission(permissionKeysForAdmin(actor), ADMIN_CHANGE_PERMISSION);
  assertOrganisationAllowsMutation(actor.organisation.status);

  const permissionKeys = normalisePermissionKeys(input.permissionKeys);
  const permissions = await requireOrganisationPermissions(organisationId, permissionKeys);
  const targetAdmin = await requireTargetAdmin(organisationId, adminId);

  if (targetAdmin.adminStatus !== 'ACTIVE') {
    throw new OrganisationAdminServiceError(
      409,
      'ORG_ADMIN_TARGET_DISABLED',
      'Target organisation admin is not active',
    );
  }

  await assertCriticalAdminSafeguard({
    organisationId,
    targetAdminId: adminId,
    proposedPermissionKeys: permissionKeys,
  });

  await runOrganisationAdminTransaction(async (tx) =>
    replaceOrganisationAdminPermissionGrants(
      {
        organisationId,
        organisationAdminId: adminId,
        organisationPermissionIds: permissions.map((permission) => permission.id),
        grantedByOrganisationAdminId: actor.id,
      },
      tx,
    ),
  );

  return {
    adminId,
    permissionKeys,
  };
}

export async function removeAdmin(
  actorUserId: string,
  organisationId: string,
  adminId: string,
  input: OrganisationAdminRemoveRequestDto,
) {
  const actor = await requireActorAdmin(actorUserId, organisationId);
  requirePermission(permissionKeysForAdmin(actor), ADMIN_REMOVE_PERMISSION);
  assertOrganisationAllowsMutation(actor.organisation.status);

  const passwordMatches = await verifyPassword(input.password, actor.user.passwordHash);
  if (!passwordMatches) {
    throw new OrganisationAdminServiceError(
      403,
      'ORG_ADMIN_PASSWORD_INVALID',
      'Password confirmation failed',
    );
  }

  const targetAdmin = await requireTargetAdmin(organisationId, adminId);

  if (targetAdmin.adminStatus !== 'ACTIVE') {
    throw new OrganisationAdminServiceError(
      409,
      'ORG_ADMIN_TARGET_DISABLED',
      'Target organisation admin is not active',
    );
  }

  await assertCriticalAdminSafeguard({
    organisationId,
    targetAdminId: adminId,
    removing: true,
  });

  await runOrganisationAdminTransaction(async (tx) => {
    await disableOrganisationAdmin(
      {
        organisationId,
        adminId,
        disabledReason: 'Removed by organisation admin',
      },
      tx,
    );

    await deleteOrganisationAdminPermissionGrants(
      {
        organisationId,
        organisationAdminId: adminId,
      },
      tx,
    );
  });

  return {
    adminId,
    status: 'DISABLED' as const,
  };
}

async function requireActorAdmin(actorUserId: string, organisationId: string) {
  const actor = await findActorOrganisationAdmin({ userId: actorUserId, organisationId });

  if (!actor) {
    throw new OrganisationAdminServiceError(
      403,
      'ORG_ADMIN_REQUIRED',
      'Active organisation admin access is required',
    );
  }

  if (actor.organisation.status !== 'ACTIVE') {
    throw new OrganisationAdminServiceError(
      403,
      'ORGANISATION_NOT_ACTIVE',
      'Organisation is not active',
    );
  }

  return actor;
}

async function requireTargetAdmin(organisationId: string, adminId: string) {
  const targetAdmin = await findOrganisationAdminById({ organisationId, adminId });

  if (!targetAdmin) {
    throw new OrganisationAdminServiceError(
      404,
      'ORG_ADMIN_NOT_FOUND',
      'Organisation admin was not found',
    );
  }

  return targetAdmin;
}

function assertOrganisationAllowsMutation(status: string) {
  if (status === 'ACTIVE') {
    return;
  }

  throw new OrganisationAdminServiceError(
    403,
    'ORGANISATION_NOT_ACTIVE',
    'Organisation is not active',
  );
}

function permissionKeysForAdmin(admin: Awaited<ReturnType<typeof findActorOrganisationAdmin>>) {
  return (admin?.permissionGrants ?? []).map((grant) => grant.organisationPermission.key);
}

function requirePermission(
  actorPermissionKeys: readonly OrganisationPermissionKeyValue[],
  requiredPermissionKey: OrganisationPermissionKeyValue,
) {
  if (actorPermissionKeys.includes(requiredPermissionKey)) {
    return;
  }

  throw new OrganisationAdminServiceError(
    403,
    'ORG_ADMIN_PERMISSION_REQUIRED',
    'Required organisation admin permission is missing',
  );
}

function normalisePermissionKeys(permissionKeys: readonly string[]) {
  const uniqueKeys = Array.from(new Set(permissionKeys));
  const invalidKey = uniqueKeys.find((key) => !ORGANISATION_PERMISSION_KEY_VALUES.has(key));

  if (invalidKey) {
    throw new OrganisationAdminServiceError(
      422,
      'ORG_ADMIN_PERMISSION_INVALID',
      'One or more organisation admin permission keys are invalid',
    );
  }

  return uniqueKeys as OrganisationPermissionKeyValue[];
}

async function requireOrganisationPermissions(
  organisationId: string,
  permissionKeys: readonly OrganisationPermissionKeyValue[],
) {
  const permissions = await findOrganisationPermissionsByKeys({ organisationId, permissionKeys });

  if (permissions.length !== permissionKeys.length) {
    throw new OrganisationAdminServiceError(
      422,
      'ORG_ADMIN_PERMISSION_INVALID',
      'One or more organisation admin permissions are not available for this organisation',
    );
  }

  return permissions;
}

async function assertCriticalAdminSafeguard(input: {
  organisationId: string;
  targetAdminId: string;
  proposedPermissionKeys?: readonly OrganisationPermissionKeyValue[];
  removing?: boolean;
}) {
  for (const permissionKey of CRITICAL_ADMIN_PERMISSION_KEYS) {
    const otherAdminCount = await countActiveOrganisationAdminsWithPermission({
      organisationId: input.organisationId,
      permissionKey,
      excludingAdminId: input.targetAdminId,
    });
    const targetKeepsPermission =
      !input.removing && input.proposedPermissionKeys?.includes(permissionKey);

    if (otherAdminCount === 0 && !targetKeepsPermission) {
      throw new OrganisationAdminServiceError(
        409,
        'ORG_ADMIN_CRITICAL_PERMISSION_REQUIRED',
        'Organisation must retain an active admin with critical admin-management permissions',
      );
    }
  }
}

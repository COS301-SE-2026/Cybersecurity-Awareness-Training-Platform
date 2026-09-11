import {
  ORGANISATION_INFORMATION_LIMITS,
  organisationContextMetadataSchema,
  organisationInformationUpdateRequestSchema,
  type OrganisationAdminPermissionUpdateRequestDto,
  type OrganisationAdminPromotionRequestDto,
  type OrganisationAdminRemoveRequestDto,
  type OrganisationContextMetadataDto,
  type OrganisationInformationUpdateRequestDto,
  type OwnOrganisationDetailDto,
} from '@insightful-phish/shared';
import { OrganisationPermissionKey } from '../generated/prisma/enums.js';
import type { OrganisationPermissionKey as OrganisationPermissionKeyValue } from '../generated/prisma/enums.js';
import { issueActionToken } from './action-token.service.js';
import { recordAuditLog } from './audit-log.service.js';
import { requestAuthEmailSend } from './auth-email-hook.service.js';
import { revokeSessionsForUser } from './auth-session.service.js';
import { verifyPassword } from './password.service.js';
import {
  findOrganisationInformation,
  createOrganisationContext,
  runInTransaction,
  updateOrganisationContext,
  updateOrganisationContextAiUsable,
  updateOrganisationContextStatus,
  updateOrganisationProfile,
} from '../repositories/organisation.repository.js';
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
  ensureActiveOrganisationTraineeProfileForUser,
  listOrganisationAdminsWithPermissions,
  listOrganisationPermissions,
  replaceOrganisationAdminPermissionGrants,
  runOrganisationAdminTransaction,
  updatePromotionInvitationStatus,
} from '../repositories/organisation-admin.repository.js';
import { requireOrganisationAdminScope } from './organisation-scope.service.js';

const ORGANISATION_ADMIN_PROMOTION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ADMIN_VIEW_PERMISSION = OrganisationPermissionKey.VIEW_ORGANISATION_ADMINS;
const ADMIN_INVITE_PERMISSION = OrganisationPermissionKey.INVITE_ORGANISATION_ADMINS;
const ADMIN_REMOVE_PERMISSION = OrganisationPermissionKey.REMOVE_ORGANISATION_ADMINS;
const ADMIN_CHANGE_PERMISSION = OrganisationPermissionKey.CHANGE_ORGANISATION_ADMIN_PERMISSIONS;

const CRITICAL_ADMIN_PERMISSION_KEYS = [ADMIN_INVITE_PERMISSION, ADMIN_CHANGE_PERMISSION] as const;

const ORGANISATION_PERMISSION_KEY_VALUES = new Set<string>(
  Object.values(OrganisationPermissionKey),
);
type OrganisationInformationRecord = NonNullable<
  Awaited<ReturnType<typeof findOrganisationInformation>>
>;
type OrganisationContextRecord = OrganisationInformationRecord['contexts'][number];
export type OrganisationAdminFieldError = {
  field: string;
  message: string;
};
export class OrganisationAdminServiceError extends Error {
  constructor(
    public readonly statusCode: 403 | 404 | 409 | 422,
    public readonly error: string,
    message: string,
    public readonly fieldErrors: OrganisationAdminFieldError[] = [],
  ) {
    super(message);
    this.name = 'OrganisationAdminServiceError';
  }
}

export async function getOwnOrganisation(
  actorUserId: string,
  organisationId: string,
): Promise<OwnOrganisationDetailDto> {
  const actorScope = await requireOrganisationAdminScope({ userId: actorUserId, organisationId });
  const organisation = await findOrganisationInformation(organisationId);

  if (!organisation) {
    throw new OrganisationAdminServiceError(
      404,
      'ORGANISATION_NOT_FOUND',
      'Organisation was not found',
    );
  }

  const canEdit = actorScope.grantedPermissions.has(
    OrganisationPermissionKey.MANAGE_ORGANISATION_CONTEXT,
  );

  return {
    id: organisation.id,
    name: organisation.name,
    description: organisation.description,
    website: organisation.website,
    primaryDomain: organisation.primaryDomain,
    approximateSize: organisation.approximateSize,
    registeredTraineeCount: organisation._count?.traineeProfiles ?? 0,
    registrationDate: organisation.createdAt.toISOString(),
    status: organisation.status,
    contexts: organisation.contexts.map((context) => {
      const metadata =
        context.metadata !== null &&
        typeof context.metadata === 'object' &&
        Array.isArray(context.metadata) === false
          ? { ...context.metadata }
          : null;

      return {
        id: context.id,
        organisationId: context.organisationId,
        uploadedByUserId: context.uploadedByUserId,
        contextType: context.contextType,
        name: context.name,
        description: context.description,
        contentSummary: context.contentSummary,
        contentRef: context.contentRef,
        metadata,
        processingStatus: context.processingStatus,
        aiUsable: context.aiUsable,
        createdAt: context.createdAt.toISOString(),
        updatedAt: context.updatedAt.toISOString(),
      };
    }),
    capabilities: {
      canEdit,
      readOnlyReason: canEdit === true ? null : 'MISSING_PERMISSION',
    },
  };
}

function parseOrganisationInformationUpdate(
  input: unknown,
): OrganisationInformationUpdateRequestDto {
  const parseResult = organisationInformationUpdateRequestSchema.safeParse(input);
  if (parseResult.success === true) {
    return parseResult.data;
  }
  throw new OrganisationAdminServiceError(
    422,
    'ORG_INFORMATION_VALIDATION_FAILED',
    'Organisation information is invalid',
    parseResult.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  );
}
function organisationInformationNotFoundError(): OrganisationAdminServiceError {
  return new OrganisationAdminServiceError(
    404,
    'ORGANISATION_NOT_FOUND',
    'Organisation was not found',
  );
}
function organisationContextNotFoundError(): OrganisationAdminServiceError {
  return new OrganisationAdminServiceError(
    404,
    'ORG_CONTEXT_NOT_FOUND',
    'Organisation context was not found',
  );
}
function requireOwnedOrganisationContext(
  organisation: OrganisationInformationRecord,
  contextId: string,
): OrganisationContextRecord {
  const context = organisation.contexts.find(
    (organisationContext) => organisationContext.id === contextId,
  );
  if (context === undefined) {
    throw organisationContextNotFoundError();
  }
  return context;
}

function assertEditableOrganisationContext(context: OrganisationContextRecord): void {
  if (context.contextType !== 'LOGO') {
    return;
  }
  throw new OrganisationAdminServiceError(
    409,
    'ORG_CONTEXT_NOT_EDITABLE',
    'Logo context cannot be changed through organisation information editing',
  );
}
function assertOrganisationContextNotArchived(context: OrganisationContextRecord): void {
  if (context.processingStatus !== 'ARCHIVED') {
    return;
  }
  throw new OrganisationAdminServiceError(
    409,
    'ORG_CONTEXT_ARCHIVED',
    'Archived organisation context cannot be changed',
  );
}

function organisationContextKind(
  context: OrganisationContextRecord,
): OrganisationContextMetadataDto['kind'] | null {
  const metadataResult = organisationContextMetadataSchema.safeParse(context.metadata);
  if (metadataResult.success === false) {
    return null;
  }
  return metadataResult.data.kind;
}

function assertOrganisationContextSaveLimits(
  contexts: readonly OrganisationContextRecord[],
  contentKind: OrganisationContextMetadataDto['kind'],
  contextId: string | null,
): void {
  if (contextId === null) {
    const activeContextCount = contexts.filter(
      (context) => context.contextType !== 'LOGO' && context.processingStatus !== 'ARCHIVED',
    ).length;
    if (activeContextCount >= ORGANISATION_INFORMATION_LIMITS.context.maxActiveItems) {
      throw new OrganisationAdminServiceError(
        409,
        'ORG_CONTEXT_LIMIT_REACHED',
        `An organisation may have at most ${ORGANISATION_INFORMATION_LIMITS.context.maxActiveItems} active context items`,
      );
    }
  }

  if (contentKind !== 'EXAMPLE_EMAIL') {
    return;
  }

  const exampleEmailCount = contexts.filter((context) => {
    if (
      context.id === contextId ||
      context.contextType === 'LOGO' ||
      context.processingStatus === 'ARCHIVED'
    ) {
      return false;
    }
    return organisationContextKind(context) === 'EXAMPLE_EMAIL';
  }).length;

  if (exampleEmailCount >= ORGANISATION_INFORMATION_LIMITS.context.maxExampleEmailItems) {
    throw new OrganisationAdminServiceError(
      409,
      'ORG_CONTEXT_EXAMPLE_EMAIL_LIMIT_REACHED',
      `An organisation may have at most ${ORGANISATION_INFORMATION_LIMITS.context.maxExampleEmailItems} active example emails`,
    );
  }
}
function asserOrganisationContextCanBeMarkedReady(context: OrganisationContextRecord): void {
  if (context.processingStatus !== 'NEEDS_REVIEW') {
    throw new OrganisationAdminServiceError(
      409,
      'ORG_CONTEXT_INVALID_TRANSITION',
      'Organisation context must be awaiting review before it can be marked ready',
    );
  }

  if (
    context.contentSummary === null ||
    context.contentSummary.trim().length === 0 ||
    organisationContextKind(context) === null
  ) {
    throw new OrganisationAdminServiceError(
      409,
      'ORG_CONTEXT_NOT_READY',
      'Organisation context must contain text and supported metadata before it can be marked ready',
    );
  }
}
function assertOrganisationContextCanBeUsedByAi(
  context: OrganisationContextRecord,
  aiUsable: boolean,
): void {
  if (aiUsable === false) {
    return;
  }
  if (context.processingStatus === 'READY') {
    return;
  }
  throw new OrganisationAdminServiceError(
    409,
    'ORG_CONTEXT_AI_USE_NOT_READY',
    'Organisation context must be ready before AI use can be enabled',
  );
}
function assertContexMutationSucceeded(contextUpdated: boolean): void {
  if (contextUpdated === true) {
    return;
  }
  throw organisationContextNotFoundError();
}

export async function updateOwnOrganisationInformation(
  actorUserId: string,
  organisationId: string,
  input: unknown,
): Promise<OwnOrganisationDetailDto> {
  await requireOrganisationAdminScope({
    userId: actorUserId,
    organisationId,
    requiredPermission: OrganisationPermissionKey.MANAGE_ORGANISATION_CONTEXT,
  });
  const parsedInput = parseOrganisationInformationUpdate(input);
  await runInTransaction(async (tx) => {
    const organisation = await findOrganisationInformation(organisationId, tx);
    if (organisation === null) {
      throw organisationInformationNotFoundError();
    }
    if (parsedInput.profile !== undefined) {
      await updateOrganisationProfile(
        {
          organisationId,
          ...parsedInput.profile,
        },
        tx,
      );
    }
    const contextAction = parsedInput.contextAction;
    let affectedContextId = contextAction?.contextId ?? null;
    if (contextAction !== undefined) {
      switch (contextAction.action) {
        case 'SAVE': {
          if (contextAction.contextId === null) {
            assertOrganisationContextSaveLimits(
              organisation.contexts,
              contextAction.metadata.kind,
              null,
            );
            const createdContext = await createOrganisationContext(
              {
                organisationId,
                uploadedByUserId: actorUserId,
                contextType: contextAction.contextType,
                name: contextAction.name,
                description: contextAction.description,
                contentSummary: contextAction.contentSummary,
                metadata: contextAction.metadata,
                processingStatus: 'NEEDS_REVIEW',
                aiUsable: false,
              },
              tx,
            );
            affectedContextId = createdContext.id;
            break;
          }
          const existingContext = requireOwnedOrganisationContext(
            organisation,
            contextAction.contextId,
          );
          assertEditableOrganisationContext(existingContext);
          assertOrganisationContextNotArchived(existingContext);
          assertOrganisationContextSaveLimits(
            organisation.contexts,
            contextAction.metadata.kind,
            existingContext.id,
          );
          const contextUpdated = await updateOrganisationContext(
            {
              organisationId,
              contextId: existingContext.id,
              contextType: contextAction.contextType,
              name: contextAction.name,
              description: contextAction.description,
              contentSummary: contextAction.contentSummary,
              metadata: contextAction.metadata,
              processingStatus: 'NEEDS_REVIEW',
              aiUsable: false,
            },
            tx,
          );
          assertContexMutationSucceeded(contextUpdated);
          break;
        }

        case 'MARK_READY': {
          const existingContext = requireOwnedOrganisationContext(
            organisation,
            contextAction.contextId,
          );
          assertEditableOrganisationContext(existingContext);
          assertOrganisationContextNotArchived(existingContext);
          asserOrganisationContextCanBeMarkedReady(existingContext);
          const contextUpdated = await updateOrganisationContextStatus(
            { organisationId, contextId: existingContext.id, processingStatus: 'READY' },
            tx,
          );
          assertContexMutationSucceeded(contextUpdated);
          break;
        }

        case 'SET_AI_USABLE': {
          const existingContext = requireOwnedOrganisationContext(
            organisation,
            contextAction.contextId,
          );
          assertEditableOrganisationContext(existingContext);
          assertOrganisationContextNotArchived(existingContext);
          assertOrganisationContextCanBeUsedByAi(existingContext, contextAction.aiUsable);
          const contextUpdated = await updateOrganisationContextAiUsable(
            { organisationId, contextId: existingContext.id, aiUsable: contextAction.aiUsable },
            tx,
          );
          assertContexMutationSucceeded(contextUpdated);
          break;
        }

        case 'ARCHIVE': {
          const existingContext = requireOwnedOrganisationContext(
            organisation,
            contextAction.contextId,
          );
          assertEditableOrganisationContext(existingContext);

          const statusUpdated = await updateOrganisationContextStatus(
            { organisationId, contextId: existingContext.id, processingStatus: 'ARCHIVED' },
            tx,
          );
          assertContexMutationSucceeded(statusUpdated);
          const aiUseUpdated = await updateOrganisationContextAiUsable(
            { organisationId, contextId: existingContext.id, aiUsable: false },
            tx,
          );
          assertContexMutationSucceeded(aiUseUpdated);
          break;
        }
      }
    }

    await recordAuditLog(
      {
        actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId,
        targetType: 'ORGANISATION',
        targetId: organisationId,
        actionType: 'UPDATED',
        outcome: 'SUCCESS',
        metadata: {
          profileUpdated: parsedInput.profile !== undefined,
          contextAction: contextAction?.action ?? null,
          contextId: affectedContextId,
        },
      },
      tx,
    );
  });

  return getOwnOrganisation(actorUserId, organisationId);
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
    actorPermissions: actorPermissionKeys.sort(comparePermissionKeys),
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
      rawActionToken: actionToken.rawToken,
      actionToken: actionToken.token,
    };
  });

  const emailResult = await requestAuthEmailSend({
    emailType: 'ORGANISATION_ADMIN_PROMOTION_INVITE',
    recipientEmail: targetUser.email,
    userId: targetUser.id,
    organisationId,
    invitationId: promotion.invitation.id,
    actionTokenId: promotion.actionToken.id,
    templateData: {
      firstName: targetUser.firstName,
      organisationName: actor.organisation.name,
      actionToken: promotion.rawActionToken,
      actionTokenExpiresAt: promotion.actionToken.expiresAt,
    },
  });

  const invitationStatus = emailResult.status === 'NOT_QUEUED' ? 'FAILED_TO_SEND' : 'PENDING';
  if (emailResult.status === 'NOT_QUEUED') {
    await updatePromotionInvitationStatus({
      invitationId: promotion.invitation.id,
      status: invitationStatus,
    });
  }

  await recordAuditLog({
    actorUserId,
    actorType: 'ORGANISATION_ADMIN',
    organisationId,
    targetType: 'INVITATION',
    targetId: promotion.invitation.id,
    actionType: 'INVITED',
    outcome: emailResult.status === 'QUEUED' ? 'SUCCESS' : 'FAILURE',
    metadata: {
      targetUserId: targetUser.id,
      permissionKeys,
      emailQueued: emailResult.queued,
      emailOutcomeStatus: emailResult.status,
    },
  });

  return {
    invitationId: promotion.invitation.id,
    actionTokenId: promotion.actionToken.id,
    status: invitationStatus,
    expiresAt: promotion.invitation.expiresAt.toISOString(),
    permissionKeys,
    emailQueued: emailResult.queued,
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

  const affectedPermissionKeys = await criticalAdminSafeguardViolations({
    organisationId,
    targetAdminId: adminId,
    proposedPermissionKeys: permissionKeys,
  });
  if (affectedPermissionKeys.length > 0) {
    await recordAuditLog({
      actorUserId,
      actorType: 'ORGANISATION_ADMIN',
      organisationId,
      targetType: 'ORGANISATION_ADMIN_PERMISSION',
      targetId: adminId,
      actionType: 'PERMISSIONS_CHANGED',
      outcome: 'FAILURE',
      metadata: {
        reason: 'LAST_CRITICAL_ADMIN_PERMISSION_CHANGE',
        targetAdminId: adminId,
        affectedPermissionKeys,
      },
    });
    throwCriticalAdminSafeguardError();
  }

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

  await recordAuditLog({
    actorUserId,
    actorType: 'ORGANISATION_ADMIN',
    organisationId,
    targetType: 'ORGANISATION_ADMIN_PERMISSION',
    targetId: adminId,
    actionType: 'PERMISSIONS_CHANGED',
    outcome: 'SUCCESS',
    oldValues: {
      permissionKeys: targetAdmin.permissionGrants
        .map((grant) => grant.organisationPermission.key)
        .sort(comparePermissionKeys),
    },
    newValues: {
      permissionKeys: [...permissionKeys].sort(comparePermissionKeys),
    },
  });

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
    await recordAuditLog({
      actorUserId,
      actorType: 'ORGANISATION_ADMIN',
      organisationId,
      targetType: 'OTHER',
      actionType: 'DEMOTED',
      outcome: 'FAILURE',
      metadata: {
        reason: 'INCORRECT_PASSWORD',
        targetAdminId: adminId,
      },
    });
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

  const affectedPermissionKeys = await criticalAdminSafeguardViolations({
    organisationId,
    targetAdminId: adminId,
    removing: true,
  });
  if (affectedPermissionKeys.length > 0) {
    await recordAuditLog({
      actorUserId,
      actorType: 'ORGANISATION_ADMIN',
      organisationId,
      targetType: 'USER',
      targetId: targetAdmin.userId,
      actionType: 'DEMOTED',
      outcome: 'FAILURE',
      metadata: {
        reason: 'LAST_CRITICAL_ADMIN_REMOVAL',
        targetAdminId: adminId,
        affectedPermissionKeys,
      },
    });
    throwCriticalAdminSafeguardError();
  }

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

    await ensureActiveOrganisationTraineeProfileForUser(
      {
        organisationId,
        userId: targetAdmin.userId,
      },
      tx,
    );
  });

  await revokeSessionsForUser({
    userId: targetAdmin.userId,
    reason: 'ADMIN_DISABLED',
  });

  await recordAuditLog({
    actorUserId,
    actorType: 'ORGANISATION_ADMIN',
    organisationId,
    targetType: 'USER',
    targetId: targetAdmin.userId,
    actionType: 'DEMOTED',
    outcome: 'SUCCESS',
    metadata: {
      organisationAdminId: adminId,
    },
  });

  return {
    adminId,
    status: 'DISABLED' as const,
  };
}

export async function requireActorAdmin(actorUserId: string, organisationId: string) {
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

export function assertOrganisationAllowsMutation(status: string) {
  if (status === 'ACTIVE') {
    return;
  }

  throw new OrganisationAdminServiceError(
    403,
    'ORGANISATION_NOT_ACTIVE',
    'Organisation is not active',
  );
}

export function permissionKeysForAdmin(
  admin: Awaited<ReturnType<typeof findActorOrganisationAdmin>>,
) {
  return (admin?.permissionGrants ?? []).map((grant) => grant.organisationPermission.key);
}

export function requirePermission(
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

function comparePermissionKeys(
  left: OrganisationPermissionKeyValue,
  right: OrganisationPermissionKeyValue,
) {
  return left.localeCompare(right);
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

async function criticalAdminSafeguardViolations(input: {
  organisationId: string;
  targetAdminId: string;
  proposedPermissionKeys?: readonly OrganisationPermissionKeyValue[];
  removing?: boolean;
}) {
  const affectedPermissionKeys: OrganisationPermissionKeyValue[] = [];

  for (const permissionKey of CRITICAL_ADMIN_PERMISSION_KEYS) {
    const otherAdminCount = await countActiveOrganisationAdminsWithPermission({
      organisationId: input.organisationId,
      permissionKey,
      excludingAdminId: input.targetAdminId,
    });
    const targetKeepsPermission =
      !input.removing && input.proposedPermissionKeys?.includes(permissionKey);

    if (otherAdminCount === 0 && !targetKeepsPermission) {
      affectedPermissionKeys.push(permissionKey);
    }
  }

  return affectedPermissionKeys;
}

function throwCriticalAdminSafeguardError(): never {
  throw new OrganisationAdminServiceError(
    409,
    'ORG_ADMIN_CRITICAL_PERMISSION_REQUIRED',
    'Organisation must retain an active admin with critical admin-management permissions',
  );
}

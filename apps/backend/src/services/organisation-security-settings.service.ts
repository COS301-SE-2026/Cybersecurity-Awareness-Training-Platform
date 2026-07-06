import {
  ORGANISATION_SECURITY_SETTINGS_LIMITS,
  updateOrganisationSecuritySettingsRequestSchema,
  type OrganisationSecuritySettingsCapabilitiesDto,
  type OrganisationSecuritySettingsChangesApplyDto,
  type OrganisationSecuritySettingsDto,
  type OrganisationSecuritySettingsEffectivePolicyDto,
  type OrganisationSecuritySettingsReadOnlyReasonDto,
  type OrganisationSecuritySettingsResponseDto,
  type UpdateOrganisationSecuritySettingsRequestDto,
} from '@insightful-phish/shared';
import type { OrganisationPermissionKey, OrganisationStatus } from '../generated/prisma/enums.js';
import { recordAuditLog } from './audit-log.service.js';
import {
  ORGANISATION_SECURITY_SETTINGS_UPDATE_PERMISSION,
  findOrganisationSecuritySettingsActorAdmin,
  findOrganisationSecuritySettingsByOrganisationId,
  runOrganisationSecuritySettingsTransaction,
  updateOrganisationSecuritySettings,
  type OrganisationSecuritySettingsActorAdmin,
  type OrganisationSecuritySettingsWithRelations,
} from '../repositories/organisation-security-settings.repository.js';
import { resolveEffectiveSecurityPolicyFromOrganisationSettings } from './security-policy.service.js';

export type OrganisationSecuritySettingsFieldError = {
  field: string;
  message: string;
};

export class OrganisationSecuritySettingsServiceError extends Error {
  constructor(
    public readonly statusCode: 403 | 404 | 409 | 422,
    public readonly error: string,
    message: string,
    public readonly fieldErrors: OrganisationSecuritySettingsFieldError[] = [],
  ) {
    super(message);
    this.name = 'OrganisationSecuritySettingsServiceError';
  }
}

const CHANGES_APPLY: OrganisationSecuritySettingsChangesApplyDto = {
  rememberMePolicy: 'NEXT_REFRESH_OR_LOGIN',
  regularSessionLength: 'NEXT_REFRESH_OR_LOGIN',
  idleTimeout: 'NEXT_REFRESH',
  requireReauthenticationForSensitiveActions: 'IMMEDIATE_FOR_NEW_ACTIONS',
  allowTraineeEmailChange: 'IMMEDIATE_FOR_NEW_REQUESTS',
};

export async function getOrganisationSecuritySettings(
  actorUserId: string,
  organisationId: string,
): Promise<OrganisationSecuritySettingsResponseDto> {
  const actor = await requireActorAdmin(actorUserId, organisationId);
  const settings = await requireOrganisationSecuritySettings(organisationId);

  return buildOrganisationSecuritySettingsResponse({
    organisationId,
    settings,
    actor,
  });
}

export async function patchOrganisationSecuritySettings(
  actorUserId: string,
  organisationId: string,
  input: unknown,
): Promise<OrganisationSecuritySettingsResponseDto> {
  const actor = await requireActorAdmin(actorUserId, organisationId);
  requireUpdatePermission(actor);
  assertOrganisationAllowsUpdate(actor.organisation.status);

  const parsedInput = parseUpdateInput(input);
  const updateResult = await runOrganisationSecuritySettingsTransaction(async (tx) => {
    const result = await updateOrganisationSecuritySettings(
      {
        organisationId,
        updatedByOrganisationAdminId: actor.id,
        ...parsedInput,
      },
      tx,
    );

    if (!result) {
      throw notFoundError();
    }

    await recordAuditLog(
      {
        actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId,
        targetType: 'ORGANISATION_SECURITY_SETTINGS',
        targetId: result.newSettings.id,
        actionType: 'SETTINGS_CHANGED',
        outcome: 'SUCCESS',
        oldValues: securitySettingsAuditValues(result.oldSettings),
        newValues: securitySettingsAuditValues(result.newSettings),
      },
      tx,
    );

    return result;
  });

  return buildOrganisationSecuritySettingsResponse({
    organisationId,
    settings: updateResult.newSettings,
    actor,
  });
}

function parseUpdateInput(input: unknown): UpdateOrganisationSecuritySettingsRequestDto {
  const parseResult = updateOrganisationSecuritySettingsRequestSchema.safeParse(input);

  if (parseResult.success) {
    return parseResult.data;
  }

  throw new OrganisationSecuritySettingsServiceError(
    422,
    'ORG_SECURITY_SETTINGS_VALIDATION_FAILED',
    'Organisation security settings are invalid',
    parseResult.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  );
}

async function requireActorAdmin(actorUserId: string, organisationId: string) {
  const actor = await findOrganisationSecuritySettingsActorAdmin({ actorUserId, organisationId });

  if (!actor) {
    throw new OrganisationSecuritySettingsServiceError(
      403,
      'ORG_ADMIN_REQUIRED',
      'Active organisation admin access is required',
    );
  }

  return actor;
}

async function requireOrganisationSecuritySettings(organisationId: string) {
  const settings = await findOrganisationSecuritySettingsByOrganisationId(organisationId);

  if (!settings) {
    throw notFoundError();
  }

  return settings;
}

function notFoundError() {
  return new OrganisationSecuritySettingsServiceError(
    404,
    'ORG_SECURITY_SETTINGS_NOT_FOUND',
    'Organisation security settings were not found',
  );
}

function requireUpdatePermission(actor: OrganisationSecuritySettingsActorAdmin) {
  if (permissionKeysForActor(actor).includes(ORGANISATION_SECURITY_SETTINGS_UPDATE_PERMISSION)) {
    return;
  }

  throw new OrganisationSecuritySettingsServiceError(
    403,
    'ORG_SECURITY_SETTINGS_PERMISSION_REQUIRED',
    'Required organisation security settings permission is missing',
  );
}

function assertOrganisationAllowsUpdate(status: OrganisationStatus) {
  if (status === 'ACTIVE') {
    return;
  }

  throw new OrganisationSecuritySettingsServiceError(
    409,
    'ORG_SECURITY_SETTINGS_READ_ONLY',
    'Organisation security settings cannot be changed while the organisation is not active',
  );
}

function buildOrganisationSecuritySettingsResponse(input: {
  organisationId: string;
  settings: OrganisationSecuritySettingsWithRelations;
  actor: OrganisationSecuritySettingsActorAdmin;
}): OrganisationSecuritySettingsResponseDto {
  return {
    organisationId: input.organisationId,
    settings: toOrganisationSecuritySettingsDto(input.settings),
    effectivePolicy: toEffectivePolicyDto(
      resolveEffectiveSecurityPolicyFromOrganisationSettings({
        settings: input.settings,
      }),
    ),
    platformLimits: ORGANISATION_SECURITY_SETTINGS_LIMITS,
    capabilities: buildCapabilities(input.actor),
  };
}

function buildCapabilities(
  actor: OrganisationSecuritySettingsActorAdmin,
): OrganisationSecuritySettingsCapabilitiesDto {
  const readOnlyReason = readOnlyReasonForActor(actor);

  return {
    canView: true,
    canEdit: readOnlyReason === null,
    readOnlyReason,
    changesApply: CHANGES_APPLY,
  };
}

function readOnlyReasonForActor(
  actor: OrganisationSecuritySettingsActorAdmin,
): OrganisationSecuritySettingsReadOnlyReasonDto {
  if (actor.organisation.status === 'SUSPENDED') {
    return 'ORGANISATION_SUSPENDED';
  }

  if (actor.organisation.status !== 'ACTIVE') {
    return 'ORGANISATION_DISABLED';
  }

  if (!permissionKeysForActor(actor).includes(ORGANISATION_SECURITY_SETTINGS_UPDATE_PERMISSION)) {
    return 'MISSING_PERMISSION';
  }

  return null;
}

function permissionKeysForActor(
  actor: OrganisationSecuritySettingsActorAdmin,
): OrganisationPermissionKey[] {
  return actor.permissionGrants.map((grant) => grant.organisationPermission.key);
}

function toOrganisationSecuritySettingsDto(
  settings: OrganisationSecuritySettingsWithRelations,
): OrganisationSecuritySettingsDto {
  return {
    id: settings.id,
    organisationId: settings.organisationId,
    enforceRememberMePolicy: settings.enforceRememberMePolicy,
    allowRememberMe: settings.allowRememberMe,
    maxRememberedSessionHours: settings.maxRememberedSessionHours,
    enforceRegularSessionLength: settings.enforceRegularSessionLength,
    regularSessionLengthHours: settings.regularSessionLengthHours,
    enforceIdleTimeout: settings.enforceIdleTimeout,
    idleTimeoutMinutes: settings.idleTimeoutMinutes,
    requireReauthenticationForSensitiveActions: settings.requireReauthenticationForSensitiveActions,
    allowTraineeEmailChange: settings.allowTraineeEmailChange,
    updatedByOrganisationAdminId: settings.updatedByOrganisationAdminId,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

function toEffectivePolicyDto(input: {
  organisationId: string | null;
  rememberMeRequested: boolean;
  rememberMeAllowed: boolean;
  rememberMeApplied: boolean;
  regularSessionSeconds: number;
  rememberedSessionSeconds: number;
  effectiveSessionSeconds: number;
  idleTimeoutMinutes: number | null;
  requireReauthenticationForSensitiveActions: boolean;
  allowEmailChange: boolean;
}): OrganisationSecuritySettingsEffectivePolicyDto {
  return {
    organisationId: input.organisationId,
    rememberMeRequested: input.rememberMeRequested,
    rememberMeAllowed: input.rememberMeAllowed,
    rememberMeApplied: input.rememberMeApplied,
    regularSessionSeconds: input.regularSessionSeconds,
    rememberedSessionSeconds: input.rememberedSessionSeconds,
    effectiveSessionSeconds: input.effectiveSessionSeconds,
    idleTimeoutMinutes: input.idleTimeoutMinutes,
    requireReauthenticationForSensitiveActions: input.requireReauthenticationForSensitiveActions,
    allowEmailChange: input.allowEmailChange,
  };
}

function securitySettingsAuditValues(
  settings: OrganisationSecuritySettingsWithRelations,
): Record<string, string | number | boolean | null> {
  return {
    enforceRememberMePolicy: settings.enforceRememberMePolicy,
    allowRememberMe: settings.allowRememberMe,
    maxRememberedSessionHours: settings.maxRememberedSessionHours,
    enforceRegularSessionLength: settings.enforceRegularSessionLength,
    regularSessionLengthHours: settings.regularSessionLengthHours,
    enforceIdleTimeout: settings.enforceIdleTimeout,
    idleTimeoutMinutes: settings.idleTimeoutMinutes,
    requireReauthenticationForSensitiveActions: settings.requireReauthenticationForSensitiveActions,
    allowTraineeEmailChange: settings.allowTraineeEmailChange,
    updatedByOrganisationAdminId: settings.updatedByOrganisationAdminId,
  };
}

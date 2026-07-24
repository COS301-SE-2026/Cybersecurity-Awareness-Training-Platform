import {
  accountProfileUpdateRequestSchema,
  accountSecurityPreferencesRequestSchema,
  type AccountProfileUpdateRequestDto,
  type AccountSecurityPreferencesRequestDto,
} from '@insightful-phish/shared';
import type { Prisma } from '../generated/prisma/client.js';
import type { AuditActorType } from '../generated/prisma/enums.js';
import {
  findAccountSecurityPreferences,
  findAccountUserById,
  runAccountTransaction,
  updateAccountProfile,
  upsertAccountSecurityPreferences,
  type AccountSecurityPreferencesRecord,
  type AccountUserRecord,
} from '../repositories/account.repository.js';
import { findAuthSubjectByUserId } from '../repositories/user.repository.js';
import { recordAuditLog } from './audit-log.service.js';
import {
  organisationIdForSecurityPolicy,
  resolveEffectiveSecurityPolicy,
} from './security-policy.service.js';
import type { GuardAuthSubject } from './auth-status-guard.service.js';

type AccountFieldError = {
  field: string;
  message: string;
};

export class AccountServiceError extends Error {
  constructor(
    public readonly statusCode: 403 | 404 | 422,
    public readonly error: string,
    message: string,
    public readonly fieldErrors: AccountFieldError[] = [],
  ) {
    super(message);
    this.name = 'AccountServiceError';
  }
}

export type AccountPolicyResponse = {
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
  sources: {
    rememberMe: string;
    regularSession: string;
    rememberedSession: string;
    idleTimeout: string;
  };
};

export type AccountCapabilitiesResponse = {
  canEditProfile: boolean;
  canRequestEmailChange: boolean;
  canChangePassword: boolean;
  canEditSecurityPreferences: boolean;
  securityPreferenceEditable: {
    preferredRegularSessionLengthHours: boolean;
    preferredRememberMeSessionLengthHours: boolean;
    preferredIdleTimeoutMinutes: boolean;
  };
  blockedReasons: {
    emailChange: string | null;
    securityPreferences: string | null;
    preferredRegularSessionLengthHours: string | null;
    preferredRememberMeSessionLengthHours: string | null;
    preferredIdleTimeoutMinutes: string | null;
  };
};

export type AccountProfileResponse = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  authStatus: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountSecurityPreferencesResponse = {
  id: string | null;
  preferredRegularSessionLengthHours: number | null;
  preferredRememberMeSessionLengthHours: number | null;
  preferredIdleTimeoutMinutes: number | null;
  updatedAt: string | null;
};

export type AccountResponse = {
  profile: AccountProfileResponse;
  securityPreferences: AccountSecurityPreferencesResponse;
  effectivePolicy: AccountPolicyResponse;
  capabilities: AccountCapabilitiesResponse;
};

const SECURITY_PREFERENCE_BLOCKED_REASON = 'ORGANISATION_POLICY_ENFORCED';

function validationError(fieldErrors: AccountFieldError[]) {
  return new AccountServiceError(
    422,
    'ACCOUNT_VALIDATION_FAILED',
    'Account request payload is invalid',
    fieldErrors,
  );
}

function notFoundError() {
  return new AccountServiceError(404, 'ACCOUNT_NOT_FOUND', 'Account was not found');
}

function fieldErrorsFromIssues(
  issues: readonly { path: PropertyKey[]; message: string }[],
): AccountFieldError[] {
  return issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

async function getAccountContext(userId: string) {
  const [user, subject, preferences] = await Promise.all([
    findAccountUserById(userId),
    findAuthSubjectByUserId(userId),
    findAccountSecurityPreferences(userId),
  ]);

  if (!user) {
    throw notFoundError();
  }

  const effectivePolicy = await resolveEffectiveSecurityPolicy({
    subject,
    rememberMeRequested: false,
  });

  return {
    user,
    subject,
    preferences,
    effectivePolicy,
  };
}

function actorTypeForUser(userType: string): AuditActorType {
  if (userType === 'IP_ADMIN') {
    return 'IP_ADMIN';
  }
  if (userType === 'ORGANISATION_ADMIN') {
    return 'ORGANISATION_ADMIN';
  }
  if (userType === 'ORGANISATION_TRAINEE') {
    return 'ORGANISATION_TRAINEE';
  }
  return 'GENERAL_TRAINEE';
}

function toProfileResponse(user: AccountUserRecord): AccountProfileResponse {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    userType: user.userType,
    authStatus: user.authStatus,
    emailVerified: user.emailVerifiedAt !== null,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function toPreferencesResponse(
  preferences: AccountSecurityPreferencesRecord | null,
): AccountSecurityPreferencesResponse {
  return {
    id: preferences?.id ?? null,
    preferredRegularSessionLengthHours: preferences?.preferredRegularSessionLengthHours ?? null,
    preferredRememberMeSessionLengthHours:
      preferences?.preferredRememberMeSessionLengthHours ?? null,
    preferredIdleTimeoutMinutes: preferences?.preferredIdleTimeoutMinutes ?? null,
    updatedAt: preferences?.updatedAt.toISOString() ?? null,
  };
}

function buildCapabilities(input: {
  effectivePolicy: AccountPolicyResponse;
}): AccountCapabilitiesResponse {
  const regularSessionEditable =
    input.effectivePolicy.sources.regularSession !== 'ORGANISATION_POLICY';
  const rememberMeEditable =
    input.effectivePolicy.sources.rememberMe !== 'ORGANISATION_POLICY' &&
    input.effectivePolicy.sources.rememberedSession !== 'ORGANISATION_POLICY';
  const idleTimeoutEditable = input.effectivePolicy.sources.idleTimeout !== 'ORGANISATION_POLICY';
  const canEditSecurityPreferences =
    regularSessionEditable || rememberMeEditable || idleTimeoutEditable;

  return {
    canEditProfile: true,
    canRequestEmailChange: input.effectivePolicy.allowEmailChange,
    canChangePassword: true,
    canEditSecurityPreferences,
    securityPreferenceEditable: {
      preferredRegularSessionLengthHours: regularSessionEditable,
      preferredRememberMeSessionLengthHours: rememberMeEditable,
      preferredIdleTimeoutMinutes: idleTimeoutEditable,
    },
    blockedReasons: {
      emailChange: input.effectivePolicy.allowEmailChange ? null : 'ORGANISATION_POLICY_BLOCKED',
      securityPreferences: canEditSecurityPreferences ? null : SECURITY_PREFERENCE_BLOCKED_REASON,
      preferredRegularSessionLengthHours: regularSessionEditable
        ? null
        : SECURITY_PREFERENCE_BLOCKED_REASON,
      preferredRememberMeSessionLengthHours: rememberMeEditable
        ? null
        : SECURITY_PREFERENCE_BLOCKED_REASON,
      preferredIdleTimeoutMinutes: idleTimeoutEditable ? null : SECURITY_PREFERENCE_BLOCKED_REASON,
    },
  };
}

function toPolicyResponse(
  input: Awaited<ReturnType<typeof resolveEffectiveSecurityPolicy>>,
): AccountPolicyResponse {
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
    sources: input.sources,
  };
}

function buildAccountResponse(input: {
  user: AccountUserRecord;
  subject: GuardAuthSubject;
  preferences: AccountSecurityPreferencesRecord | null;
  effectivePolicy: Awaited<ReturnType<typeof resolveEffectiveSecurityPolicy>>;
}): AccountResponse {
  const policy = toPolicyResponse(input.effectivePolicy);

  return {
    profile: toProfileResponse(input.user),
    securityPreferences: toPreferencesResponse(input.preferences),
    effectivePolicy: policy,
    capabilities: buildCapabilities({
      effectivePolicy: policy,
    }),
  };
}

function parseProfileUpdate(input: unknown): AccountProfileUpdateRequestDto {
  const result = accountProfileUpdateRequestSchema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  throw validationError(fieldErrorsFromIssues(result.error.issues));
}

function parseSecurityPreferences(input: unknown): AccountSecurityPreferencesRequestDto {
  const result = accountSecurityPreferencesRequestSchema.safeParse(input);
  if (result.success && Object.keys(result.data).length > 0) {
    return result.data;
  }

  throw validationError(
    result.success
      ? [
          {
            field: '',
            message: 'At least one security preference must be provided.',
          },
        ]
      : fieldErrorsFromIssues(result.error.issues),
  );
}

function assertSecurityPreferenceChangesAllowed(
  input: AccountSecurityPreferencesRequestDto,
  capabilities: AccountCapabilitiesResponse,
) {
  const blockedFields = [
    !capabilities.securityPreferenceEditable.preferredRegularSessionLengthHours &&
    Object.hasOwn(input, 'preferredRegularSessionLengthHours')
      ? 'preferredRegularSessionLengthHours'
      : null,
    !capabilities.securityPreferenceEditable.preferredRememberMeSessionLengthHours &&
    Object.hasOwn(input, 'preferredRememberMeSessionLengthHours')
      ? 'preferredRememberMeSessionLengthHours'
      : null,
    !capabilities.securityPreferenceEditable.preferredIdleTimeoutMinutes &&
    Object.hasOwn(input, 'preferredIdleTimeoutMinutes')
      ? 'preferredIdleTimeoutMinutes'
      : null,
  ].filter((field): field is string => field !== null);

  if (blockedFields.length === 0) {
    return;
  }

  throw new AccountServiceError(
    403,
    'ACCOUNT_SECURITY_PREFERENCES_POLICY_BLOCKED',
    'Organisation security policy blocks one or more requested preference changes',
    blockedFields.map((field) => ({
      field,
      message: 'This preference is managed by organisation security policy.',
    })),
  );
}

function preferenceAuditValues(input: AccountSecurityPreferencesRequestDto): Prisma.InputJsonValue {
  return {
    updatedFields: Object.keys(input),
  };
}

export async function getAccount(userId: string): Promise<AccountResponse> {
  return buildAccountResponse(await getAccountContext(userId));
}

export async function patchAccountProfile(
  userId: string,
  input: unknown,
): Promise<AccountResponse> {
  const parsedInput = parseProfileUpdate(input);

  const { user, subject } = await getAccountContext(userId);
  const organisationId = organisationIdForSecurityPolicy(subject);

  const updatedUser = await runAccountTransaction(async (tx) => {
    const result = await updateAccountProfile(
      {
        userId,
        firstName: parsedInput.firstName,
        lastName: parsedInput.lastName,
      },
      tx,
    );

    await recordAuditLog(
      {
        actorUserId: userId,
        actorType: actorTypeForUser(user.userType),
        organisationId,
        targetType: 'USER',
        targetId: userId,
        actionType: 'UPDATED',
        newValues: {
          updatedFields: ['firstName', 'lastName'],
        },
      },
      tx,
    );

    return result;
  });

  return buildAccountResponse({
    ...(await getAccountContext(userId)),
    user: updatedUser,
  });
}

export async function patchAccountSecurityPreferences(
  userId: string,
  input: unknown,
): Promise<AccountResponse> {
  const parsedInput = parseSecurityPreferences(input);
  const context = await getAccountContext(userId);
  const accountResponse = buildAccountResponse(context);
  assertSecurityPreferenceChangesAllowed(parsedInput, accountResponse.capabilities);

  const updatedPreferences = await runAccountTransaction(async (tx) => {
    const result = await upsertAccountSecurityPreferences(
      {
        userId,
        ...parsedInput,
      },
      tx,
    );

    await recordAuditLog(
      {
        actorUserId: userId,
        actorType: actorTypeForUser(context.user.userType),
        organisationId: organisationIdForSecurityPolicy(context.subject),
        targetType: 'USER',
        targetId: userId,
        actionType: 'SETTINGS_CHANGED',
        newValues: preferenceAuditValues(parsedInput),
      },
      tx,
    );

    return result;
  });

  return buildAccountResponse({
    ...(await getAccountContext(userId)),
    preferences: updatedPreferences,
  });
}

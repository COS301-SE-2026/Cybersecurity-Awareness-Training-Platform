import {
  accountChangeEmailRequestSchema,
  accountChangePasswordRequestSchema,
  accountProfileUpdateRequestSchema,
  accountSecurityPreferencesRequestSchema,
  type AccountChangeEmailRequestDto,
  type AccountChangePasswordRequestDto,
  type AccountProfileUpdateRequestDto,
  type AccountSecurityPreferencesRequestDto,
} from '@insightful-phish/shared';
import type { Prisma } from '../generated/prisma/client.js';
import type { AuditActorType } from '../generated/prisma/enums.js';
import {
  cancelPendingEmailChangeRequests,
  createEmailChangeRequest,
  findAccountSessionForUser,
  findAccountSecurityPreferences,
  findAccountUserByEmail,
  findAccountUserById,
  findAccountUserWithPasswordById,
  listAccountSessions,
  revokeAccountSessionForUser,
  revokeAccountSessionsForPasswordChange,
  revokeOtherAccountSessions,
  revokePendingEmailChangeTokens,
  revokeRefreshTokensForAccountSession,
  revokeRefreshTokensForAccountUser,
  revokeRefreshTokensForOtherAccountSessions,
  runAccountTransaction,
  updateAccountPasswordHash,
  updateAccountProfile,
  upsertAccountSecurityPreferences,
  type AccountSessionRecord,
  type AccountSecurityPreferencesRecord,
  type AccountUserRecord,
} from '../repositories/account.repository.js';
import { findAuthSubjectByUserId } from '../repositories/user.repository.js';
import { issueActionToken } from './action-token.service.js';
import { recordAuditLog } from './audit-log.service.js';
import { requestAuthEmailSend } from './auth-email-hook.service.js';
import {
  organisationIdForSecurityPolicy,
  resolveEffectiveSecurityPolicy,
} from './security-policy.service.js';
import type { GuardAuthSubject } from './auth-status-guard.service.js';
import { recordNotificationFailureEvent } from './notification-failure-event.service.js';
import { hashPassword, verifyPassword } from './password.service.js';

type AccountFieldError = {
  field: string;
  message: string;
};

export class AccountServiceError extends Error {
  constructor(
    public readonly statusCode: 403 | 404 | 409 | 422,
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

export type AccountChangeEmailResponse = {
  message: string;
  emailQueued: boolean;
};

export type AccountChangePasswordResponse = {
  message: string;
  notificationQueued: boolean;
  revokedSessionCount: number;
};

export type AccountSessionResponse = {
  id: string;
  rememberMe: boolean;
  current: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  idleTimeoutMinutes: number | null;
  deviceSummary: string | null;
  locationSummary: string | null;
};

export type AccountSessionsResponse = {
  sessions: AccountSessionResponse[];
};

export type AccountSessionRevocationResponse = {
  revoked: true;
};

export type AccountLogoutOthersResponse = {
  revokedSessionCount: number;
};

const SECURITY_PREFERENCE_BLOCKED_REASON = 'ORGANISATION_POLICY_ENFORCED';
const EMAIL_CHANGE_TOKEN_TTL_HOURS = 24;
const EMAIL_CHANGE_GENERIC_MESSAGE =
  'If this email change can be completed, a confirmation email has been queued for delivery to the new address.';

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

function conflictError(error: string, message: string) {
  return new AccountServiceError(409, error, message);
}

function forbiddenError(error: string, message: string, fieldErrors: AccountFieldError[] = []) {
  return new AccountServiceError(403, error, message, fieldErrors);
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

function parseEmailChange(input: unknown): AccountChangeEmailRequestDto {
  const result = accountChangeEmailRequestSchema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  throw validationError(fieldErrorsFromIssues(result.error.issues));
}

function parsePasswordChange(input: unknown): AccountChangePasswordRequestDto {
  const result = accountChangePasswordRequestSchema.safeParse(input);
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

function getEmailChangeExpiresAt() {
  return new Date(Date.now() + EMAIL_CHANGE_TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

function emailPersistenceAuditMetadata(
  emailResult: Awaited<ReturnType<typeof requestAuthEmailSend>>,
): Prisma.InputJsonObject {
  return emailResult.status === 'NOT_QUEUED' ? { emailQueueFailure: true } : {};
}

function assertEmailChangeConfirmationQueued(
  emailResult: Awaited<ReturnType<typeof requestAuthEmailSend>>,
) {
  if (emailResult.status === 'NOT_QUEUED') {
    throw conflictError(
      'ACCOUNT_EMAIL_CHANGE_QUEUE_FAILED',
      'Email change confirmation could not be queued for delivery.',
    );
  }
}

async function sendEmailChangeWarning(input: {
  userId: string;
  oldEmail: string;
  newEmail: string;
  firstName: string;
  requestId: string;
}) {
  try {
    await requestAuthEmailSend({
      emailType: 'EMAIL_CHANGE_WARNING',
      recipientEmail: input.oldEmail,
      userId: input.userId,
      relatedEntityType: 'EMAIL_CHANGE_REQUEST',
      relatedEntityId: input.requestId,
      templateData: {
        firstName: input.firstName,
        oldEmail: input.oldEmail,
        newEmail: input.newEmail,
      },
    });
  } catch {
    await recordNotificationFailureEvent('EMAIL_HOOK_UNEXPECTED_FAILURE');
  }
}

function isSessionIdleExpired(session: AccountSessionRecord, now: Date) {
  return (
    session.idleTimeoutMinutes !== null &&
    session.lastActiveAt.getTime() + session.idleTimeoutMinutes * 60 * 1000 <= now.getTime()
  );
}

function toSessionResponse(
  session: AccountSessionRecord,
  currentSessionId: string,
): AccountSessionResponse {
  return {
    id: session.id,
    rememberMe: session.rememberMe,
    current: session.id === currentSessionId,
    createdAt: session.createdAt.toISOString(),
    lastActiveAt: session.lastActiveAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    idleTimeoutMinutes: session.idleTimeoutMinutes,
    deviceSummary: session.deviceSummary,
    locationSummary: session.locationSummary,
  };
}

async function sendPasswordChangedNotification(input: {
  userId: string;
  email: string;
  firstName: string;
}): Promise<boolean> {
  try {
    const result = await requestAuthEmailSend({
      emailType: 'PASSWORD_CHANGED',
      recipientEmail: input.email,
      userId: input.userId,
      templateData: {
        firstName: input.firstName,
      },
    });

    return result.queued;
  } catch {
    await recordNotificationFailureEvent('PASSWORD_CHANGED_NOTIFICATION_FAILED');
    return false;
  }
}

export async function getAccount(userId: string): Promise<AccountResponse> {
  return buildAccountResponse(await getAccountContext(userId));
}

export async function requestAccountEmailChange(
  userId: string,
  input: unknown,
): Promise<AccountChangeEmailResponse> {
  const parsedInput = parseEmailChange(input);
  const [context, userWithPassword] = await Promise.all([
    getAccountContext(userId),
    findAccountUserWithPasswordById(userId),
  ]);

  if (!userWithPassword) {
    throw notFoundError();
  }

  const accountResponse = buildAccountResponse(context);
  if (!accountResponse.capabilities.canRequestEmailChange) {
    throw forbiddenError(
      'ACCOUNT_EMAIL_CHANGE_POLICY_BLOCKED',
      'Organisation security policy blocks email changes for this account.',
      [
        {
          field: 'newEmail',
          message: 'Email changes are managed by organisation security policy.',
        },
      ],
    );
  }

  const passwordMatches = await verifyPassword(parsedInput.password, userWithPassword.passwordHash);
  if (!passwordMatches) {
    throw forbiddenError(
      'ACCOUNT_CURRENT_PASSWORD_INVALID',
      'Current password confirmation failed.',
      [
        {
          field: 'password',
          message: 'Current password is incorrect.',
        },
      ],
    );
  }

  const requestedEmail = parsedInput.newEmail.trim().toLowerCase();
  if (requestedEmail === userWithPassword.email.trim().toLowerCase()) {
    throw validationError([
      {
        field: 'newEmail',
        message: 'New email must be different from the current email.',
      },
    ]);
  }

  const existingUser = await findAccountUserByEmail(requestedEmail);
  if (existingUser) {
    throw conflictError('ACCOUNT_EMAIL_EXISTS', 'The requested email address is already in use.');
  }

  const expiresAt = getEmailChangeExpiresAt();
  const organisationId = organisationIdForSecurityPolicy(context.subject);
  const emailChange = await runAccountTransaction(async (tx) => {
    const now = new Date();
    await cancelPendingEmailChangeRequests({ userId, now }, tx);
    await revokePendingEmailChangeTokens(
      {
        userId,
        now,
        reason: 'EMAIL_CHANGE_REPLACED',
      },
      tx,
    );

    const request = await createEmailChangeRequest(
      {
        userId,
        currentEmail: userWithPassword.email,
        requestedEmail,
        expiresAt,
      },
      tx,
    );
    const actionToken = await issueActionToken(
      {
        purpose: 'EMAIL_CHANGE_VERIFICATION',
        userId,
        emailChangeRequestId: request.id,
        targetEmail: requestedEmail,
        expiresAt,
      },
      tx,
    );

    await recordAuditLog(
      {
        actorUserId: userId,
        actorType: actorTypeForUser(context.user.userType),
        organisationId,
        targetType: 'USER',
        targetId: userId,
        actionType: 'SETTINGS_CHANGED',
        newValues: {
          updatedFields: ['emailChangeRequest'],
        },
        metadata: {
          changeType: 'EMAIL_CHANGE_REQUESTED',
        },
      },
      tx,
    );

    const emailResult = await requestAuthEmailSend(
      {
        emailType: 'EMAIL_CHANGE_CONFIRMATION',
        recipientEmail: requestedEmail,
        userId,
        actionTokenId: actionToken.token.id,
        relatedEntityType: 'EMAIL_CHANGE_REQUEST',
        relatedEntityId: request.id,
        templateData: {
          firstName: userWithPassword.firstName,
          oldEmail: userWithPassword.email,
          newEmail: requestedEmail,
          actionToken: actionToken.rawToken,
          actionTokenExpiresAt: actionToken.token.expiresAt,
        },
      },
      tx,
    );
    assertEmailChangeConfirmationQueued(emailResult);

    return {
      request,
      actionToken,
      emailResult,
    };
  });

  await recordAuditLog({
    actorUserId: userId,
    actorType: actorTypeForUser(context.user.userType),
    organisationId,
    targetType: 'USER',
    targetId: userId,
    actionType: 'SETTINGS_CHANGED',
    outcome: 'SUCCESS',
    metadata: {
      changeType: 'EMAIL_CHANGE_CONFIRMATION_DELIVERY',
      emailQueued: emailChange.emailResult.queued,
      emailOutcomeStatus: emailChange.emailResult.status,
      ...emailPersistenceAuditMetadata(emailChange.emailResult),
    },
  });

  await sendEmailChangeWarning({
    userId,
    oldEmail: userWithPassword.email,
    newEmail: requestedEmail,
    firstName: userWithPassword.firstName,
    requestId: emailChange.request.id,
  });

  return {
    message: EMAIL_CHANGE_GENERIC_MESSAGE,
    emailQueued: emailChange.emailResult.queued,
  };
}

export async function changeAccountPassword(
  userId: string,
  input: unknown,
): Promise<AccountChangePasswordResponse> {
  const parsedInput = parsePasswordChange(input);
  const [context, userWithPassword] = await Promise.all([
    getAccountContext(userId),
    findAccountUserWithPasswordById(userId),
  ]);

  if (!userWithPassword) {
    throw notFoundError();
  }

  const passwordMatches = await verifyPassword(
    parsedInput.currentPassword,
    userWithPassword.passwordHash,
  );
  if (!passwordMatches) {
    throw forbiddenError(
      'ACCOUNT_CURRENT_PASSWORD_INVALID',
      'Current password confirmation failed.',
      [
        {
          field: 'currentPassword',
          message: 'Current password is incorrect.',
        },
      ],
    );
  }

  const passwordHash = await hashPassword(parsedInput.newPassword);
  const organisationId = organisationIdForSecurityPolicy(context.subject);
  const { revokedSessionCount } = await runAccountTransaction(async (tx) => {
    await updateAccountPasswordHash({ userId, passwordHash }, tx);
    const now = new Date();
    const revokedSessions = await revokeAccountSessionsForPasswordChange({ userId, now }, tx);
    await revokeRefreshTokensForAccountUser({ userId, now, reason: 'PASSWORD_CHANGE' }, tx);

    await recordAuditLog(
      {
        actorUserId: userId,
        actorType: actorTypeForUser(context.user.userType),
        organisationId,
        targetType: 'USER',
        targetId: userId,
        actionType: 'SETTINGS_CHANGED',
        newValues: {
          updatedFields: ['password'],
        },
        metadata: {
          changeType: 'PASSWORD_CHANGE',
          revokedSessionCount: revokedSessions.count,
        },
      },
      tx,
    );

    return {
      revokedSessionCount: revokedSessions.count,
    };
  });

  const notificationQueued = await sendPasswordChangedNotification({
    userId,
    email: userWithPassword.email,
    firstName: userWithPassword.firstName,
  });

  return {
    message: 'Password changed successfully.',
    notificationQueued,
    revokedSessionCount,
  };
}

export async function listAccountSessionSummaries(
  userId: string,
  currentSessionId: string,
): Promise<AccountSessionsResponse> {
  const now = new Date();
  const sessions = (await listAccountSessions(userId, now))
    .filter((session) => !isSessionIdleExpired(session, now))
    .map((session) => toSessionResponse(session, currentSessionId));

  return {
    sessions,
  };
}

export async function revokeAccountSession(
  userId: string,
  sessionId: string,
): Promise<AccountSessionRevocationResponse> {
  const session = await findAccountSessionForUser({ userId, sessionId });
  if (!session) {
    throw notFoundError();
  }
  if (session.revokedAt) {
    throw conflictError('ACCOUNT_SESSION_ALREADY_REVOKED', 'Session has already been revoked.');
  }

  const context = await getAccountContext(userId);
  const now = new Date();
  await runAccountTransaction(async (tx) => {
    const revokedSession = await revokeAccountSessionForUser({ userId, sessionId, now }, tx);
    if (revokedSession.count !== 1) {
      throw conflictError('ACCOUNT_SESSION_ALREADY_REVOKED', 'Session has already been revoked.');
    }

    await revokeRefreshTokensForAccountSession({ sessionId, now, reason: 'LOGOUT' }, tx);
    await recordAuditLog(
      {
        actorUserId: userId,
        actorType: actorTypeForUser(context.user.userType),
        organisationId: organisationIdForSecurityPolicy(context.subject),
        targetType: 'AUTH_SESSION',
        targetId: sessionId,
        actionType: 'REVOKED',
        metadata: {
          reason: 'LOGOUT',
        },
      },
      tx,
    );

    return true;
  });

  return {
    revoked: true,
  };
}

export async function logoutOtherAccountSessions(
  userId: string,
  currentSessionId: string,
): Promise<AccountLogoutOthersResponse> {
  const context = await getAccountContext(userId);
  const { revokedSessionCount } = await runAccountTransaction(async (tx) => {
    const now = new Date();
    const revokedSessions = await revokeOtherAccountSessions({ userId, currentSessionId, now }, tx);
    await revokeRefreshTokensForOtherAccountSessions({ userId, currentSessionId, now }, tx);

    await recordAuditLog(
      {
        actorUserId: userId,
        actorType: actorTypeForUser(context.user.userType),
        organisationId: organisationIdForSecurityPolicy(context.subject),
        targetType: 'USER',
        targetId: userId,
        actionType: 'REVOKED',
        metadata: {
          reason: 'LOGOUT_ALL',
          currentSessionPreserved: true,
          revokedSessionCount: revokedSessions.count,
        },
      },
      tx,
    );

    return {
      revokedSessionCount: revokedSessions.count,
    };
  });

  return {
    revokedSessionCount,
  };
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

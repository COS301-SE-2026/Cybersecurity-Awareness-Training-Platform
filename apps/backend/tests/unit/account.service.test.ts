import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AccountServiceError,
  changeAccountPassword,
  listAccountSessionSummaries,
  logoutOtherAccountSessions,
  requestAccountEmailChange,
  revokeAccountSession,
} from '../../src/services/account.service.js';

const txClient = { tx: true };

const accountRepositoryMock = vi.hoisted(() => ({
  cancelEmailChangeRequest: vi.fn(),
  cancelPendingEmailChangeRequests: vi.fn(),
  createEmailChangeRequest: vi.fn(),
  findAccountSecurityPreferences: vi.fn(),
  findAccountSessionForUser: vi.fn(),
  findAccountUserByEmail: vi.fn(),
  findAccountUserById: vi.fn(),
  findAccountUserWithPasswordById: vi.fn(),
  listAccountSessions: vi.fn(),
  revokeAccountSessionForUser: vi.fn(),
  revokeAccountSessionsForPasswordChange: vi.fn(),
  revokeOtherAccountSessions: vi.fn(),
  revokePendingEmailChangeTokens: vi.fn(),
  revokeRefreshTokensForAccountSession: vi.fn(),
  revokeRefreshTokensForAccountUser: vi.fn(),
  revokeRefreshTokensForOtherAccountSessions: vi.fn(),
  runAccountTransaction: vi.fn(),
  updateAccountPasswordHash: vi.fn(),
  updateAccountProfile: vi.fn(),
  upsertAccountSecurityPreferences: vi.fn(),
}));

const userRepositoryMock = vi.hoisted(() => ({
  findAuthSubjectByUserId: vi.fn(),
}));

const actionTokenServiceMock = vi.hoisted(() => ({
  issueActionToken: vi.fn(),
  revokeActionTokenById: vi.fn(),
}));

const auditLogServiceMock = vi.hoisted(() => ({
  recordAuditLog: vi.fn(),
}));

const authEmailHookServiceMock = vi.hoisted(() => ({
  requestAuthEmailSend: vi.fn(),
  shouldRevokeTokenForAuthEmailResult: vi.fn(
    (result: { status: string }) => result.status === 'NOT_QUEUED',
  ),
}));

const securityPolicyServiceMock = vi.hoisted(() => ({
  organisationIdForSecurityPolicy: vi.fn(),
  resolveEffectiveSecurityPolicy: vi.fn(),
}));

const notificationFailureServiceMock = vi.hoisted(() => ({
  recordNotificationFailureEvent: vi.fn(),
}));

const passwordServiceMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('../../src/repositories/account.repository.js', () => accountRepositoryMock);
vi.mock('../../src/repositories/user.repository.js', () => userRepositoryMock);
vi.mock('../../src/services/action-token.service.js', () => actionTokenServiceMock);
vi.mock('../../src/services/audit-log.service.js', () => auditLogServiceMock);
vi.mock('../../src/services/auth-email-hook.service.js', () => authEmailHookServiceMock);
vi.mock('../../src/services/security-policy.service.js', () => securityPolicyServiceMock);
vi.mock(
  '../../src/services/notification-failure-event.service.js',
  () => notificationFailureServiceMock,
);
vi.mock('../../src/services/password.service.js', () => passwordServiceMock);

const accountUser = {
  id: 'user-1',
  firstName: 'Amina',
  lastName: 'Dlamini',
  email: 'amina@example.test',
  userType: 'ORGANISATION_TRAINEE',
  authStatus: 'ACTIVE',
  emailVerifiedAt: new Date('2026-07-01T08:00:00.000Z'),
  createdAt: new Date('2026-06-01T08:00:00.000Z'),
  updatedAt: new Date('2026-07-01T08:00:00.000Z'),
};

const accountUserWithPassword = {
  ...accountUser,
  passwordHash: 'stored-password-hash',
};

const authSubject = {
  user: {
    id: 'user-1',
    userType: 'ORGANISATION_TRAINEE',
    authStatus: 'ACTIVE',
    emailVerifiedAt: accountUser.emailVerifiedAt,
    disabledAt: null,
  },
  traineeProfile: {
    traineeStatus: 'ACTIVE',
  },
  organisationTraineeProfile: {
    membershipStatus: 'ACTIVE',
    organisation: {
      id: 'org-1',
      status: 'ACTIVE',
      name: 'Example Org',
    },
  },
  organisationAdminProfile: null,
  ipAdminProfile: null,
};

const effectivePolicy = {
  organisationId: 'org-1',
  rememberMeRequested: false,
  rememberMeAllowed: true,
  rememberMeApplied: false,
  regularSessionSeconds: 900,
  rememberedSessionSeconds: 604800,
  effectiveSessionSeconds: 900,
  idleTimeoutMinutes: 30,
  requireReauthenticationForSensitiveActions: true,
  allowEmailChange: true,
  sources: {
    rememberMe: 'PLATFORM_DEFAULT',
    regularSession: 'PLATFORM_DEFAULT',
    rememberedSession: 'PLATFORM_DEFAULT',
    idleTimeout: 'PLATFORM_DEFAULT',
  },
};

const acceptedEmailOutcome = {
  status: 'QUEUED' as const,
  queueAccepted: true as const,
  queued: true as const,
  deliveryLogId: 'email-log-1',
  jobId: 'email-job-1',
};

function serializedAuditCalls() {
  return JSON.stringify(auditLogServiceMock.recordAuditLog.mock.calls);
}

function expectNoSensitiveAccountAuditMetadata() {
  const auditText = serializedAuditCalls();

  expect(auditText).not.toContain('amina@example.test');
  expect(auditText).not.toContain('new-address@example.test');
  expect(auditText).not.toContain('raw-email-change-token');
  expect(auditText).not.toContain('stored-password-hash');
  expect(auditText).not.toContain('UpdatedPassword1!');
}

describe('account service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountRepositoryMock.runAccountTransaction.mockImplementation((callback) =>
      callback(txClient),
    );
    accountRepositoryMock.findAccountUserById.mockResolvedValue(accountUser);
    accountRepositoryMock.findAccountUserWithPasswordById.mockResolvedValue(
      accountUserWithPassword,
    );
    accountRepositoryMock.findAccountSecurityPreferences.mockResolvedValue(null);
    accountRepositoryMock.findAccountUserByEmail.mockResolvedValue(null);
    userRepositoryMock.findAuthSubjectByUserId.mockResolvedValue(authSubject);
    securityPolicyServiceMock.resolveEffectiveSecurityPolicy.mockResolvedValue(effectivePolicy);
    securityPolicyServiceMock.organisationIdForSecurityPolicy.mockReturnValue('org-1');
    passwordServiceMock.verifyPassword.mockResolvedValue(true);
    passwordServiceMock.hashPassword.mockResolvedValue('next-password-hash');
    authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue(acceptedEmailOutcome);
    accountRepositoryMock.cancelPendingEmailChangeRequests.mockResolvedValue({ count: 1 });
    accountRepositoryMock.revokePendingEmailChangeTokens.mockResolvedValue({ count: 1 });
    accountRepositoryMock.createEmailChangeRequest.mockResolvedValue({
      id: 'email-change-request-1',
      userId: 'user-1',
      currentEmail: 'amina@example.test',
      RequestedEmail: 'new-address@example.test',
      status: 'PENDING',
      expiresAt: new Date('2026-07-25T08:00:00.000Z'),
    });
    actionTokenServiceMock.issueActionToken.mockResolvedValue({
      rawToken: 'raw-email-change-token',
      token: {
        id: 'action-token-1',
        expiresAt: new Date('2026-07-25T08:00:00.000Z'),
      },
    });
  });

  it('requests an email change without returning tokens or storing sensitive audit metadata', async () => {
    const result = await requestAccountEmailChange('user-1', {
      newEmail: ' New-Address@Example.test ',
      confirmNewEmail: 'new-address@example.test',
      password: 'CorrectPassword1!',
    });

    expect(result).toEqual({
      message:
        'If this email change can be completed, a confirmation email has been sent to the new address.',
      emailQueued: true,
    });
    expect(JSON.stringify(result)).not.toContain('raw-email-change-token');
    expect(passwordServiceMock.verifyPassword).toHaveBeenCalledWith(
      'CorrectPassword1!',
      'stored-password-hash',
    );
    expect(accountRepositoryMock.createEmailChangeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        currentEmail: 'amina@example.test',
        requestedEmail: 'new-address@example.test',
      }),
      txClient,
    );
    expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'EMAIL_CHANGE_VERIFICATION',
        userId: 'user-1',
        emailChangeRequestId: 'email-change-request-1',
        targetEmail: 'new-address@example.test',
      }),
      txClient,
    );
    expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        emailType: 'EMAIL_CHANGE_CONFIRMATION',
        recipientEmail: 'new-address@example.test',
        actionTokenId: 'action-token-1',
      }),
    );
    expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        emailType: 'EMAIL_CHANGE_WARNING',
        recipientEmail: 'amina@example.test',
      }),
    );
    expectNoSensitiveAccountAuditMetadata();
  });

  it('does not create email-change tokens when policy blocks the request', async () => {
    securityPolicyServiceMock.resolveEffectiveSecurityPolicy.mockResolvedValue({
      ...effectivePolicy,
      allowEmailChange: false,
    });

    await expect(
      requestAccountEmailChange('user-1', {
        newEmail: 'new-address@example.test',
        confirmNewEmail: 'new-address@example.test',
        password: 'CorrectPassword1!',
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      error: 'ACCOUNT_EMAIL_CHANGE_POLICY_BLOCKED',
    });

    expect(actionTokenServiceMock.issueActionToken).not.toHaveBeenCalled();
    expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
  });

  it('does not create email-change tokens when current password is incorrect', async () => {
    passwordServiceMock.verifyPassword.mockResolvedValue(false);

    await expect(
      requestAccountEmailChange('user-1', {
        newEmail: 'new-address@example.test',
        confirmNewEmail: 'new-address@example.test',
        password: 'WrongPassword1!',
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      error: 'ACCOUNT_CURRENT_PASSWORD_INVALID',
    });

    expect(actionTokenServiceMock.issueActionToken).not.toHaveBeenCalled();
    expect(accountRepositoryMock.createEmailChangeRequest).not.toHaveBeenCalled();
  });

  it('revokes a failed email-change token only when confirmation email is not accepted', async () => {
    authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue({
      status: 'NOT_QUEUED',
      queueAccepted: false,
      queued: false,
      reason: 'EMAIL_QUEUE_FAILED',
    });

    const result = await requestAccountEmailChange('user-1', {
      newEmail: 'new-address@example.test',
      confirmNewEmail: 'new-address@example.test',
      password: 'CorrectPassword1!',
    });

    expect(result.emailQueued).toBe(false);
    expect(actionTokenServiceMock.revokeActionTokenById).toHaveBeenCalledWith({
      tokenId: 'action-token-1',
      reason: 'EMAIL_SEND_FAILED',
    });
    expect(accountRepositoryMock.cancelEmailChangeRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'email-change-request-1' }),
    );
    expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalledWith(
      expect.objectContaining({ emailType: 'EMAIL_CHANGE_WARNING' }),
    );
  });

  it('changes password, revokes sessions, sends notification, and keeps audit metadata compact', async () => {
    accountRepositoryMock.revokeAccountSessionsForPasswordChange.mockResolvedValue({ count: 2 });

    const result = await changeAccountPassword('user-1', {
      currentPassword: 'CorrectPassword1!',
      newPassword: 'UpdatedPassword1!',
      confirmNewPassword: 'UpdatedPassword1!',
    });

    expect(result).toEqual({
      message: 'Password changed successfully.',
      notificationQueued: true,
      revokedSessionCount: 2,
    });
    expect(passwordServiceMock.hashPassword).toHaveBeenCalledWith('UpdatedPassword1!');
    expect(accountRepositoryMock.updateAccountPasswordHash).toHaveBeenCalledWith(
      { userId: 'user-1', passwordHash: 'next-password-hash' },
      txClient,
    );
    expect(accountRepositoryMock.revokeRefreshTokensForAccountUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', reason: 'PASSWORD_CHANGE' }),
      txClient,
    );
    expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        emailType: 'PASSWORD_CHANGED',
        recipientEmail: 'amina@example.test',
      }),
    );
    expectNoSensitiveAccountAuditMetadata();
  });

  it('lists only non-idle active session summaries and marks the current session', async () => {
    const now = Date.now();
    const activeSession = {
      id: 'session-current',
      rememberMe: false,
      createdAt: new Date(now - 10 * 60 * 1000),
      lastActiveAt: new Date(now - 5 * 60 * 1000),
      expiresAt: new Date(now + 60 * 60 * 1000),
      idleTimeoutMinutes: 30,
      revokedAt: null,
      revokedReason: null,
      deviceSummary: 'Chrome on Windows',
      locationSummary: 'Johannesburg, ZA',
    };
    const idleExpiredSession = {
      ...activeSession,
      id: 'session-idle-expired',
      lastActiveAt: new Date(now - 60 * 60 * 1000),
    };
    accountRepositoryMock.listAccountSessions.mockResolvedValue([
      activeSession,
      idleExpiredSession,
    ]);

    const result = await listAccountSessionSummaries('user-1', 'session-current');

    expect(result.sessions).toEqual([
      expect.objectContaining({
        id: 'session-current',
        current: true,
        deviceSummary: 'Chrome on Windows',
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain('tokenHash');
    expect(JSON.stringify(result)).not.toContain('refreshToken');
    expect(JSON.stringify(result)).not.toContain('ipAddress');
    expect(JSON.stringify(result)).not.toContain('userAgent');
  });

  it('revokes only an owned active session and its refresh tokens', async () => {
    accountRepositoryMock.findAccountSessionForUser.mockResolvedValue({
      id: 'session-1',
      rememberMe: false,
      createdAt: new Date('2026-07-24T07:00:00.000Z'),
      lastActiveAt: new Date('2026-07-24T08:00:00.000Z'),
      expiresAt: new Date('2026-07-24T09:00:00.000Z'),
      idleTimeoutMinutes: 30,
      revokedAt: null,
      revokedReason: null,
      deviceSummary: null,
      locationSummary: null,
    });
    accountRepositoryMock.revokeAccountSessionForUser.mockResolvedValue({ count: 1 });

    await expect(revokeAccountSession('user-1', 'session-1')).resolves.toEqual({ revoked: true });

    expect(accountRepositoryMock.revokeAccountSessionForUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', sessionId: 'session-1' }),
      txClient,
    );
    expect(accountRepositoryMock.revokeRefreshTokensForAccountSession).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-1', reason: 'LOGOUT' }),
      txClient,
    );
  });

  it('returns not found for cross-user or missing session revocation', async () => {
    accountRepositoryMock.findAccountSessionForUser.mockResolvedValue(null);

    await expect(revokeAccountSession('user-1', 'other-session')).rejects.toBeInstanceOf(
      AccountServiceError,
    );
    await expect(revokeAccountSession('user-1', 'other-session')).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(accountRepositoryMock.revokeAccountSessionForUser).not.toHaveBeenCalled();
  });

  it('logs out other sessions while preserving the current session', async () => {
    accountRepositoryMock.revokeOtherAccountSessions.mockResolvedValue({ count: 3 });

    const result = await logoutOtherAccountSessions('user-1', 'current-session');

    expect(result).toEqual({ revokedSessionCount: 3 });
    expect(accountRepositoryMock.revokeOtherAccountSessions).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        currentSessionId: 'current-session',
      }),
      txClient,
    );
    expect(accountRepositoryMock.revokeRefreshTokensForOtherAccountSessions).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        currentSessionId: 'current-session',
      }),
      txClient,
    );
    expect(serializedAuditCalls()).toContain('currentSessionPreserved');
    expect(serializedAuditCalls()).not.toContain('tokenHash');
  });
});

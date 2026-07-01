import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthUnauthorizedError,
  getCurrentUser,
  loginUser,
  registerUser,
  verifyEmail,
  verifyEmailChange,
  resendVerificationEmail,
  clearResendCooldowns,
  AuthResendCooldownError,
  EmailChangeConflictError,
} from '../../src/services/auth.service.js';

const userRepositoryMock = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createGeneralTraineeUser: vi.fn(),
  findAuthSubjectByUserId: vi.fn(),
  findUserWithAuthSubjectById: vi.fn(),
  toGuardAuthSubject: vi.fn().mockImplementation((user) => {
    if (!user) return { user: null };
    return {
      user: {
        id: user.id,
        userType: user.userType,
        authStatus: user.authStatus,
        emailVerifiedAt: user.emailVerifiedAt,
        disabledAt: user.disabledAt,
      },
      traineeProfile: user.traineeProfile ?? null,
      organisationTraineeProfile: user.organisationTraineeProfile ?? null,
      organisationAdminProfile: user.organisationAdminProfile ?? null,
      ipAdminProfile: user.ipAdminProfile ?? null,
    };
  }),
}));

const passwordServiceMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

const actionTokenServiceMock = vi.hoisted(() => ({
  issueActionToken: vi.fn(),
  validateActionToken: vi.fn(),
}));

const authEmailHookServiceMock = vi.hoisted(() => ({
  requestAuthEmailSend: vi.fn(),
}));

const authTokenServiceMock = vi.hoisted(() => ({
  generateAuthToken: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: {
    update: vi.fn(),
  },
  actionToken: {
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    findFirst: vi.fn(),
  },
  emailChangeRequest: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  authSession: {
    create: vi.fn().mockImplementation(async (args) => ({
      id: 'session-123',
      userId: args.data.userId,
      rememberMe: args.data.rememberMe,
      expiresAt: args.data.expiresAt,
      idleTimeoutMinutes: args.data.idleTimeoutMinutes,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      revokedAt: null,
      revokedReason: null,
    })),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  refreshToken: {
    create: vi.fn().mockImplementation(async (args) => ({
      id: 'token-123',
      authSessionId: args.data.authSessionId,
      expiresAt: args.data.expiresAt,
      createdAt: new Date(),
      usedAt: null,
      revokedAt: null,
      revokedReason: null,
    })),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  auditLogEntry: {
    create: vi.fn().mockResolvedValue({ id: 'audit-123' }),
  },
}));

vi.mock('../../src/repositories/user.repository.js', () => userRepositoryMock);

vi.mock('../../src/services/action-token.service.js', () => actionTokenServiceMock);

vi.mock('../../src/services/auth-email-hook.service.js', () => authEmailHookServiceMock);

vi.mock('../../src/services/password.service.js', () => passwordServiceMock);

vi.mock('../../src/services/auth-token.service.js', () => authTokenServiceMock);

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

describe('registerUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionTokenServiceMock.issueActionToken.mockReset();
    authEmailHookServiceMock.requestAuthEmailSend.mockReset();
    prismaMock.actionToken.findFirst.mockReset();
    prismaMock.actionToken.updateMany.mockReset();
    prismaMock.actionToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockImplementation((action) => action(prismaMock));
  });

  it('hashes the password, creates a trainee user, and returns a safe public user', async () => {
    userRepositoryMock.findUserByEmail.mockResolvedValue(null);
    passwordServiceMock.hashPassword.mockResolvedValue('hashed-password');
    userRepositoryMock.createGeneralTraineeUser.mockResolvedValue({
      id: 'user-1',
      firstName: 'Johan',
      lastName: 'Nel',
      email: 'johan@example.com',
      passwordHash: 'hashed-password',
      userType: 'GENERAL_TRAINEE',
      authStatus: 'PENDING_EMAIL_VERIFICATION',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
    });
    const verificationExpiresAt = new Date('2026-05-15T06:00:00.000Z');
    actionTokenServiceMock.issueActionToken.mockResolvedValue({
      rawToken: 'raw-action-token',
      token: { id: 'action-token-1', expiresAt: verificationExpiresAt },
    });
    authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue({ queued: false });

    const response = await registerUser({
      email: 'johan@example.com',
      firstName: 'Johan',
      lastName: 'Nel',
      password: 'mySecurePassword123!',
      confirmPassword: 'mySecurePassword123!',
    });

    expect(userRepositoryMock.findUserByEmail).toHaveBeenCalledWith('johan@example.com');
    expect(passwordServiceMock.hashPassword).toHaveBeenCalledWith('mySecurePassword123!');
    expect(userRepositoryMock.createGeneralTraineeUser).toHaveBeenCalledWith(
      {
        email: 'johan@example.com',
        firstName: 'Johan',
        lastName: 'Nel',
        passwordHash: 'hashed-password',
      },
      prismaMock,
    );
    expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalledWith(
      {
        purpose: 'EMAIL_VERIFICATION',
        userId: 'user-1',
        targetEmail: 'johan@example.com',
        expiresAt: expect.any(Date),
      },
      prismaMock,
    );
    expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalledWith({
      emailType: 'EMAIL_VERIFICATION',
      recipientEmail: 'johan@example.com',
      userId: 'user-1',
      actionTokenId: 'action-token-1',
      templateData: {
        firstName: 'Johan',
        actionToken: 'raw-action-token',
        actionTokenExpiresAt: verificationExpiresAt,
      },
    });
    expect(response).toEqual({
      message:
        "If this email can be registered, we'll send you an email verification link. Please check your inbox.",
    });
  });

  it('returns a generic success when the email is already registered', async () => {
    userRepositoryMock.findUserByEmail.mockResolvedValue({
      id: 'existing-user',
      email: 'johan@example.com',
    });

    await expect(
      registerUser({
        email: 'johan@example.com',
        firstName: 'Johan',
        lastName: 'Nel',
        password: 'mySecurePassword123!',
        confirmPassword: 'mySecurePassword123!',
      }),
    ).resolves.toEqual({
      message:
        "If this email can be registered, we'll send you an email verification link. Please check your inbox.",
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(userRepositoryMock.createGeneralTraineeUser).not.toHaveBeenCalled();
    expect(actionTokenServiceMock.issueActionToken).not.toHaveBeenCalled();
    expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
  });

  it('does not send verification email when token creation fails inside registration transaction', async () => {
    userRepositoryMock.findUserByEmail.mockResolvedValue(null);
    passwordServiceMock.hashPassword.mockResolvedValue('hashed-password');
    userRepositoryMock.createGeneralTraineeUser.mockResolvedValue({
      id: 'user-1',
      firstName: 'Johan',
      lastName: 'Nel',
      email: 'johan@example.com',
      passwordHash: 'hashed-password',
      userType: 'GENERAL_TRAINEE',
      authStatus: 'PENDING_EMAIL_VERIFICATION',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
    });
    actionTokenServiceMock.issueActionToken.mockRejectedValue(new Error('token creation failed'));

    await expect(
      registerUser({
        email: 'johan@example.com',
        firstName: 'Johan',
        lastName: 'Nel',
        password: 'mySecurePassword123!',
        confirmPassword: 'mySecurePassword123!',
      }),
    ).rejects.toThrow('token creation failed');

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(userRepositoryMock.createGeneralTraineeUser).toHaveBeenCalledWith(
      expect.any(Object),
      prismaMock,
    );
    expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalledWith(
      expect.any(Object),
      prismaMock,
    );
    expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
  });

  it('does not resend verification for a pending unverified account with a valid sent verification token', async () => {
    const expiresAt = new Date(Date.now() + 60 + 60 * 1000);
    userRepositoryMock.findUserByEmail.mockResolvedValue({
      id: 'pendinguser',
      email: 'pending@example.com',
      firstName: 'Pending',
      authStatus: 'PENDING_EMAIL_VERIFICATION',
    });
    passwordServiceMock.hashPassword.mockResolvedValue('hashedpassword');
    prismaMock.actionToken.findFirst.mockResolvedValue({
      id: 'existingtoken',
      userId: 'pendinguser',
      targetEmail: 'pending@example.com',
      purpose: 'EMAIL_VERIFICATION',
      expiresAt,
      usedAt: null,
      revokedAt: null,
      emailDeliveryLogs: [{ emailType: 'EMAIL_VERIFICATION', deliveryStatus: 'SENT' }],
    });
    const response = await registerUser({
      email: 'pending@example.com',
      firstName: 'Pending',
      lastName: 'User',
      password: 'mySecurePassword123!',
      confirmPassword: 'mySecurePassword123!',
    });
    expect(response).toEqual({
      message:
        "If this email can be registered, we'll send you an email verification link. Please check your inbox.",
    });
    expect(prismaMock.actionToken.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'pendinguser',
        targetEmail: 'pending@example.com',
        purpose: 'EMAIL_VERIFICATION',
        usedAt: null,
        revokedAt: null,
      },
      include: { emailDeliveryLogs: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(prismaMock.actionToken.updateMany).not.toHaveBeenCalled();
    expect(actionTokenServiceMock.issueActionToken).not.toHaveBeenCalled();
    expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
  });

  it('revokes existing cerification tokens and sends a new verification email for an expired pending token', async () => {
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    userRepositoryMock.findUserByEmail.mockResolvedValue({
      id: 'pendinguser',
      email: 'pending@example.com',
      firstName: 'Pending',
      authStatus: 'PENDING_EMAIL_VERIFICATION',
    });
    passwordServiceMock.hashPassword.mockResolvedValue('hashedpassword');
    prismaMock.actionToken.findFirst.mockResolvedValue({
      id: 'expiredtoken',
      userId: 'pendinguser',
      targetEmail: 'pending@example.com',
      expiresAt: new Date(Date.now() - 60 * 1000),
      usedAt: null,
      revokedAt: null,
      emailDeliveryLogs: [{ emailType: 'EMAIL_VERIFICATION', deliveryStatus: 'SENT' }],
    });
    authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue({ queued: true });
    actionTokenServiceMock.issueActionToken.mockResolvedValue({
      rawToken: 'newrawtoken',
      token: { id: 'newtoken', expiresAt: newExpiresAt },
    });
    const response = await registerUser({
      email: 'pending@example.com',
      firstName: 'Pending',
      lastName: 'User',
      password: 'mySecurePassword123!',
      confirmPassword: 'mySecurePassword123!',
    });
    expect(response).toEqual({
      message:
        "If this email can be registered, we'll send you an email verification link. Please check your inbox.",
    });
    expect(prismaMock.actionToken.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'pendinguser',
        targetEmail: 'pending@example.com',
        purpose: 'EMAIL_VERIFICATION',
        usedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date), revokedReason: 'REGISTRATION_VERIFICATION_REISSUED' },
    });
    expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalledWith(
      {
        purpose: 'EMAIL_VERIFICATION',
        userId: 'pendinguser',
        targetEmail: 'pending@example.com',
        expiresAt: expect.any(Date),
      },
      prismaMock,
    );
    expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalledWith({
      emailType: 'EMAIL_VERIFICATION',
      recipientEmail: 'pending@example.com',
      userId: 'pendinguser',
      actionTokenId: 'newtoken',
      templateData: {
        firstName: 'Pending',
        actionToken: 'newrawtoken',
        actionTokenExpiresAt: newExpiresAt,
      },
    });
  });

  it('sends a new verification email for a pending unverified account with no existing verificationtoken', async () => {
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    userRepositoryMock.findUserByEmail.mockResolvedValue({
      id: 'pending-user',
      email: 'pending@example.com',
      firstName: 'Pending',
      authStatus: 'PENDING_EMAIL_VERIFICATION',
    });
    passwordServiceMock.hashPassword.mockResolvedValue('hashed-password');
    prismaMock.actionToken.findFirst.mockResolvedValue(null);
    actionTokenServiceMock.issueActionToken.mockResolvedValue({
      rawToken: 'new-raw-token',
      token: { id: 'new-token', expiresAt: newExpiresAt },
    });
    authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue({ queued: true });

    const response = await registerUser({
      email: 'pending@example.com',
      firstName: 'Pending',
      lastName: 'User',
      password: 'mySecurePassword123!',
      confirmPassword: 'mySecurePassword123!',
    });

    expect(response).toEqual({
      message:
        "If this email can be registered, we'll send you an email verification link. Please check your inbox.",
    });
    expect(prismaMock.actionToken.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'pending-user',
        targetEmail: 'pending@example.com',
        purpose: 'EMAIL_VERIFICATION',
        usedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
        revokedReason: 'REGISTRATION_VERIFICATION_REISSUED',
      },
    });
    expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalled();
    expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalled();
  });
}); //describe

describe('loginUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies the password and returns a token with a safe public user', async () => {
    userRepositoryMock.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      firstName: 'Johan',
      lastName: 'Nel',
      email: 'johan@example.com',
      passwordHash: 'hashed-password',
      userType: 'GENERAL_TRAINEE',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
    });
    userRepositoryMock.findAuthSubjectByUserId.mockResolvedValue({
      user: {
        id: 'user-1',
        userType: 'GENERAL_TRAINEE',
        authStatus: 'ACTIVE',
      },
      traineeProfile: { traineeStatus: 'ACTIVE' },
    });
    userRepositoryMock.findUserWithAuthSubjectById.mockResolvedValue({
      id: 'user-1',
      firstName: 'Johan',
      lastName: 'Nel',
      email: 'johan@example.com',
      passwordHash: 'hashed-password',
      userType: 'GENERAL_TRAINEE',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
      traineeProfile: { traineeStatus: 'ACTIVE' },
    });
    passwordServiceMock.verifyPassword.mockResolvedValue(true);
    authTokenServiceMock.generateAuthToken.mockReturnValue({
      token: 'demo-token',
      expiresAt: '2026-05-12T14:00:00.000Z',
    });

    const response = await loginUser({
      email: 'johan@example.com',
      password: 'mySecurePassword123!',
    });

    expect(userRepositoryMock.findUserByEmail).toHaveBeenCalledWith('johan@example.com');
    expect(passwordServiceMock.verifyPassword).toHaveBeenCalledWith(
      'mySecurePassword123!',
      'hashed-password',
    );
    expect(authTokenServiceMock.generateAuthToken).toHaveBeenCalledWith(
      'user-1',
      expect.any(String),
    );
    expect(response).toEqual({
      response: {
        accessToken: 'demo-token',
        user: {
          id: 'user-1',
          firstName: 'Johan',
          lastName: 'Nel',
          email: 'johan@example.com',
          userType: 'GENERAL_TRAINEE',
          authStatus: 'ACTIVE',
          createdAt: '2026-05-12T06:00:00.000Z',
        },
        context: expect.objectContaining({
          role: 'GENERAL_TRAINEE',
          permissions: ['GENERAL_TRAINEE'],
        }),
        permissions: ['GENERAL_TRAINEE'],
        redirectTo: '/trainee/campaigns',
      },
      accessTokenExpiresAt: '2026-05-12T14:00:00.000Z',
      rawRefreshToken: expect.any(String),
      sessionExpiresAt: expect.any(Date),
    });
    expect(response.response.user).not.toHaveProperty('passwordHash');
  });

  it('throws an auth unauthorized error when the email is not registered', async () => {
    userRepositoryMock.findUserByEmail.mockResolvedValue(null);

    await expect(
      loginUser({
        email: 'johan@example.com',
        password: 'mySecurePassword123!',
      }),
    ).rejects.toBeInstanceOf(AuthUnauthorizedError);

    expect(passwordServiceMock.verifyPassword).not.toHaveBeenCalled();
    expect(authTokenServiceMock.generateAuthToken).not.toHaveBeenCalled();
  });

  it('throws an auth unauthorized error when the password is incorrect', async () => {
    userRepositoryMock.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'johan@example.com',
      passwordHash: 'hashed-password',
      authStatus: 'ACTIVE',
    });
    passwordServiceMock.verifyPassword.mockResolvedValue(false);

    await expect(
      loginUser({
        email: 'johan@example.com',
        password: 'wrongPassword',
      }),
    ).rejects.toBeInstanceOf(AuthUnauthorizedError);

    expect(authTokenServiceMock.generateAuthToken).not.toHaveBeenCalled();
  });
});

describe('getCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current authenticated user without exposing the password hash', async () => {
    userRepositoryMock.findUserWithAuthSubjectById.mockResolvedValue({
      id: 'user-1',
      firstName: 'Johan',
      lastName: 'Nel',
      email: 'johan@example.com',
      passwordHash: 'hashed-password',
      userType: 'GENERAL_TRAINEE',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
      traineeProfile: { traineeStatus: 'ACTIVE' },
    });

    const response = await getCurrentUser('user-1');

    expect(userRepositoryMock.findUserWithAuthSubjectById).toHaveBeenCalledWith('user-1');
    expect(response).toEqual({
      user: {
        id: 'user-1',
        firstName: 'Johan',
        lastName: 'Nel',
        email: 'johan@example.com',
        userType: 'GENERAL_TRAINEE',
        authStatus: 'ACTIVE',
        createdAt: '2026-05-12T06:00:00.000Z',
      },
      context: expect.objectContaining({
        role: 'GENERAL_TRAINEE',
        permissions: ['GENERAL_TRAINEE'],
      }),
      permissions: ['GENERAL_TRAINEE'],
      redirectTo: '/trainee/campaigns',
    });
    expect(response.user).not.toHaveProperty('passwordHash');
  });

  it('throws an auth unauthorized error when the user cannot be found', async () => {
    userRepositoryMock.findUserWithAuthSubjectById.mockResolvedValue(null);

    await expect(getCurrentUser('missing-user')).rejects.toBeInstanceOf(AuthUnauthorizedError);
  });
});

describe('verifyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((action) => action(prismaMock));
  });

  it('verifies a pending user when token is valid', async () => {
    actionTokenServiceMock.validateActionToken.mockResolvedValue({
      state: 'VALID',
      token: { id: 'token-123', userId: 'user-1' },
    });
    userRepositoryMock.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      authStatus: 'PENDING_EMAIL_VERIFICATION',
    });
    prismaMock.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      authStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
    });

    const result = await verifyEmail('some-valid-token');

    expect(result.state).toBe('VALID');
    expect(result.user).toBeDefined();
    expect(result.user?.authStatus).toBe('ACTIVE');
    expect(prismaMock.actionToken.updateMany).toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalled();
  });

  it('returns status response for invalid token', async () => {
    actionTokenServiceMock.validateActionToken.mockResolvedValue({
      state: 'EXPIRED',
    });

    const result = await verifyEmail('expired-token');

    expect(result.state).toBe('EXPIRED');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('returns state REVOKED if user is disabled', async () => {
    actionTokenServiceMock.validateActionToken.mockResolvedValue({
      state: 'VALID',
      token: { id: 'token-123', userId: 'user-1' },
    });
    userRepositoryMock.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      authStatus: 'DISABLED',
    });

    const result = await verifyEmail('valid-token-but-disabled-user');

    expect(result.state).toBe('REVOKED');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

describe('resendVerificationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearResendCooldowns();
    prismaMock.$transaction.mockImplementation((action) => action(prismaMock));
  });

  it('respects a 60-second cooldown per email', async () => {
    userRepositoryMock.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      authStatus: 'PENDING_EMAIL_VERIFICATION',
    });
    actionTokenServiceMock.issueActionToken.mockResolvedValue({
      rawToken: 'raw',
      token: { id: 't' },
    });
    authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue({ queued: true });

    // First request should succeed
    await expect(resendVerificationEmail('user@example.com')).resolves.toBeUndefined();

    // Second request immediately should throw 429
    await expect(resendVerificationEmail('user@example.com')).rejects.toBeInstanceOf(
      AuthResendCooldownError,
    );
  });

  it('is enumeration-safe: sets cooldown even if email does not exist', async () => {
    userRepositoryMock.findUserByEmail.mockResolvedValue(null);

    // First request should succeed (but do nothing under the hood)
    await expect(resendVerificationEmail('nonexistent@example.com')).resolves.toBeUndefined();

    // Second request immediately should throw 429
    await expect(resendVerificationEmail('nonexistent@example.com')).rejects.toBeInstanceOf(
      AuthResendCooldownError,
    );
  });
});

describe('verifyEmailChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((action) => action(prismaMock));
  });

  it('completes email change successfully on pending request', async () => {
    actionTokenServiceMock.validateActionToken.mockResolvedValue({
      state: 'VALID',
      token: {
        id: 'token-change-123',
        userId: 'user-1',
        targetEmail: 'new@example.com',
        emailChangeRequestId: 'request-123',
      },
    });
    userRepositoryMock.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'old@example.com',
      authStatus: 'ACTIVE',
      userType: 'GENERAL_TRAINEE',
    });
    userRepositoryMock.findUserByEmail.mockResolvedValue(null);

    prismaMock.emailChangeRequest.findUnique.mockResolvedValue({
      id: 'request-123',
      userId: 'user-1',
      RequestedEmail: 'new@example.com',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 100000),
    });

    const result = await verifyEmailChange('some-change-token');

    expect(result.state).toBe('VALID');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { email: 'new@example.com' },
    });
    expect(prismaMock.emailChangeRequest.update).toHaveBeenCalledWith({
      where: { id: 'request-123' },
      data: {
        status: 'CONFIRMED',
        confirmedAt: expect.any(Date),
      },
    });
    expect(prismaMock.authSession.updateMany).toHaveBeenCalled();
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
  });

  it('returns EXPIRED when the email change request has expired', async () => {
    actionTokenServiceMock.validateActionToken.mockResolvedValue({
      state: 'VALID',
      token: {
        id: 'token-change-123',
        userId: 'user-1',
        targetEmail: 'new@example.com',
        emailChangeRequestId: 'request-123',
      },
    });
    userRepositoryMock.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'old@example.com',
      authStatus: 'ACTIVE',
      userType: 'GENERAL_TRAINEE',
    });

    // Request is expired in the past
    prismaMock.emailChangeRequest.findUnique.mockResolvedValue({
      id: 'request-123',
      userId: 'user-1',
      RequestedEmail: 'new@example.com',
      status: 'PENDING',
      expiresAt: new Date(Date.now() - 10000),
    });

    const result = await verifyEmailChange('some-change-token');

    expect(result.state).toBe('EXPIRED');
    expect(prismaMock.emailChangeRequest.update).toHaveBeenCalledWith({
      where: { id: 'request-123' },
      data: { status: 'EXPIRED' },
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('returns USED or REVOKED if the request status is already CONFIRMED or CANCELED', async () => {
    actionTokenServiceMock.validateActionToken.mockResolvedValue({
      state: 'VALID',
      token: {
        id: 'token-change-123',
        userId: 'user-1',
        targetEmail: 'new@example.com',
        emailChangeRequestId: 'request-123',
      },
    });
    userRepositoryMock.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'old@example.com',
      authStatus: 'ACTIVE',
      userType: 'GENERAL_TRAINEE',
    });

    // 1. Confirmed case
    prismaMock.emailChangeRequest.findUnique.mockResolvedValue({
      id: 'request-123',
      userId: 'user-1',
      RequestedEmail: 'new@example.com',
      status: 'CONFIRMED',
      expiresAt: new Date(Date.now() + 100000),
    });

    const resUsed = await verifyEmailChange('some-change-token');
    expect(resUsed.state).toBe('USED');

    // 2. Canceled case
    prismaMock.emailChangeRequest.findUnique.mockResolvedValue({
      id: 'request-123',
      userId: 'user-1',
      RequestedEmail: 'new@example.com',
      status: 'CANCELED',
      expiresAt: new Date(Date.now() + 100000),
    });

    const resRevoked = await verifyEmailChange('some-change-token');
    expect(resRevoked.state).toBe('REVOKED');
  });

  it('returns INVALID if user or target email does not match the token parameters', async () => {
    actionTokenServiceMock.validateActionToken.mockResolvedValue({
      state: 'VALID',
      token: {
        id: 'token-change-123',
        userId: 'user-1',
        targetEmail: 'new@example.com',
        emailChangeRequestId: 'request-123',
      },
    });
    userRepositoryMock.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'old@example.com',
      authStatus: 'ACTIVE',
      userType: 'GENERAL_TRAINEE',
    });

    // User ID mismatch
    prismaMock.emailChangeRequest.findUnique.mockResolvedValue({
      id: 'request-123',
      userId: 'different-user',
      RequestedEmail: 'new@example.com',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 100000),
    });

    const resInvalidUser = await verifyEmailChange('some-change-token');
    expect(resInvalidUser.state).toBe('INVALID');

    // Email mismatch
    prismaMock.emailChangeRequest.findUnique.mockResolvedValue({
      id: 'request-123',
      userId: 'user-1',
      RequestedEmail: 'different@example.com',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 100000),
    });

    const resInvalidEmail = await verifyEmailChange('some-change-token');
    expect(resInvalidEmail.state).toBe('INVALID');
  });

  it('throws 409 conflict if new email is already taken', async () => {
    actionTokenServiceMock.validateActionToken.mockResolvedValue({
      state: 'VALID',
      token: {
        id: 'token-change-123',
        userId: 'user-1',
        targetEmail: 'taken@example.com',
        emailChangeRequestId: 'request-123',
      },
    });
    userRepositoryMock.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'old@example.com',
      authStatus: 'ACTIVE',
      userType: 'GENERAL_TRAINEE',
    });
    userRepositoryMock.findUserByEmail.mockResolvedValue({
      id: 'another-user',
      email: 'taken@example.com',
    });

    await expect(verifyEmailChange('some-change-token')).rejects.toBeInstanceOf(
      EmailChangeConflictError,
    );
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

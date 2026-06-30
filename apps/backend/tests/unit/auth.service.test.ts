import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthConflictError,
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
    prismaMock.$transaction.mockImplementation((action) => action('transaction-client'));
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
    actionTokenServiceMock.issueActionToken.mockResolvedValue({
      rawToken: 'raw-action-token',
      token: { id: 'action-token-1' },
    });
    authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue({ queued: false });

    const response = await registerUser({
      email: 'johan@example.com',
      firstName: 'Johan',
      lastName: 'Nel',
      password: 'mySecurePassword123!',
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
      'transaction-client',
    );
    expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalledWith(
      {
        purpose: 'EMAIL_VERIFICATION',
        userId: 'user-1',
        targetEmail: 'johan@example.com',
        expiresAt: expect.any(Date),
      },
      'transaction-client',
    );
    expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalledWith({
      emailType: 'EMAIL_VERIFICATION',
      recipientEmail: 'johan@example.com',
      userId: 'user-1',
      actionTokenId: 'action-token-1',
      templateData: {
        firstName: 'Johan',
        actionToken: 'raw-action-token',
        actionTokenExpiresAt: expect.any(Date),
      },
    });
    expect(response).toEqual({
      user: {
        id: 'user-1',
        firstName: 'Johan',
        lastName: 'Nel',
        email: 'johan@example.com',
        userType: 'GENERAL_TRAINEE',
        authStatus: 'PENDING_EMAIL_VERIFICATION',
        createdAt: '2026-05-12T06:00:00.000Z',
      },
      verificationEmailQueued: false,
    });
    expect(response.user).not.toHaveProperty('passwordHash');
  });

  it('throws an auth conflict error when the email is already registered', async () => {
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
      }),
    ).rejects.toBeInstanceOf(AuthConflictError);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(passwordServiceMock.hashPassword).not.toHaveBeenCalled();
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
      }),
    ).rejects.toThrow('token creation failed');

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(userRepositoryMock.createGeneralTraineeUser).toHaveBeenCalledWith(
      expect.any(Object),
      'transaction-client',
    );
    expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalledWith(
      expect.any(Object),
      'transaction-client',
    );
    expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
  });
});

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
    await expect(resendVerificationEmail('user@example.com')).rejects.toBeInstanceOf(AuthResendCooldownError);
  });

  it('is enumeration-safe: sets cooldown even if email does not exist', async () => {
    userRepositoryMock.findUserByEmail.mockResolvedValue(null);

    // First request should succeed (but do nothing under the hood)
    await expect(resendVerificationEmail('nonexistent@example.com')).resolves.toBeUndefined();

    // Second request immediately should throw 429
    await expect(resendVerificationEmail('nonexistent@example.com')).rejects.toBeInstanceOf(AuthResendCooldownError);
  });
});

describe('verifyEmailChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((action) => action(prismaMock));
  });

  it('completes email change, updates user, revokes sessions, and sends warnings/confirmations', async () => {
    actionTokenServiceMock.validateActionToken.mockResolvedValue({
      state: 'VALID',
      token: { id: 'token-change-123', userId: 'user-1', targetEmail: 'new@example.com' },
    });
    userRepositoryMock.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'old@example.com',
      authStatus: 'ACTIVE',
      userType: 'GENERAL_TRAINEE',
    });
    userRepositoryMock.findUserByEmail.mockResolvedValue(null); // new email not taken

    const result = await verifyEmailChange('some-change-token');

    expect(result.state).toBe('VALID');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { email: 'new@example.com' },
    });
    expect(prismaMock.authSession.updateMany).toHaveBeenCalled();
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
    expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalledTimes(2);
  });

  it('throws 409 conflict if new email is already taken', async () => {
    actionTokenServiceMock.validateActionToken.mockResolvedValue({
      state: 'VALID',
      token: { id: 'token-change-123', userId: 'user-1', targetEmail: 'taken@example.com' },
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

    await expect(verifyEmailChange('some-change-token')).rejects.toBeInstanceOf(EmailChangeConflictError);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthConflictError,
  AuthUnauthorizedError,
  getCurrentUser,
  loginUser,
  registerUser,
} from '../../src/services/auth.service.js';

const userRepositoryMock = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createGeneralTraineeUser: vi.fn(),
}));

const passwordServiceMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

const actionTokenServiceMock = vi.hoisted(() => ({
  issueActionToken: vi.fn(),
}));

const authEmailHookServiceMock = vi.hoisted(() => ({
  requestAuthEmailSend: vi.fn(),
}));

const authTokenServiceMock = vi.hoisted(() => ({
  generateAuthToken: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
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
        actionToken: 'raw-action-token',
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
    expect(authTokenServiceMock.generateAuthToken).toHaveBeenCalledWith('user-1');
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
      token: 'demo-token',
      tokenType: 'Bearer',
      expiresAt: '2026-05-12T14:00:00.000Z',
    });
    expect(response.user).not.toHaveProperty('passwordHash');
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
    userRepositoryMock.findUserById.mockResolvedValue({
      id: 'user-1',
      firstName: 'Johan',
      lastName: 'Nel',
      email: 'johan@example.com',
      passwordHash: 'hashed-password',
      userType: 'GENERAL_TRAINEE',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
    });

    const response = await getCurrentUser('user-1');

    expect(userRepositoryMock.findUserById).toHaveBeenCalledWith('user-1');
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
    });
    expect(response.user).not.toHaveProperty('passwordHash');
  });

  it('throws an auth unauthorized error when the user cannot be found', async () => {
    userRepositoryMock.findUserById.mockResolvedValue(null);

    await expect(getCurrentUser('missing-user')).rejects.toBeInstanceOf(AuthUnauthorizedError);
  });
});

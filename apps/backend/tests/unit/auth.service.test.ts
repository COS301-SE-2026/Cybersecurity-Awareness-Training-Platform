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
  createGeneralLearnerUser: vi.fn(),
}));

const passwordServiceMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

const authTokenServiceMock = vi.hoisted(() => ({
  generateAuthToken: vi.fn(),
}));

vi.mock('../../src/repositories/user.repository.js', () => userRepositoryMock);

vi.mock('../../src/services/password.service.js', () => passwordServiceMock);

vi.mock('../../src/services/auth-token.service.js', () => authTokenServiceMock);

describe('registerUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hashes the password, creates a learner user, and returns a safe public user', async () => {
    userRepositoryMock.findUserByEmail.mockResolvedValue(null);
    passwordServiceMock.hashPassword.mockResolvedValue('hashed-password');
    userRepositoryMock.createGeneralLearnerUser.mockResolvedValue({
      id: 'user-1',
      firstName: 'Johan',
      lastName: 'Nel',
      email: 'johan@example.com',
      passwordHash: 'hashed-password',
      userType: 'GENERAL_LEARNER',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
    });

    const response = await registerUser({
      email: 'johan@example.com',
      firstName: 'Johan',
      lastName: 'Nel',
      password: 'mySecurePassword123!',
    });

    expect(userRepositoryMock.findUserByEmail).toHaveBeenCalledWith('johan@example.com');
    expect(passwordServiceMock.hashPassword).toHaveBeenCalledWith('mySecurePassword123!');
    expect(userRepositoryMock.createGeneralLearnerUser).toHaveBeenCalledWith({
      email: 'johan@example.com',
      firstName: 'Johan',
      lastName: 'Nel',
      passwordHash: 'hashed-password',
    });
    expect(response).toEqual({
      user: {
        id: 'user-1',
        firstName: 'Johan',
        lastName: 'Nel',
        email: 'johan@example.com',
        userType: 'GENERAL_LEARNER',
        authStatus: 'ACTIVE',
        createdAt: '2026-05-12T06:00:00.000Z',
      },
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

    expect(passwordServiceMock.hashPassword).not.toHaveBeenCalled();
    expect(userRepositoryMock.createGeneralLearnerUser).not.toHaveBeenCalled();
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
      userType: 'GENERAL_LEARNER',
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
        userType: 'GENERAL_LEARNER',
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
      userType: 'GENERAL_LEARNER',
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
        userType: 'GENERAL_LEARNER',
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

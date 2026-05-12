import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthConflictError, registerUser } from '../../src/services/auth.service.js';

const userRepositoryMock = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  createGeneralLearnerUser: vi.fn(),
}));

const passwordServiceMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
}));

vi.mock('../../src/repositories/user.repository.js', () => userRepositoryMock);

vi.mock('../../src/services/password.service.js', () => passwordServiceMock);

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

import { describe, expect, it } from 'vitest';
import { toPublicUserDto } from '../../src/mappers/user.mapper.js';

describe('toPublicUserDto', () => {
  it('maps a user record to a safe public user DTO', () => {
    const userRecord = {
      id: 'user-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      passwordHash: 'hashed-secret',
      userType: 'GENERAL_TRAINEE',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
    } as const;

    const dto = toPublicUserDto(userRecord);

    expect(dto).toEqual({
      id: 'user-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      userType: 'GENERAL_TRAINEE',
      authStatus: 'ACTIVE',
      createdAt: '2026-05-12T06:00:00.000Z',
    });
    expect(dto).not.toHaveProperty('passwordHash');
  });
});

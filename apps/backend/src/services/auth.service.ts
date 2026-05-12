import { AuthRegisterRequestDto, AuthRegisterResponseDto } from '@insightful-phish/shared';
import { toPublicUserDto } from '../mappers/user.mapper.js';
import { createGeneralLearnerUser, findUserByEmail } from '../repositories/user.repository.js';
import { hashPassword } from './password.service.js';

export class AuthConflictError extends Error {
  constructor(message = 'A user with the provided email already exists') {
    super(message);
    this.name = 'AuthConflictError';
  }
}

export async function registerUser(
  input: AuthRegisterRequestDto,
): Promise<AuthRegisterResponseDto> {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    throw new AuthConflictError();
  }

  const passwordHash = await hashPassword(input.password);

  const newUser = await createGeneralLearnerUser({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    passwordHash,
  });

  return { user: toPublicUserDto(newUser) };
}

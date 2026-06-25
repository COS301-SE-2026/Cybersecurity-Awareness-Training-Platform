import type {
  AuthLoginRequestDto,
  AuthLoginResponseDto,
  AuthMeResponseDto,
  AuthRegisterRequestDto,
  AuthRegisterResponseDto,
} from '@insightful-phish/shared';
import { toPublicUserDto } from '../mappers/user.mapper.js';
import * as UserRepository from '../repositories/user.repository.js';
import { issueActionToken } from './action-token.service.js';
import { requestAuthEmailSend } from './auth-email-hook.service.js';
import { generateAuthToken } from './auth-token.service.js';
import * as PasswordService from './password.service.js';

const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24;

export class AuthConflictError extends Error {
  constructor(message = 'A user with the provided email already exists') {
    super(message);
    this.name = 'AuthConflictError';
  }
}

export class AuthUnauthorizedError extends Error {
  constructor(message = 'Invalid email or password') {
    super(message);
    this.name = 'AuthUnauthorizedError';
  }
}

export async function registerUser(
  input: AuthRegisterRequestDto,
): Promise<AuthRegisterResponseDto> {
  const existingUser = await UserRepository.findUserByEmail(input.email);

  if (existingUser) {
    throw new AuthConflictError();
  }

  const passwordHash = await PasswordService.hashPassword(input.password);

  const newUser = await UserRepository.createGeneralTraineeUser({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    passwordHash,
  });

  const verification = await issueActionToken({
    purpose: 'EMAIL_VERIFICATION',
    userId: newUser.id,
    targetEmail: newUser.email,
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000),
  });

  const emailResult = await requestAuthEmailSend({
    emailType: 'EMAIL_VERIFICATION',
    recipientEmail: newUser.email,
    userId: newUser.id,
    actionTokenId: verification.token.id,
    templateData: {
      actionToken: verification.rawToken,
    },
  });

  return {
    user: toPublicUserDto(newUser),
    verificationEmailQueued: emailResult.queued,
  };
}

export async function loginUser(input: AuthLoginRequestDto): Promise<AuthLoginResponseDto> {
  const user = await UserRepository.findUserByEmail(input.email);

  if (!user) {
    throw new AuthUnauthorizedError();
  }

  const passwordMatches = await PasswordService.verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AuthUnauthorizedError();
  }

  if (user.authStatus !== 'ACTIVE') {
    throw new AuthUnauthorizedError('User account is not active');
  }

  const token = generateAuthToken(user.id);

  return {
    user: toPublicUserDto(user),
    token: token.token,
    tokenType: 'Bearer',
    expiresAt: token.expiresAt,
  };
}

export async function getCurrentUser(userId: string): Promise<AuthMeResponseDto> {
  const user = await UserRepository.findUserById(userId);

  if (user?.authStatus !== 'ACTIVE') {
    throw new AuthUnauthorizedError('Invalid authentication token');
  }

  return {
    user: toPublicUserDto(user),
  };
}

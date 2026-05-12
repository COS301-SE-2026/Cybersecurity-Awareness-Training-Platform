import type { z } from 'zod';
import type {
  authLoginRequestSchema,
  authRegisterRequestSchema,
} from './validation/auth.schemas.js';

export type UserTypeDto = 'IP_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_LEARNER' | 'GENERAL_LEARNER';

export type AuthStatusDto = 'PENDING' | 'ACTIVE' | 'DISABLED';

export interface PublicUserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserTypeDto;
  authStatus: AuthStatusDto;
  createdAt: string;
}

export type AuthRegisterRequestDto = z.infer<typeof authRegisterRequestSchema>;

export type AuthLoginRequestDto = z.infer<typeof authLoginRequestSchema>;

export interface AuthSuccessResponseDto {
  userId: string;
  token: string;
  message?: string;
}

export interface AuthMeResponseDto {
  user: PublicUserDto;
}

export interface AuthRegisterResponseDto {
  user: PublicUserDto;
}

export interface AuthLoginResponseDto {
  user: PublicUserDto;
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
}

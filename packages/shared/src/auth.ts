import type { z } from 'zod';
import type { Id, IsoDateTimeString } from './common.js';
import type {
  authLoginRequestSchema,
  authRegisterRequestSchema,
} from './validation/auth.schemas.js';

export type UserTypeDto = 'IP_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_LEARNER' | 'GENERAL_LEARNER';

export type AuthStatusDto = 'PENDING' | 'ACTIVE' | 'DISABLED';

export interface PublicUserDto {
  id: Id;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserTypeDto;
  authStatus: AuthStatusDto;
  createdAt: IsoDateTimeString;
}

export type AuthRegisterRequestDto = z.infer<typeof authRegisterRequestSchema>;

export type AuthLoginRequestDto = z.infer<typeof authLoginRequestSchema>;

export interface AuthSuccessResponseDto {
  userId: Id;
  token: string;
  message?: string;
}

export interface AuthMeResponseDto {
  user: PublicUserDto;
}

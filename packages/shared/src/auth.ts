import type { Id, IsoDateTimeString } from './common.js';

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

export interface AuthRegisterRequestDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthLoginRequestDto {
  email: string;
  password: string;
}

export interface AuthSuccessResponseDto {
  userId: Id;
  token: string;
  message?: string;
}

export interface AuthMeResponseDto {
  user: PublicUserDto;
}

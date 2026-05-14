import type { z } from 'zod';
import type {
  authLoginRequestSchema,
  authRegisterRequestSchema,
} from './validation/auth.schemas.js';

export type UserTypeDto =
  | 'IP_ADMIN'
  | 'ORGANISATION_ADMIN'
  | 'ORGANISATION_LEARNER'
  | 'GENERAL_LEARNER';

export type AuthStatusDto = 'PENDING' | 'ACTIVE' | 'DISABLED';

export interface PublicOrganisationDto {
  id: string;
  name: string;
}

export interface PublicLearnerProfileDto {
  id: string;
  learnerStatus: 'ACTIVE' | 'INACTIVE';
  learnerType: 'GENERAL' | 'ORGANISATION';
  organisation?: PublicOrganisationDto | null;
}

export interface PublicAdminProfileDto {
  id: string;
  adminStatus: 'ACTIVE' | 'INACTIVE';
  adminType: 'ORGANISATION' | 'IP';
  organisation?: PublicOrganisationDto | null;
}

export interface PublicUserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserTypeDto;
  authStatus: AuthStatusDto;
  learnerProfile?: PublicLearnerProfileDto | null;
  adminProfile?: PublicAdminProfileDto | null;
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

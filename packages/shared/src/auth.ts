import type { z } from 'zod';
import type {
  authLoginRequestSchema,
  authRegisterRequestSchema,
  setupCompleteRequestSchema,
  setupTokenParamsSchema,
  authVerifyEmailRequestSchema,
  accountVerifyEmailChangeRequestSchema,
} from './validation/auth.schemas.js';

export type SetupTokenParamsDto = z.infer<typeof setupTokenParamsSchema>;
export type SetupCompleteRequestDto = z.infer<typeof setupCompleteRequestSchema>;
export type AuthVerifyEmailRequestDto = z.infer<typeof authVerifyEmailRequestSchema>;
export type AccountVerifyEmailChangeRequestDto = z.infer<
  typeof accountVerifyEmailChangeRequestSchema
>;

export interface AuthVerifyEmailResponseDto {
  state: 'VALID' | 'INVALID' | 'EXPIRED' | 'USED' | 'REVOKED';
  user?: PublicUserDto;
}

export interface AccountVerifyEmailChangeResponseDto {
  state: 'VALID' | 'INVALID' | 'EXPIRED' | 'USED' | 'REVOKED';
}

export interface AuthRegisterResponseDto {
  user: PublicUserDto;
  verificationEmailQueued: boolean;
}

export interface SetupTokenContextResponseDto {
  token: {
    state: 'VALID' | 'INVALID' | 'EXPIRED' | 'USED' | 'REVOKED';
    purpose?: string;
  };
  targetEmail?: string;
  organisationName?: string;
}

export interface SetupCompleteResponseDto {
  user: PublicUserDto;
}

export type UserTypeDto =
  | 'IP_ADMIN'
  | 'ORGANISATION_ADMIN'
  | 'ORGANISATION_TRAINEE'
  | 'GENERAL_TRAINEE';

export type AuthStatusDto =
  | 'PENDING_EMAIL_VERIFICATION'
  | 'PENDING_INVITE_SETUP'
  | 'ACTIVE'
  | 'DISABLED';

export interface PublicOrganisationDto {
  id: string;
  name: string;
}

export interface PublicTraineeProfileDto {
  id: string;
  traineeStatus: 'ACTIVE' | 'INACTIVE';
  traineeType: 'GENERAL' | 'ORGANISATION';
  organisation?: PublicOrganisationDto | null;
}

export interface PublicAdminProfileDto {
  id: string;
  adminStatus: 'ACTIVE' | 'DISABLED';
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
  traineeProfile?: PublicTraineeProfileDto | null;
  adminProfile?: PublicAdminProfileDto | null;
  createdAt: string;
}

export type AuthRegisterRequestDto = z.infer<typeof authRegisterRequestSchema>;

export type AuthLoginRequestDto = z.infer<typeof authLoginRequestSchema>;

export interface AuthContextUserDto {
  id: string;
  userType: UserTypeDto;
  authStatus: AuthStatusDto;
}

export interface AuthOrganisationContextDto {
  id: string;
  status: string;
}

export interface AuthContextDto {
  user: AuthContextUserDto;
  role: UserTypeDto;
  organisation: AuthOrganisationContextDto | null;
  permissions: string[];
  redirectTo: string;
}

export interface AuthContextResponseDto {
  accessToken?: string;
  user: PublicUserDto;
  context: AuthContextDto;
  permissions: string[];
  redirectTo: string;
  token?: string;
  tokenType?: string;
  expiresAt?: string;
  sessionExpiresAt?: string;
}

export interface AuthSuccessResponseDto {
  userId: string;
  token: string;
  message?: string;
}

export type AuthMeResponseDto = AuthContextResponseDto;

export interface AuthLoginResponseDto extends AuthContextResponseDto {
  accessToken: string;
}

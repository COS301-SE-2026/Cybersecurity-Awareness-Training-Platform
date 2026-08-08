import type { z } from 'zod';
import type {
  authForgotPasswordRequestSchema,
  authLoginRequestSchema,
  authRegisterRequestSchema,
  authResetPasswordRequestSchema,
  setupCompleteRequestSchema,
  setupTokenParamsSchema,
  authVerifyEmailRequestSchema,
} from './validation/auth.schemas.js';
import type { accountVerifyEmailChangeRequestSchema } from './validation/account-settings.schemas.js';

export type SetupTokenParamsDto = z.infer<typeof setupTokenParamsSchema>;
export type SetupCompleteRequestDto = z.infer<typeof setupCompleteRequestSchema>;
export type AuthVerifyEmailRequestDto = z.infer<typeof authVerifyEmailRequestSchema>;
export type AccountVerifyEmailChangeRequestDto = z.infer<
  typeof accountVerifyEmailChangeRequestSchema
>;
export type AuthResetPasswordRequestDto = z.infer<typeof authResetPasswordRequestSchema>;

export type ActionTokenStateDto = 'VALID' | 'INVALID' | 'EXPIRED' | 'USED' | 'REVOKED';

export interface AuthVerifyEmailResponseDto {
  state: ActionTokenStateDto;
  user?: PublicUserDto;
}

export interface AccountVerifyEmailChangeResponseDto {
  state: ActionTokenStateDto;
}

export interface AuthRegisterResponseDto {
  message: string;
}

export interface AuthForgotPasswordResponseDto {
  message: string;
}

export type SetupTokenPurposeDto =
  | 'INITIAL_ORGANISATION_ADMIN_SETUP'
  | 'ORGANISATION_TRAINEE_INVITE'
  | 'PLATFORM_ADMIN_INVITE';
export type SetupTokenRoleDto = 'ORGANISATION_TRAINEE' | 'ORGANISATION_ADMIN' | 'IP_ADMIN';
export interface SetupTokenContextResponseDto {
  token: {
    state: ActionTokenStateDto;
    purpose?: SetupTokenPurposeDto;
  };
  targetEmail?: string;
  targetFirstName?: string | null;
  targetLastName?: string | null;
  role?: SetupTokenRoleDto;
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

export type PlatformAdminRoleDto = 'SUPER_ADMIN' | 'NORMAL_ADMIN';

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

export type AuthForgotPasswordRequestDto = z.infer<typeof authForgotPasswordRequestSchema>;

export interface AuthContextUserDto {
  id: string;
  userType: UserTypeDto;
  authStatus: AuthStatusDto;
}

export interface AuthOrganisationContextDto {
  id: string;
  name: string;
  status: string;
}

export interface AuthContextDto {
  user: AuthContextUserDto;
  role: UserTypeDto;
  organisation: AuthOrganisationContextDto | null;
  platformAdminRole: PlatformAdminRoleDto | null;
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

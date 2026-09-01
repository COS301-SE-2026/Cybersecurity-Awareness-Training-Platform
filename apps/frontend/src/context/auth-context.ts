import { createContext } from 'react';
import type { AuthContextDto, AuthLoginResponseDto, PublicUserDto } from '@insightful-phish/shared';

export type AuthUser = PublicUserDto;
export type RenewSessionOptions = Readonly<{ forceServerConfirmation?: boolean }>;

export type AuthContextType = {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  token: string | null;
  user: AuthUser | null;
  authContext: AuthContextDto | null;
  permissions: string[];
  redirectTo: string | null;
  expiresAt: string | null;
  sessionExpiresAt: string | null;
  idleTimeoutMinutes: number | null;
  login: (authResponse: AuthLoginResponseDto) => void;
  renewSession: (options?: RenewSessionOptions) => Promise<void>;
  refreshAuthContext: () => Promise<void>;
  clearAuth: () => void;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

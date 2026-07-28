import { createContext } from 'react';
import type {
  AuthContextDto,
  AuthContextResponseDto,
  PublicUserDto,
} from '@insightful-phish/shared';

export type AuthUser = PublicUserDto;

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
  login: (authResponse: AuthContextResponseDto) => void;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

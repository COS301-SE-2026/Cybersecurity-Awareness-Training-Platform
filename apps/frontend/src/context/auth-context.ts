import { createContext } from 'react';

export type AuthUser = {
  firstName: string;
  lastName: string;
  email: string;
};

export type AuthContextType = {
  isAuthenticated: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

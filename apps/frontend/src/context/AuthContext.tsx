import { createContext, useContext, useState } from 'react';

import type { ReactNode } from 'react';

type AuthContextType = {
  isAuthenticated: boolean;

  login: () => void;

  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('authenticated') === 'true',
  );

  const login = () => {
    localStorage.setItem('authenticated', 'true');

    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('authenticated');

    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

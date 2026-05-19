import { useState } from 'react';

import type { ReactNode } from 'react';
import { AuthContext } from './auth-context';
import type { AuthUser } from './auth-context';

type AuthProviderProps = {
  children: ReactNode;
};

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return typeof window.localStorage?.getItem === 'function' ? window.localStorage : null;
}

function getStoredUser(): AuthUser | null {
  try {
    const storedUser = getStorage()?.getItem('user');

    return storedUser ? (JSON.parse(storedUser) as AuthUser) : null;
  } catch {
    getStorage()?.removeItem('user');

    return null;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() => getStorage()?.getItem('token') ?? null);

  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(getStorage()?.getItem('token')),
  );

  const login = (newToken: string, newUser: AuthUser) => {
    getStorage()?.setItem('token', newToken);
    getStorage()?.setItem('user', JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);

    setIsAuthenticated(true);
  };

  const logout = () => {
    getStorage()?.removeItem('token');
    getStorage()?.removeItem('user');

    setToken(null);
    setUser(null);

    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

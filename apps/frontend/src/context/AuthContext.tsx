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

function clearStoredAuth() {
  getStorage()?.removeItem('token');
  getStorage()?.removeItem('user');
}

function getStoredAuth(): {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
} {
  const storage = getStorage();

  const storedToken = storage?.getItem('token') ?? null;
  const storedUser = storage?.getItem('user');

  if (!storedToken) {
    storage?.removeItem('user');

    return {
      token: null,
      user: null,
      isAuthenticated: false,
    };
  }

  if (!storedUser) {
    clearStoredAuth();

    return {
      token: null,
      user: null,
      isAuthenticated: false,
    };
  }

  try {
    const parsedUser = JSON.parse(storedUser) as AuthUser;

    return {
      token: storedToken,
      user: parsedUser,
      isAuthenticated: true,
    };
  } catch {
    clearStoredAuth();

    return {
      token: null,
      user: null,
      isAuthenticated: false,
    };
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const storedAuth = getStoredAuth();

  const [token, setToken] = useState<string | null>(storedAuth.token);

  const [user, setUser] = useState<AuthUser | null>(storedAuth.user);

  const [isAuthenticated, setIsAuthenticated] = useState(storedAuth.isAuthenticated);

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

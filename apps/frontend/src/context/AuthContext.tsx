import { useState } from 'react';

import type { ReactNode } from 'react';
import { AuthContext } from './auth-context';

type AuthProviderProps = {
  children: ReactNode;
};

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return typeof window.localStorage?.getItem === 'function' ? window.localStorage : null;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => getStorage()?.getItem('authenticated') === 'true',
  );

  const login = () => {
    getStorage()?.setItem('authenticated', 'true');

    setIsAuthenticated(true);
  };

  const logout = () => {
    getStorage()?.removeItem('authenticated');

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

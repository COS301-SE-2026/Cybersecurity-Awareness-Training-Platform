import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { logoutSession, refreshSession } from '../services/auth.service';
import { AuthContext } from './auth-context';
import type { AuthUser } from './auth-context';
import type { AuthContextDto, AuthContextResponseDto } from '@insightful-phish/shared';

type AuthProviderProps = {
  children: ReactNode;
};

function getStorage() {
  if (globalThis.localStorage === undefined) {
    return null;
  }

  return typeof globalThis.localStorage.getItem === 'function' ? globalThis.localStorage : null;
}

function clearStoredAuth() {
  getStorage()?.removeItem('token');
  getStorage()?.removeItem('user');
  getStorage()?.removeItem('authContext');
  getStorage()?.removeItem('permissions');
  getStorage()?.removeItem('redirectTo');
}

function getStoredAuth(): {
  token: string | null;
  user: AuthUser | null;
  authContext: AuthContextDto | null;
  permissions: string[];
  redirectTo: string | null;
  isAuthenticated: boolean;
} {
  const storage = getStorage();

  const storedToken = storage?.getItem('token') ?? null;
  const storedUser = storage?.getItem('user');
  const storedAuthContext = storage?.getItem('authContext');
  const storedPermissions = storage?.getItem('permissions');
  const storedRedirectTo = storage?.getItem('redirectTo') ?? null;

  if (!storedToken) {
    storage?.removeItem('user');

    return {
      token: null,
      user: null,
      authContext: null,
      permissions: [],
      redirectTo: null,
      isAuthenticated: false,
    };
  }

  if (!storedUser) {
    clearStoredAuth();

    return {
      token: null,
      user: null,
      authContext: null,
      permissions: [],
      redirectTo: null,
      isAuthenticated: false,
    };
  }

  try {
    const parsedUser = JSON.parse(storedUser) as AuthUser;
    const parsedAuthContext = storedAuthContext
      ? (JSON.parse(storedAuthContext) as AuthContextDto)
      : null;
    const parsedPermissions = storedPermissions ? (JSON.parse(storedPermissions) as string[]) : [];

    return {
      token: storedToken,
      user: parsedUser,
      authContext: parsedAuthContext,
      permissions: parsedPermissions,
      redirectTo: storedRedirectTo,
      isAuthenticated: true,
    };
  } catch {
    clearStoredAuth();

    return {
      token: null,
      user: null,
      authContext: null,
      permissions: [],
      redirectTo: null,
      isAuthenticated: false,
    };
  }
}

function getAuthResposeToken(authResponse: AuthContextResponseDto): string | null {
  return authResponse.accessToken ?? authResponse.token ?? null;
}
export function AuthProvider({ children }: AuthProviderProps) {
  const storedAuth = getStoredAuth();

  const [token, setToken] = useState<string | null>(storedAuth.token);

  const [user, setUser] = useState<AuthUser | null>(storedAuth.user);

  const [authContext, setAuthContext] = useState<AuthContextDto | null>(storedAuth.authContext);

  const [permissions, setPermissions] = useState<string[]>(storedAuth.permissions);

  const [redirectTo, setRedirectTo] = useState<string | null>(storedAuth.redirectTo);

  const [isAuthenticated, setIsAuthenticated] = useState(storedAuth.isAuthenticated);

  const [isAuthLoading, setIsAuthLoading] = useState(!storedAuth.isAuthenticated);

  const login = useCallback((authResponse: AuthContextResponseDto) => {
    const newToken = getAuthResposeToken(authResponse);

    if (!newToken) {
      clearStoredAuth();
      setToken(null);
      setUser(null);
      setAuthContext(null);
      setPermissions([]);
      setRedirectTo(null);
      setIsAuthenticated(false);
      return;
    }

    getStorage()?.setItem('token', newToken);
    getStorage()?.setItem('user', JSON.stringify(authResponse.user));
    getStorage()?.setItem('authContext', JSON.stringify(authResponse.context));
    getStorage()?.setItem('permissions', JSON.stringify(authResponse.permissions));
    getStorage()?.setItem('redirectTo', authResponse.redirectTo);

    setToken(newToken);
    setUser(authResponse.user);
    setAuthContext(authResponse.context);
    setPermissions(authResponse.permissions);
    setRedirectTo(authResponse.redirectTo);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutSession();
    } finally {
      clearStoredAuth();

      setToken(null);
      setUser(null);
      setAuthContext(null);
      setPermissions([]);
      setRedirectTo(null);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    if (storedAuth.isAuthenticated) {
      setIsAuthLoading(false);
      return;
    }

    let isMounted = true;

    async function bootstrapAuth() {
      try {
        const authResponse = await refreshSession();

        if (isMounted) {
          login(authResponse);
        }
      } catch {
        if (isMounted) {
          clearStoredAuth();
          setToken(null);
          setUser(null);
          setAuthContext(null);
          setPermissions([]);
          setRedirectTo(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    }

    void bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, [login, storedAuth.isAuthenticated]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      isAuthLoading,
      token,
      user,
      authContext,
      permissions,
      redirectTo,
      login,
      logout,
    }),
    [
      isAuthenticated,
      isAuthLoading,
      token,
      user,
      authContext,
      permissions,
      redirectTo,
      login,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

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
  getStorage()?.removeItem('expiresAt');
  getStorage()?.removeItem('sessionExpiresAt');
}

function getStoredAuth(): {
  token: string | null;
  user: AuthUser | null;
  authContext: AuthContextDto | null;
  permissions: string[];
  redirectTo: string | null;
  expiresAt: string | null;
  sessionExpiresAt: string | null;
  isAuthenticated: boolean;
} {
  const storage = getStorage();

  const storedToken = storage?.getItem('token') ?? null;
  const storedUser = storage?.getItem('user');
  const storedAuthContext = storage?.getItem('authContext');
  const storedPermissions = storage?.getItem('permissions');
  const storedRedirectTo = storage?.getItem('redirectTo') ?? null;
  const storedExpiresAt = storage?.getItem('expiresAt') ?? null;
  const storedSessionExpiresAt = storage?.getItem('sessionExpiresAt') ?? null;

  if (!storedToken) {
    storage?.removeItem('user');

    return {
      token: null,
      user: null,
      authContext: null,
      permissions: [],
      redirectTo: null,
      expiresAt: null,
      sessionExpiresAt: null,
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
      expiresAt: null,
      sessionExpiresAt: null,
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
      expiresAt: storedExpiresAt,
      sessionExpiresAt: storedSessionExpiresAt,
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
      expiresAt: null,
      sessionExpiresAt: null,
      isAuthenticated: false,
    };
  }
}

function getAuthResponseToken(authResponse: AuthContextResponseDto): string | null {
  return authResponse.accessToken ?? authResponse.token ?? null;
}

function isAccessTokenExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) {
    return true;
  }

  const expiresAtTime = Date.parse(expiresAt);

  if (Number.isNaN(expiresAtTime)) {
    return true;
  }

  return expiresAtTime <= Date.now() + 30_000;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const storedAuth = getStoredAuth();

  const [token, setToken] = useState<string | null>(storedAuth.token);

  const [user, setUser] = useState<AuthUser | null>(storedAuth.user);

  const [authContext, setAuthContext] = useState<AuthContextDto | null>(storedAuth.authContext);

  const [permissions, setPermissions] = useState<string[]>(storedAuth.permissions);

  const [redirectTo, setRedirectTo] = useState<string | null>(storedAuth.redirectTo);

  const [expiresAt, setExpiresAt] = useState<string | null>(storedAuth.expiresAt);

  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(
    storedAuth.sessionExpiresAt,
  );

  const [isAuthenticated, setIsAuthenticated] = useState(storedAuth.isAuthenticated);

  const [isAuthLoading, setIsAuthLoading] = useState(
    !storedAuth.isAuthenticated || isAccessTokenExpired(storedAuth.expiresAt),
  );

  const login = useCallback(
    (authResponse: AuthContextResponseDto) => {
      const newToken = getAuthResponseToken(authResponse);

      if (!newToken) {
        clearStoredAuth();
        setToken(null);
        setUser(null);
        setAuthContext(null);
        setPermissions([]);
        setRedirectTo(null);
        setExpiresAt(null);
        setSessionExpiresAt(null);
        setIsAuthenticated(false);
        return;
      }

      getStorage()?.setItem('token', newToken);
      getStorage()?.setItem('user', JSON.stringify(authResponse.user));
      getStorage()?.setItem('authContext', JSON.stringify(authResponse.context));
      getStorage()?.setItem('permissions', JSON.stringify(authResponse.permissions));
      getStorage()?.setItem('redirectTo', authResponse.redirectTo);

      if (authResponse.expiresAt) {
        getStorage()?.setItem('expiresAt', authResponse.expiresAt);
      } else {
        getStorage()?.removeItem('expiresAt');
      }

      if (authResponse.sessionExpiresAt) {
        getStorage()?.setItem('sessionExpiresAt', authResponse.sessionExpiresAt);
      } else {
        getStorage()?.removeItem('sessionExpiresAt');
      }

      setToken(newToken);
      setUser(authResponse.user);
      setAuthContext(authResponse.context);
      setPermissions(authResponse.permissions);
      setRedirectTo(authResponse.redirectTo);
      setExpiresAt(authResponse.expiresAt ?? null);
      setSessionExpiresAt(authResponse.sessionExpiresAt ?? null);
      setIsAuthenticated(true);
    },
    [
      setAuthContext,
      setExpiresAt,
      setIsAuthenticated,
      setPermissions,
      setRedirectTo,
      setSessionExpiresAt,
      setToken,
      setUser,
    ],
  );

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
      setExpiresAt(null);
      setSessionExpiresAt(null);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    if (storedAuth.isAuthenticated && !isAccessTokenExpired(storedAuth.expiresAt)) {
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
          setExpiresAt(null);
          setSessionExpiresAt(null);
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
  }, [login, storedAuth.expiresAt, storedAuth.isAuthenticated]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      isAuthLoading,
      token,
      user,
      authContext,
      permissions,
      redirectTo,
      expiresAt,
      sessionExpiresAt,
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
      expiresAt,
      sessionExpiresAt,
      login,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

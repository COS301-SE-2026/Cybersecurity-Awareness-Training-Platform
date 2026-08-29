import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { logoutSession, refreshSession } from '../services/auth.service';
import { AuthContext } from './auth-context';
import type { AuthUser } from './auth-context';
import type { AuthContextDto, AuthLoginResponseDto } from '@insightful-phish/shared';

type AuthProviderProps = {
  children: ReactNode;
};
type StoredAuth = {
  token: string | null;
  user: AuthUser | null;
  authContext: AuthContextDto | null;
  permissions: string[];
  redirectTo: string | null;
  expiresAt: string | null;
  sessionExpiresAt: string | null;
  idleTimeoutMinutes: number | null;
  isAuthenticated: boolean;
};

function getStorage() {
  if (globalThis.localStorage === undefined) {
    return null;
  }

  return typeof globalThis.localStorage.getItem === 'function' ? globalThis.localStorage : null;
}

function parseStoredIdleTimeoutMinutes(storedValue: string | null): number | null {
  if (storedValue === null) {
    return null;
  }
  const idleTimeoutMinutes = Number(storedValue);

  if (Number.isInteger(idleTimeoutMinutes) === false || idleTimeoutMinutes <= 0) {
    return null;
  }
  return idleTimeoutMinutes;
}

function clearStoredAuth() {
  getStorage()?.removeItem('token');
  getStorage()?.removeItem('user');
  getStorage()?.removeItem('authContext');
  getStorage()?.removeItem('permissions');
  getStorage()?.removeItem('redirectTo');
  getStorage()?.removeItem('expiresAt');
  getStorage()?.removeItem('sessionExpiresAt');
  getStorage()?.removeItem('idleTimeoutMinutes');
}

function getStoredAuth(): StoredAuth {
  const storage = getStorage();

  const storedToken = storage?.getItem('token') ?? null;
  const storedUser = storage?.getItem('user');
  const storedAuthContext = storage?.getItem('authContext');
  const storedPermissions = storage?.getItem('permissions');
  const storedRedirectTo = storage?.getItem('redirectTo') ?? null;
  const storedExpiresAt = storage?.getItem('expiresAt') ?? null;
  const storedSessionExpiresAt = storage?.getItem('sessionExpiresAt') ?? null;
  const storedIdleTimeoutMinutes = storage?.getItem('idleTimeoutMinutes') ?? null;
  const idleTimeoutMinutes = parseStoredIdleTimeoutMinutes(storedIdleTimeoutMinutes);

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
      idleTimeoutMinutes: null,
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
      idleTimeoutMinutes: null,
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
      idleTimeoutMinutes,
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
      idleTimeoutMinutes: null,
      isAuthenticated: false,
    };
  }
}

function getAuthResponseToken(authResponse: AuthLoginResponseDto): string | null {
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

  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number | null>(
    storedAuth.idleTimeoutMinutes,
  );

  const [isAuthenticated, setIsAuthenticated] = useState(storedAuth.isAuthenticated);

  const [isAuthLoading, setIsAuthLoading] = useState(
    !storedAuth.isAuthenticated || isAccessTokenExpired(storedAuth.expiresAt),
  );

  const clearAuth = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
    setAuthContext(null);
    setPermissions([]);
    setRedirectTo(null);
    setExpiresAt(null);
    setSessionExpiresAt(null);
    setIdleTimeoutMinutes(null);
    setIsAuthenticated(false);
  }, [
    setAuthContext,
    setExpiresAt,
    setIsAuthenticated,
    setPermissions,
    setRedirectTo,
    setSessionExpiresAt,
    setIdleTimeoutMinutes,
    setToken,
    setUser,
  ]);

  const login = useCallback(
    (authResponse: AuthLoginResponseDto) => {
      const newToken = getAuthResponseToken(authResponse);

      if (!newToken) {
        clearAuth();
        return;
      }

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

      if (authResponse.idleTimeoutMinutes === null) {
        getStorage()?.removeItem('idleTimeoutMinutes');
      } else {
        getStorage()?.setItem('idleTimeoutMinutes', String(authResponse.idleTimeoutMinutes));
      }

      getStorage()?.setItem('token', newToken);

      setToken(newToken);
      setUser(authResponse.user);
      setAuthContext(authResponse.context);
      setPermissions(authResponse.permissions);
      setRedirectTo(authResponse.redirectTo);
      setExpiresAt(authResponse.expiresAt ?? null);
      setSessionExpiresAt(authResponse.sessionExpiresAt ?? null);
      setIdleTimeoutMinutes(authResponse.idleTimeoutMinutes);
      setIsAuthenticated(true);
    },
    [
      clearAuth,
      setAuthContext,
      setExpiresAt,
      setIsAuthenticated,
      setPermissions,
      setRedirectTo,
      setSessionExpiresAt,
      setIdleTimeoutMinutes,
      setToken,
      setUser,
    ],
  );

  const logout = useCallback(async () => {
    try {
      await logoutSession();
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

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
          clearAuth();
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
  }, [clearAuth, login, storedAuth.expiresAt, storedAuth.isAuthenticated]);

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
      idleTimeoutMinutes,
      login,
      clearAuth,
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
      idleTimeoutMinutes,
      login,
      clearAuth,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { logoutSession, refreshSession } from '../services/auth.service';
import { AuthContext } from './auth-context';
import type { AuthUser, RenewSessionOptions } from './auth-context';
import type { AuthContextDto, AuthLoginResponseDto } from '@insightful-phish/shared';
import { ApiError } from '../lib/apiClient';

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
type AuthChannelMessage =
  | { type: 'AUTH_UPDATED'; authResponse: AuthLoginResponseDto }
  | { type: 'SIGNED_OUT' };

const AUTH_CHANNEL_NAME = 'insightful-phish-auth';
const REFRESH_LOCK_NAME = 'insightful-phish-refresh';
const ACCESS_TOKEN_RENEWAL_MARGIN_MS = 60_000;

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

//the server rejected the auth or session
function isAuthoratitiveAuthFailure(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

async function runWithRefreshLock(callback: () => Promise<void>): Promise<void> {
  const lockManager = globalThis.navigator?.locks;
  if (lockManager === undefined) {
    await callback();
    return;
  }
  await lockManager.request(REFRESH_LOCK_NAME, callback);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const storedAuth = getStoredAuth();

  const activeTokenRef = useRef<string | null>(storedAuth.token);
  const authChannelRef = useRef<BroadcastChannel | null>(null);
  const renewalPromiseRef = useRef<Promise<void> | null>(null);

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

  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const clearAuth = useCallback(() => {
    clearStoredAuth();
    activeTokenRef.current = null;
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

  const applyStoredAuth = useCallback(
    (newStoredAuth: StoredAuth) => {
      activeTokenRef.current = newStoredAuth.token;
      setToken(newStoredAuth.token);
      setUser(newStoredAuth.user);
      setAuthContext(newStoredAuth.authContext);
      setPermissions(newStoredAuth.permissions);
      setRedirectTo(newStoredAuth.redirectTo);
      setExpiresAt(newStoredAuth.expiresAt);
      setSessionExpiresAt(newStoredAuth.sessionExpiresAt);
      setIdleTimeoutMinutes(newStoredAuth.idleTimeoutMinutes);
      setIsAuthenticated(newStoredAuth.isAuthenticated);
    },
    [
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

  const applyAuthResponse = useCallback(
    //Was previously login.. login is now below and calls this function
    (authResponse: AuthLoginResponseDto) => {
      const newToken = getAuthResponseToken(authResponse);

      if (!newToken) {
        clearAuth();
        return;
      }

      activeTokenRef.current = newToken;

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

  const login = useCallback(
    (authResponse: AuthLoginResponseDto) => {
      applyAuthResponse(authResponse);

      const message: AuthChannelMessage = {
        type: 'AUTH_UPDATED',
        authResponse,
      };

      authChannelRef.current?.postMessage(message);
    },
    [applyAuthResponse],
  );

  useEffect(() => {
    if (typeof globalThis.BroadcastChannel !== 'function') {
      return;
    }

    const authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    authChannelRef.current = authChannel;
    authChannel.onmessage = (event: MessageEvent<AuthChannelMessage>) => {
      const message = event.data;
      if (message.type === 'AUTH_UPDATED') {
        applyAuthResponse(message.authResponse);
      } else if (message.type === 'SIGNED_OUT') {
        clearAuth();
      }
    };

    return () => {
      authChannel.close();
      if (authChannelRef.current === authChannel) {
        authChannelRef.current = null;
      }
    };
  }, [applyAuthResponse, clearAuth]);

  const renewSession = useCallback(
    async (options?: RenewSessionOptions): Promise<void> => {
      const forceServerConfirmation = options?.forceServerConfirmation ?? false;
      if (renewalPromiseRef.current !== null) {
        await renewalPromiseRef.current;
        return;
      }

      const tokenBeforeRenewal = activeTokenRef.current;

      const renewalPromise = runWithRefreshLock(async () => {
        const latestStoredAuth = getStoredAuth();

        if (
          forceServerConfirmation === false &&
          latestStoredAuth.isAuthenticated === true &&
          latestStoredAuth.token !== null &&
          latestStoredAuth.token !== tokenBeforeRenewal &&
          !isAccessTokenExpired(latestStoredAuth.expiresAt)
        ) {
          applyStoredAuth(latestStoredAuth);
          return;
        }

        const authResponse = await refreshSession();

        if (activeTokenRef.current !== tokenBeforeRenewal) {
          return;
        }

        applyAuthResponse(authResponse);

        const message: AuthChannelMessage = {
          type: 'AUTH_UPDATED',
          authResponse,
        };

        authChannelRef.current?.postMessage(message);
      });

      renewalPromiseRef.current = renewalPromise;

      try {
        await renewalPromise;
      } catch (error) {
        if (activeTokenRef.current === tokenBeforeRenewal && isAuthoratitiveAuthFailure(error)) {
          clearAuth();

          const message: AuthChannelMessage = { type: 'SIGNED_OUT' };

          authChannelRef.current?.postMessage(message);
        }

        throw error;
      } finally {
        if (renewalPromiseRef.current === renewalPromise) {
          renewalPromiseRef.current = null;
        }
      }
    },
    [applyAuthResponse, applyStoredAuth, clearAuth],
  );

  const logout = useCallback(async () => {
    try {
      await runWithRefreshLock(async () => {
        await logoutSession();
      });
    } finally {
      clearAuth();
      const message: AuthChannelMessage = { type: 'SIGNED_OUT' };
      authChannelRef.current?.postMessage(message);
    }
  }, [clearAuth]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth(): Promise<void> {
      try {
        await renewSession();
      } catch {
        //renewsession already fixes stuff if something bad happens
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
  }, [renewSession]);

  useEffect(() => {
    if (isAuthenticated === false || expiresAt === null) {
      return;
    }

    const expiresAtTime = Date.parse(expiresAt);

    const renewalDelay = Number.isNaN(expiresAtTime)
      ? 0
      : Math.max(0, expiresAtTime - Date.now() - ACCESS_TOKEN_RENEWAL_MARGIN_MS);

    const renewalTimer = globalThis.setTimeout(() => {
      void renewSession().catch(() => undefined);
    }, renewalDelay);

    return () => {
      globalThis.clearTimeout(renewalTimer);
    };
  }, [expiresAt, isAuthenticated, renewSession]);

  useEffect(() => {
    if (isAuthenticated === false || expiresAt === null) {
      return;
    }

    const expiresAtTime = Date.parse(expiresAt);
    function handleVisibilityChange(): void {
      if (document.visibilityState !== 'visible') {
        return;
      }

      if (
        Number.isNaN(expiresAtTime) ||
        expiresAtTime <= Date.now() + ACCESS_TOKEN_RENEWAL_MARGIN_MS
      ) {
        void renewSession().catch(() => undefined);
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [expiresAt, isAuthenticated, renewSession]);

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
      renewSession,
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
      renewSession,
      clearAuth,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

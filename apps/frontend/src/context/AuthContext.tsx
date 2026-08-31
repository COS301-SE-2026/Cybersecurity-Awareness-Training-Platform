import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { getCurrentUser, logoutSession, refreshSession } from '../services/auth.service';
import { AuthContext } from './auth-context';
import type { AuthUser, RenewSessionOptions } from './auth-context';
import type { AuthContextDto, AuthLoginResponseDto } from '@insightful-phish/shared';
import { ApiError } from '../lib/apiClient';
import BasicConfirmationModal from '../components/layout/modals/BasicConfirmationModal';

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
  | { type: 'SIGNED_OUT' }
  | { type: 'ACTIVITY'; observedAt: number }
  | { type: 'IDLE_WARNING'; lastActivityAt: number }
  | { type: 'IDLE_EXPIRED'; lastActivityAt: number };

const AUTH_CHANNEL_NAME = 'insightful-phish-auth';
const REFRESH_LOCK_NAME = 'insightful-phish-refresh';
const LOGOUT_LOCK_NAME = 'insightful-phish-logout';
const ACCESS_TOKEN_RENEWAL_MARGIN_MS = 60_000;
const IDLE_WARNING_LEAD_MS = 60_000;

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

async function runWithLogoutLock(callback: () => Promise<void>): Promise<void> {
  const lockManager = globalThis.navigator?.locks;
  if (lockManager === undefined) {
    await callback();
    return;
  }
  await lockManager.request(LOGOUT_LOCK_NAME, callback);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const storedAuth = getStoredAuth();

  const activeTokenRef = useRef<string | null>(storedAuth.token);
  const authChannelRef = useRef<BroadcastChannel | null>(null);
  const renewalPromiseRef = useRef<Promise<void> | null>(null);
  const lastActivityAtRef = useRef<number | null>(null);

  const idleWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleExpiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleLogoutStartedRef = useRef(false);

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

  const [isIdleWarningVisible, setIsIdleWarningVisible] = useState(false);

  const [isIdleRenewing, setIsIdleRenewing] = useState(false);

  const [idleWarningError, setIdleWarningError] = useState<string | null>(null);

  const clearAuth = useCallback(() => {
    clearStoredAuth();
    activeTokenRef.current = null;
    lastActivityAtRef.current = null;
    if (idleWarningTimerRef.current !== null) {
      globalThis.clearTimeout(idleWarningTimerRef.current);
      idleWarningTimerRef.current = null;
    }
    if (idleExpiryTimerRef.current !== null) {
      globalThis.clearTimeout(idleExpiryTimerRef.current);
      idleExpiryTimerRef.current = null;
    }
    setToken(null);
    setUser(null);
    setAuthContext(null);
    setPermissions([]);
    setRedirectTo(null);
    setExpiresAt(null);
    setSessionExpiresAt(null);
    setIdleTimeoutMinutes(null);
    setIsIdleWarningVisible(false);
    setIsIdleRenewing(false);
    setIdleWarningError(null);
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
  const refreshAuthContext = useCallback(async () => {
    const currentToken = activeTokenRef.current;

    if (!currentToken) {
      throw new Error('Cannot refresh auth context without an access token');
    }

    try {
      const authResponse = await getCurrentUser(currentToken);

      if (activeTokenRef.current !== currentToken) {
        throw new Error('Authenticated session changed during auth context refresh');
      }

      getStorage()?.setItem('user', JSON.stringify(authResponse.user));
      getStorage()?.setItem('authContext', JSON.stringify(authResponse.context));
      getStorage()?.setItem('permissions', JSON.stringify(authResponse.permissions));
      getStorage()?.setItem('redirectTo', authResponse.redirectTo);

      setUser(authResponse.user);
      setAuthContext(authResponse.context);
      setPermissions(authResponse.permissions);
      setRedirectTo(authResponse.redirectTo);
    } catch (error: unknown) {
      if (
        error instanceof ApiError &&
        error.status === 401 &&
        activeTokenRef.current === currentToken
      ) {
        clearAuth();
      }

      throw error;
    }
  }, [clearAuth, setAuthContext, setPermissions, setRedirectTo, setUser]);

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

  const handleIdleExpiry = useCallback(
    async (lastActivityAt: number, shouldBroadcast: boolean): Promise<void> => {
      if (idleLogoutStartedRef.current) {
        return;
      }

      idleLogoutStartedRef.current = true;

      if (idleWarningTimerRef.current !== null) {
        globalThis.clearTimeout(idleWarningTimerRef.current);
        idleWarningTimerRef.current = null;
      }

      if (idleExpiryTimerRef.current !== null) {
        globalThis.clearTimeout(idleExpiryTimerRef.current);
        idleExpiryTimerRef.current = null;
      }

      setIsIdleWarningVisible(false);
      setIdleWarningError(null);

      if (shouldBroadcast) {
        const message: AuthChannelMessage = { type: 'IDLE_EXPIRED', lastActivityAt };
        authChannelRef.current?.postMessage(message);
      }

      try {
        await runWithLogoutLock(async () => {
          const storedToken = getStorage()?.getItem('token') ?? null;
          if (storedToken !== null) {
            await logout();
            return;
          }
          clearAuth();
        });
      } catch {
        clearAuth();
      } finally {
        globalThis.location.assign('/login?notice=session_expired');
      }
    },
    [clearAuth, logout],
  );

  const scheduleIdleTimers = useCallback(
    (lastActivityAt: number): void => {
      if (idleWarningTimerRef.current !== null) {
        globalThis.clearTimeout(idleWarningTimerRef.current);
        idleWarningTimerRef.current = null;
      }

      if (idleExpiryTimerRef.current !== null) {
        globalThis.clearTimeout(idleExpiryTimerRef.current);
        idleExpiryTimerRef.current = null;
      }

      if (isAuthenticated === false || idleTimeoutMinutes === null) {
        return;
      }

      const idleDurationMs = idleTimeoutMinutes * 60_000;
      const idleDeadline = lastActivityAt + idleDurationMs;
      const warningAt = idleDeadline - IDLE_WARNING_LEAD_MS;

      function expireWhenDue(): void {
        if (lastActivityAtRef.current !== lastActivityAt) {
          return;
        }
        const remainingTime = idleDeadline - Date.now();

        if (remainingTime > 0) {
          idleExpiryTimerRef.current = globalThis.setTimeout(expireWhenDue, remainingTime);
          return;
        }
        void handleIdleExpiry(lastActivityAt, true);
      }

      function showWarningWhenDue(): void {
        if (lastActivityAtRef.current !== lastActivityAt) {
          return;
        }
        const now = Date.now();

        if (now >= idleDeadline) {
          void handleIdleExpiry(lastActivityAt, true);
          return;
        }

        const remainingWarningTime = warningAt - now;

        if (remainingWarningTime > 0) {
          idleWarningTimerRef.current = globalThis.setTimeout(
            showWarningWhenDue,
            remainingWarningTime,
          );
          return;
        }

        setIsIdleWarningVisible(true);
        setIdleWarningError(null);

        const message: AuthChannelMessage = { type: 'IDLE_WARNING', lastActivityAt };

        authChannelRef.current?.postMessage(message);
      }

      const remainingIdleTime = idleDeadline - Date.now();

      if (remainingIdleTime <= 0) {
        void handleIdleExpiry(lastActivityAt, true);
        return;
      }

      const remainingWarningTime = warningAt - Date.now();

      if (remainingWarningTime <= 0) {
        showWarningWhenDue();
      } else {
        idleWarningTimerRef.current = globalThis.setTimeout(
          showWarningWhenDue,
          remainingWarningTime,
        );
      }

      idleExpiryTimerRef.current = globalThis.setTimeout(expireWhenDue, remainingIdleTime);
    },
    [handleIdleExpiry, idleTimeoutMinutes, isAuthenticated],
  );

  const resetIdlePeriod = useCallback(
    (observedAt: number, shouldBroadcast: boolean): void => {
      lastActivityAtRef.current = observedAt;
      idleLogoutStartedRef.current = false;

      setIsIdleWarningVisible(false);
      setIdleWarningError(null);
      scheduleIdleTimers(observedAt);

      if (shouldBroadcast) {
        const message: AuthChannelMessage = { type: 'ACTIVITY', observedAt };
        authChannelRef.current?.postMessage(message);
      }
    },
    [scheduleIdleTimers],
  );

  const login = useCallback(
    (authResponse: AuthLoginResponseDto) => {
      applyAuthResponse(authResponse);

      const message: AuthChannelMessage = { type: 'AUTH_UPDATED', authResponse };
      authChannelRef.current?.postMessage(message);
      resetIdlePeriod(Date.now(), true);
    },
    [applyAuthResponse, resetIdlePeriod],
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
        return;
      }
      if (message.type === 'SIGNED_OUT') {
        clearAuth();
        return;
      }
      if (message.type === 'ACTIVITY') {
        if (lastActivityAtRef.current === null || message.observedAt > lastActivityAtRef.current) {
          resetIdlePeriod(message.observedAt, false);
        }
        return;
      }
      if (message.type === 'IDLE_WARNING') {
        if (
          lastActivityAtRef.current !== null &&
          message.lastActivityAt < lastActivityAtRef.current
        ) {
          return;
        }
        resetIdlePeriod(message.lastActivityAt, false);
        setIsIdleWarningVisible(true);
        return;
      }
      if (
        lastActivityAtRef.current !== null &&
        message.lastActivityAt < lastActivityAtRef.current
      ) {
        return;
      }

      lastActivityAtRef.current = message.lastActivityAt;

      void handleIdleExpiry(message.lastActivityAt, false);
    };

    return () => {
      authChannel.close();
      if (authChannelRef.current === authChannel) {
        authChannelRef.current = null;
      }
    };
  }, [applyAuthResponse, clearAuth, handleIdleExpiry, resetIdlePeriod]);

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
    if (isAuthLoading) {
      return;
    }

    if (isAuthenticated === false || lastActivityAtRef.current !== null) {
      return;
    }

    resetIdlePeriod(Date.now(), true);
  }, [isAuthLoading, isAuthenticated, resetIdlePeriod]);

  useEffect(() => {
    const lastActivityAt = lastActivityAtRef.current;
    if (lastActivityAt === null) {
      return;
    }
    scheduleIdleTimers(lastActivityAt);
    return () => {
      if (idleWarningTimerRef.current !== null) {
        globalThis.clearTimeout(idleWarningTimerRef.current);
        idleWarningTimerRef.current = null;
      }
      if (idleExpiryTimerRef.current !== null) {
        globalThis.clearTimeout(idleExpiryTimerRef.current);
        idleExpiryTimerRef.current = null;
      }
    };
  }, [scheduleIdleTimers]);

  useEffect(() => {
    if (isAuthenticated === false || isAuthLoading) {
      return;
    }

    function handleMeaningfulActivity(): void {
      if (isIdleWarningVisible) {
        return;
      }

      resetIdlePeriod(Date.now(), true);
    }

    const activityEvents = [
      'pointerdown',
      'keydown',
      'touchstart',
      'popstate',
      'hashchange',
    ] as const;

    for (const eventName of activityEvents) {
      globalThis.addEventListener(eventName, handleMeaningfulActivity);
    }
    return () => {
      for (const eventName of activityEvents) {
        globalThis.removeEventListener(eventName, handleMeaningfulActivity);
      }
    };
  }, [isAuthenticated, isIdleWarningVisible, resetIdlePeriod, isAuthLoading]);

  useEffect(() => {
    if (isAuthenticated === false) {
      return;
    }
    function reconcileIdleTimeout(): void {
      if (document.visibilityState !== 'visible') {
        return;
      }
      const lastActivityAt = lastActivityAtRef.current;
      if (lastActivityAt !== null) {
        scheduleIdleTimers(lastActivityAt);
      }
    }
    document.addEventListener('visibilitychange', reconcileIdleTimeout);
    return () => {
      document.removeEventListener('visibilitychange', reconcileIdleTimeout);
    };
  }, [isAuthenticated, scheduleIdleTimers]);

  const handleStaySignedIn = useCallback(async (): Promise<void> => {
    setIsIdleRenewing(true);
    setIdleWarningError(null);

    try {
      await renewSession({ forceServerConfirmation: true });

      resetIdlePeriod(Date.now(), true);
    } catch (error) {
      if (isAuthoratitiveAuthFailure(error)) {
        globalThis.location.assign('/login?notice=session_expired');
        return;
      }
      setIsIdleWarningVisible(true);
      setIdleWarningError('We could not confirm your session. Please try again or log out.');
    } finally {
      setIsIdleRenewing(false);
    }
  }, [renewSession, resetIdlePeriod]);

  const handleIdleSignOut = useCallback((): void => {
    void logout().catch(() => undefined);
  }, [logout]);

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
      refreshAuthContext,
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
      refreshAuthContext,
      clearAuth,
      logout,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {isIdleWarningVisible && (
        <BasicConfirmationModal
          title="Session Expiring"
          message="You have been inactive for a while. Do you want to stay signed in? If not, you can sign out now."
          confirmButtonText="Stay Signed In"
          cancelButtonText="Sign Out"
          confirmButtonVariant="default"
          onConfirm={() => {
            void handleStaySignedIn();
          }}
          onCancel={handleIdleSignOut}
          isConfirming={isIdleRenewing}
          isConfirmDisabled={isIdleRenewing}
          isDismissDisabled={isIdleRenewing}
          errorMessage={idleWarningError}
        />
      )}
    </AuthContext.Provider>
  );
}

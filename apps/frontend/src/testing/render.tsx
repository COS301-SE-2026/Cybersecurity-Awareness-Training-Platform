import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { AuthContext, type AuthContextType } from '../context/auth-context';

type RenderWithRouterOptions = {
  initialEntry?: string;
  routePath?: string;
  auth?: Partial<AuthContextType>;
};

export function createAuthContextValue(overrides: Partial<AuthContextType> = {}): AuthContextType {
  const isAuthenticated = overrides.isAuthenticated ?? true;

  return {
    isAuthenticated,
    isAuthLoading: overrides.isAuthLoading ?? false,
    token: isAuthenticated ? 'test-token' : null,
    user: isAuthenticated
      ? {
          id: 'test-user-id',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          userType: 'GENERAL_TRAINEE',
          authStatus: 'ACTIVE',
          traineeProfile: null,
          adminProfile: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        }
      : null,
    authContext: isAuthenticated
      ? {
          user: {
            id: 'test-user-id',
            userType: 'GENERAL_TRAINEE',
            authStatus: 'ACTIVE',
          },
          role: 'GENERAL_TRAINEE',
          organisation: null,
          platformAdminRole: null,
          permissions: ['GENERAL_TRAINEE'],
          redirectTo: '/campaigns',
        }
      : null,
    permissions: isAuthenticated ? ['GENERAL_TRAINEE'] : [],
    redirectTo: isAuthenticated ? '/campaigns' : null,
    expiresAt: isAuthenticated ? '2026-01-01T01:00:00.000Z' : null,
    sessionExpiresAt: isAuthenticated ? '2026-01-08T00:00:00.000Z' : null,
    idleTimeoutMinutes: isAuthenticated ? 30 : null,
    login: vi.fn(),
    clearAuth: vi.fn(),
    logout: vi.fn(async () => {}),
    ...overrides,
  };
}

export function renderWithRouter(
  ui: ReactElement,
  { initialEntry = '/', routePath, auth }: RenderWithRouterOptions = {},
) {
  const routedUi = routePath ? (
    <Routes>
      <Route path={routePath} element={ui} />
    </Routes>
  ) : (
    ui
  );

  const wrappedUi =
    auth === undefined ? (
      routedUi
    ) : (
      <AuthContext.Provider value={createAuthContextValue(auth)}>{routedUi}</AuthContext.Provider>
    );

  return render(<MemoryRouter initialEntries={[initialEntry]}>{wrappedUi}</MemoryRouter>);
}

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

export function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

import { getPortalTemplatePresentation } from '@insightful-phish/shared';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoutedApp } from './App';

const storageValues = new Map<string, string>();
const localStorageMock = {
  get length() {
    return storageValues.size;
  },
  clear: vi.fn(() => storageValues.clear()),
  getItem: vi.fn((key: string) => storageValues.get(key) ?? null),
  key: vi.fn((index: number) => Array.from(storageValues.keys())[index] ?? null),
  removeItem: vi.fn((key: string) => storageValues.delete(key)),
  setItem: vi.fn((key: string, value: string) => storageValues.set(key, value)),
} satisfies Storage;

function renderPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RoutedApp />
    </MemoryRouter>,
  );
}

describe('host-aware frontend routes', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('VITE_FRONTEND_ORIGIN', 'https://insightfulphish.co.za');
    fetchMock.mockReset();
    storageValues.clear();
    localStorageMock.getItem.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.setItem('token', 'stored-login-token');
  });

  afterEach(() => {
    storageValues.clear();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('renders the ordinary application at the exact configured origin', async () => {
    vi.stubEnv('VITE_FRONTEND_ORIGIN', window.location.origin);
    localStorageMock.removeItem('token');

    renderPath('/login');

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('renders the public portal on another origin without authenticated bootstrap', async () => {
    fetchMock.mockImplementation((_path, options) =>
      Promise.resolve(
        Response.json(
          options?.method === 'GET'
            ? {
                state: 'ACTIVE',
                portal: getPortalTemplatePresentation('GENERIC_ACCOUNT_LOGIN_V1'),
              }
            : { accepted: true, reveal: null },
        ),
      ),
    );

    renderPath('/p/opaque-token');

    expect(
      await screen.findByRole('heading', { name: 'Sign in to your account' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(
      fetchMock.mock.calls.every(([path]) =>
        String(path).startsWith('/api/public/phishing-portals/'),
      ),
    ).toBe(true);
    expect(localStorageMock.getItem).not.toHaveBeenCalled();
  });

  it.each([
    '/login',
    '/register',
    '/campaigns',
    '/account-management',
    '/organisation-information',
    '/organisations/example/campaigns',
    '/platform-administrators',
    '/platform/campaigns',
    '/trainee/campaign-items/example/simulated-inbox',
    '/training/example',
    '/phishing-simulations/feedback/example',
    '/brand',
    '/status',
    '/unknown-path',
  ])('shows a safe portal-only fallback for %s on another origin', (path) => {
    renderPath(path);

    expect(screen.getByRole('heading', { name: 'Portal unavailable' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorageMock.getItem).not.toHaveBeenCalled();
  });

  it('fails closed when no production ordinary origin is configured', () => {
    vi.stubEnv('VITE_FRONTEND_ORIGIN', '');
    vi.stubEnv('DEV', false);

    renderPath('/login');

    expect(screen.getByRole('heading', { name: 'Portal unavailable' })).toBeInTheDocument();
    expect(localStorageMock.getItem).not.toHaveBeenCalled();
  });
});

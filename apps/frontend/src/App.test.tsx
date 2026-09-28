import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getPortalTemplatePresentation } from '@insightful-phish/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App, { RoutedApp } from './App';

describe('App', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FRONTEND_ORIGIN', window.location.origin);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the current routed application', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: "DON'T TAKE THE BAIT.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
  });

  it('renders a public portal without reading stored authentication', async () => {
    const storageRead = vi.spyOn(Storage.prototype, 'getItem');
    const fetchMock = vi.fn().mockImplementation((_path, options: RequestInit) =>
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
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/p/opaque-token']}>
        <RoutedApp />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Sign in to your account' }),
    ).toBeInTheDocument();
    expect(storageRead).not.toHaveBeenCalled();
    storageRead.mockRestore();
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePhishingPortal } from '../../features/phishing-portals/phishingPortalClient';
import { createDeferred } from '../../testing/render';
import PhishingPortalPage from '../PhishingPortalPage';

vi.mock('../../features/phishing-portals/phishingPortalClient', () => ({
  resolvePhishingPortal: vi.fn(),
}));

const mockedResolvePhishingPortal = vi.mocked(resolvePhishingPortal);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/p/opaque-token']}>
      <Routes>
        <Route path="/p/:token" element={<PhishingPortalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PhishingPortalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading before rendering an active fixed portal', async () => {
    const request = createDeferred<Awaited<ReturnType<typeof resolvePhishingPortal>>>();
    mockedResolvePhishingPortal.mockReturnValue(request.promise);
    renderPage();

    expect(screen.getByRole('heading', { name: 'Loading portal' })).toBeInTheDocument();

    request.resolve({
      state: 'ACTIVE',
      portal: {
        templateId: 'GENERIC_ACCOUNT_LOGIN_V1',
        heading: 'Sign in to your account',
        identifierLabel: 'Email address or username',
        credentialLabel: 'Password',
        submitLabel: 'Sign in',
      },
    });

    expect(
      await screen.findByRole('heading', { name: 'Sign in to your account' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email address or username')).toBeInTheDocument();
    expect(mockedResolvePhishingPortal).toHaveBeenCalledWith('opaque-token');
  });

  it.each([
    ['INACTIVE', 'This simulation link is no longer active'],
    ['UNAVAILABLE', 'Portal unavailable'],
  ] as const)('shows the %s state without an active form', async (state, heading) => {
    mockedResolvePhishingPortal.mockResolvedValue({ state });
    renderPage();

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the generic unavailable state when resolution fails', async () => {
    mockedResolvePhishingPortal.mockRejectedValue(new Error('request failed'));
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Portal unavailable' })).toBeInTheDocument();
    expect(screen.queryByText(/opaque-token/i)).not.toBeInTheDocument();
  });
});

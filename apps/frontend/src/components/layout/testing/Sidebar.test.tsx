import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserTypeDto } from '@insightful-phish/shared';

import Sidebar from '../Sidebar';
import type { AuthContextType } from '../../../context/auth-context';
import { useAuth } from '../../../context/useAuth';

vi.mock('../../../context/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';

function createAuthValue(
  role: UserTypeDto,
  permissions: string[] = [],
  organisationId: string | null = null,
): AuthContextType {
  return {
    isAuthenticated: true,
    isAuthLoading: false,
    token: 'test-token',
    user: null,
    authContext: {
      user: {
        id: 'user-id',
        userType: role,
        authStatus: 'ACTIVE',
      },
      role,
      organisation: organisationId
        ? {
            id: organisationId,
            name: 'Test Organisation',
            status: 'ACTIVE',
          }
        : null,
      platformAdminRole: role === 'IP_ADMIN' ? 'NORMAL_ADMIN' : null,
      permissions,
      redirectTo: '/',
    },
    permissions,
    redirectTo: '/',
    expiresAt: null,
    sessionExpiresAt: null,
    login: vi.fn(),
    refreshAuthContext: vi.fn().mockResolvedValue(undefined),
    clearAuth: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
  };
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current path">{location.pathname}</output>;
}

function renderSidebar(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Sidebar />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('Sidebar Campaign navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Platform Campaigns and navigates to the Platform list', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue(createAuthValue('IP_ADMIN'));

    renderSidebar('/platform-administrators');

    await user.click(screen.getByRole('button', { name: 'Campaigns' }));

    expect(screen.getByLabelText('Current path')).toHaveTextContent('/platform/campaigns');
  });

  it('uses the authenticated organisation ID for authorized Organisation Campaigns', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue(
      createAuthValue('ORGANISATION_ADMIN', ['VIEW_CAMPAIGNS'], ORGANISATION_ID),
    );

    renderSidebar('/organisation-information');

    await user.click(screen.getByRole('button', { name: 'Campaigns' }));

    expect(screen.getByLabelText('Current path')).toHaveTextContent(
      `/organisations/${ORGANISATION_ID}/campaigns`,
    );
  });

  it('hides Organisation Campaign without Campaign permissions', () => {
    mockedUseAuth.mockReturnValue(
      createAuthValue('ORGANISATION_ADMIN', ['VIEW_ORGANISATION_TRAINEES'], ORGANISATION_ID),
    );

    renderSidebar('/organisation-information');

    expect(screen.queryByRole('button', { name: 'Campaigns' })).not.toBeInTheDocument();
  });
});

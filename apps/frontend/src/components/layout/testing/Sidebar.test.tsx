import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlatformAdminRoleDto, UserTypeDto } from '@insightful-phish/shared';

import Sidebar from '../Sidebar';
import type { AuthContextType } from '../../../context/auth-context';
import { useAuth } from '../../../context/useAuth';

vi.mock('../../../context/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';
const HELP_HREF =
  'https://github.com/COS301-SE-2026/Cybersecurity-Awareness-Training-Platform/wiki/Demo-2-User-Manual';

function createAuthValue(
  role: UserTypeDto,
  permissions: string[] = [],
  organisationId: string | null = null,
  platformAdminRole: PlatformAdminRoleDto = 'NORMAL_ADMIN',
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
      platformAdminRole: role === 'IP_ADMIN' ? platformAdminRole : null,
      permissions,
      redirectTo: '/',
    },
    permissions,
    redirectTo: '/',
    expiresAt: null,
    sessionExpiresAt: null,
    idleTimeoutMinutes: null,
    login: vi.fn(),
    renewSession: vi.fn().mockResolvedValue(undefined),
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

  it.each(['NORMAL_ADMIN', 'SUPER_ADMIN'] as const)(
    'shows Platform Campaigns for %s and navigates to the Platform list',
    async (platformAdminRole) => {
      const user = userEvent.setup();
      mockedUseAuth.mockReturnValue(createAuthValue('IP_ADMIN', [], null, platformAdminRole));

      renderSidebar('/platform-administrators');

      await user.click(screen.getByRole('button', { name: 'Campaigns' }));

      expect(screen.getByLabelText('Current path')).toHaveTextContent('/platform/campaigns');
    },
  );

  it.each(['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS'])(
    'uses the authenticated organisation ID for authorized Organisation Campaigns with %s',
    async (permission) => {
      const user = userEvent.setup();
      mockedUseAuth.mockReturnValue(
        createAuthValue('ORGANISATION_ADMIN', [permission], ORGANISATION_ID),
      );

      renderSidebar('/organisation-information');

      await user.click(screen.getByRole('button', { name: 'Campaigns' }));

      expect(screen.getByLabelText('Current path')).toHaveTextContent(
        `/organisations/${ORGANISATION_ID}/campaigns`,
      );
    },
  );

  it('hides Organisation Campaign without Campaign permissions', () => {
    mockedUseAuth.mockReturnValue(
      createAuthValue('ORGANISATION_ADMIN', ['VIEW_ORGANISATION_TRAINEES'], ORGANISATION_ID),
    );

    renderSidebar('/organisation-information');

    expect(screen.queryByRole('button', { name: 'Campaigns' })).not.toBeInTheDocument();
  });

  it('hides Organisation Campaign without an authenticated organisation ID', () => {
    mockedUseAuth.mockReturnValue(createAuthValue('ORGANISATION_ADMIN', ['VIEW_CAMPAIGNS'], null));

    renderSidebar('/organisation-information');

    expect(screen.queryByRole('button', { name: 'Campaigns' })).not.toBeInTheDocument();
  });
});

describe('Sidebar Help navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['ORGANISATION_ADMIN', 'IP_ADMIN'] as const)(
    'shows the safe external Help link for %s',
    (role) => {
      mockedUseAuth.mockReturnValue(
        createAuthValue(role, [], role === 'ORGANISATION_ADMIN' ? ORGANISATION_ID : null),
      );

      renderSidebar(role === 'IP_ADMIN' ? '/platform-administrators' : '/organisation-information');

      const helpLink = screen.getByRole('link', { name: 'Help' });

      expect(helpLink).toHaveAttribute('href', HELP_HREF);
      expect(helpLink).toHaveAttribute('target', '_blank');
      expect(helpLink).toHaveAttribute('rel', 'noopener noreferrer');
    },
  );

  it.each(['ORGANISATION_TRAINEE', 'GENERAL_TRAINEE'] as const)(
    'preserves Campaigns and external Help navigation for %s',
    (role) => {
      mockedUseAuth.mockReturnValue(createAuthValue(role));

      renderSidebar('/campaigns');

      expect(screen.getByRole('button', { name: 'Campaigns' })).toBeInTheDocument();

      const helpLink = screen.getByRole('link', { name: 'Help' });

      expect(helpLink).toHaveAttribute('href', HELP_HREF);
      expect(helpLink).toHaveAttribute('target', '_blank');
      expect(helpLink).toHaveAttribute('rel', 'noopener noreferrer');
    },
  );
});

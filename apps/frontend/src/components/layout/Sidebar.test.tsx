import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OrganisationPermissionKeyDto, UserTypeDto } from '@insightful-phish/shared';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthContext } from '../../context/auth-context';
import { createAuthContextValue } from '../../testing/render';
import Sidebar from './Sidebar';

const organisationId = '0f8bc491-939f-42f7-8fec-ed7f5dd3abbb';

function LocationDisplay() {
  const location = useLocation();

  return <div data-testid="location-path">{location.pathname}</div>;
}

function renderSidebar(
  role: UserTypeDto,
  permissions: OrganisationPermissionKeyDto[],
  includeOrganisation = true,
) {
  const authContext = {
    user: {
      id: 'sidebar-user-id',
      userType: role,
      authStatus: 'ACTIVE' as const,
    },
    role,
    organisation:
      includeOrganisation === true
        ? {
            id: organisationId,
            name: 'Sidebar Test Organisation',
            status: 'ACTIVE' as const,
          }
        : null,
    platformAdminRole: null,
    permissions,
    redirectTo: role === 'ORGANISATION_ADMIN' ? '/organisation-information' : '/campaigns',
  };

  return render(
    <AuthContext.Provider value={createAuthContextValue({ authContext, permissions })}>
      <MemoryRouter initialEntries={['/organisation-information']}>
        <Sidebar />
        <LocationDisplay />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('Sidebar campaign assignment navigation', () => {
  it('shows the assignment item to an authorised organisation administrator and navigates to the organisation route', async () => {
    const user = userEvent.setup();
    renderSidebar('ORGANISATION_ADMIN', ['ASSIGN_CAMPAIGNS']);

    await user.click(screen.getByRole('button', { name: 'Assign Training Campaigns' }));

    expect(screen.getByTestId('location-path')).toHaveTextContent(
      `/organisations/${organisationId}/campaign-assignments/new`,
    );
  });

  it('hides the assignment item when the organisation administrator lacks permission', () => {
    renderSidebar('ORGANISATION_ADMIN', []);

    expect(
      screen.queryByRole('button', { name: 'Assign Training Campaigns' }),
    ).not.toBeInTheDocument();
  });

  it('hides the assignment item from non-administrator roles even if the permission is present', () => {
    renderSidebar('ORGANISATION_TRAINEE', ['ASSIGN_CAMPAIGNS']);

    expect(
      screen.queryByRole('button', { name: 'Assign Training Campaigns' }),
    ).not.toBeInTheDocument();
  });

  it('hides the assignment item when there is no organisation context', () => {
    renderSidebar('ORGANISATION_ADMIN', ['ASSIGN_CAMPAIGNS'], false);

    expect(
      screen.queryByRole('button', { name: 'Assign Training Campaigns' }),
    ).not.toBeInTheDocument();
  });
});

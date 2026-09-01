import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import OrganisationAdminInformationPage from '../../components/organisation-information/OrganisationAdminInformationPage';

describe('OrganisationAdminInformationPage', () => {
  it('renders the page heading', () => {
    render(<OrganisationAdminInformationPage />);
    expect(
      screen.getByRole('heading', { name: /Organisation Administrators/i }),
    ).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<OrganisationAdminInformationPage />);
    expect(
      screen.getByText(
        /View the organisation's current administrators and their account status\./i,
      ),
    ).toBeInTheDocument();
  });

  it('renders the administrator table headings', () => {
    render(<OrganisationAdminInformationPage />);
    expect(screen.getByRole('columnheader', { name: /Full Name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Email Address/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Administrator Status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Actions/i })).toBeInTheDocument();
  });

  it('renders action buttons for each administrator', () => {
    render(<OrganisationAdminInformationPage />);
    expect(screen.getAllByRole('button', { name: /Remove/i })).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /Edit/i })).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /Re-Send Invite/i })).not.toHaveLength(0);
  });

  it('keeps long administrator values available when cells are constrained', () => {
    const longName = 'An Organisation Administrator With An Exceptionally Long Display Name';
    const longEmail = 'an.exceptionally.long.organisation.administrator@example.com';

    render(
      <OrganisationAdminInformationPage
        admins={[
          {
            id: 'long-admin',
            firstName: longName,
            lastName: '',
            email: longEmail,
            adminStatus: 'ACTIVE',
            isInitialAdmin: false,
          },
        ]}
      />,
    );

    expect(screen.getByTitle(longName)).toHaveAttribute('aria-label', longName);
    expect(screen.getByTitle(longEmail)).toHaveAttribute('aria-label', longEmail);
  });

  it('renders the shared empty state when no administrators are available', () => {
    render(<OrganisationAdminInformationPage admins={[]} />);

    expect(screen.getByText('No Organisation Administrators Found')).toBeInTheDocument();
  });
});

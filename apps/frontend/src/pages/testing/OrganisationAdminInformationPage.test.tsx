import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import OrganisationAdminInformationPage from '../../components/organisation-information/OrganisationAdminInformationPage';

const mockAdmins = [
  {
    id: 'admin-1',
    firstName: 'Jan',
    lastName: 'van der Merwe',
    email: 'jan@cyberjan.co.za',
    adminStatus: 'ACTIVE' as const,
    isInitialAdmin: true,
  },
  {
    id: 'admin-2',
    firstName: 'Sipho',
    lastName: 'Ndlovu',
    email: 'sipho@cyberjan.co.za',
    adminStatus: 'DISABLED' as const,
    isInitialAdmin: false,
  },
];

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

  it('renders the administrator information without management actions', () => {
    render(<OrganisationAdminInformationPage admins={mockAdmins} />);

    expect(screen.getByRole('columnheader', { name: /Full Name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Email Address/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Administrator Status/i })).toBeInTheDocument();

    expect(screen.getByText(/Jan van der Merwe/i)).toBeInTheDocument();
    expect(screen.getByText(/Sipho Ndlovu/i)).toBeInTheDocument();
    expect(screen.getByText('jan@cyberjan.co.za')).toBeInTheDocument();
    expect(screen.getByText('sipho@cyberjan.co.za')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Pending/Disabled')).toBeInTheDocument();

    expect(screen.queryByRole('columnheader', { name: /Actions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Re-Send Invite/i })).not.toBeInTheDocument();
  });

  it('renders the shared empty state when no administrators are available', () => {
    render(<OrganisationAdminInformationPage admins={[]} />);
    expect(screen.getByText('No Organisation Administrators Found')).toBeInTheDocument();
  });
});

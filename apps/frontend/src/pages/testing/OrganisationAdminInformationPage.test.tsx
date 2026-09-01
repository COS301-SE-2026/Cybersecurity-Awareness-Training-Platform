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

  it('renders the empty state message when no administrators exist and no fixture rows', () => {
    render(<OrganisationAdminInformationPage admins={[]} />);
    expect(screen.getByText(/No organisation administrators\./i)).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Full Name/i })).not.toBeInTheDocument();
  });

  it('renders the administrator table headings when administrators are provided', () => {
    render(<OrganisationAdminInformationPage admins={mockAdmins} />);
    expect(screen.getByRole('columnheader', { name: /Full Name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Email Address/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Administrator Status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Actions/i })).toBeInTheDocument();
  });

  it('renders action buttons and rows for each administrator', () => {
    render(<OrganisationAdminInformationPage admins={mockAdmins} />);
    expect(screen.getAllByRole('button', { name: /Remove/i })).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /Edit/i })).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /Re-Send Invite/i })).not.toHaveLength(0);
    expect(screen.getByText(/Jan van der Merwe/i)).toBeInTheDocument();
    expect(screen.getByText(/Sipho Ndlovu/i)).toBeInTheDocument();
  });
});
